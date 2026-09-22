import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { EmploymentStatus, LeaveRequestStatus, Prisma, UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { getJakartaDateInfo, parseJakartaDateString } from '../attendance/attendance.time.util';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(params?: {
    status?: LeaveRequestStatus;
    employeeId?: string;
    leaveTypeId?: string;
  }) {
    const { status, employeeId, leaveTypeId } = params || {};

    const where: Prisma.LeaveRequestWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: true,
        approver: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser?: any) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
        leaveType: true,
        approver: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Leave request with ID '${id}' not found`);
    }

    if (currentUser?.role === UserRole.EMPLOYEE && request.employeeId !== currentUser.employee?.id) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke pengajuan izin ini');
    }

    return request;
  }

  async create(dto: CreateLeaveRequestDto) {
    if (!dto.employeeId) {
      throw new BadRequestException('ID Karyawan wajib diisi untuk membuat pengajuan cuti');
    }
    const employeeId = dto.employeeId;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID '${employeeId}' not found`);
    }

    if (employee.employmentStatus === EmploymentStatus.INACTIVE) {
      throw new ForbiddenException('Karyawan berstatus nonaktif tidak dapat membuat pengajuan baru');
    }

    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
    });
    if (!leaveType) {
      throw new NotFoundException(`Leave type with ID '${dto.leaveTypeId}' not found`);
    }

    // Strict format and empty checks for YYYY-MM-DD
    if (!dto.startDate || typeof dto.startDate !== 'string' || !dto.startDate.trim()) {
      throw new BadRequestException('Tanggal mulai wajib diisi');
    }
    if (!dto.endDate || typeof dto.endDate !== 'string' || !dto.endDate.trim()) {
      throw new BadRequestException('Tanggal selesai wajib diisi');
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dto.startDate)) {
      throw new BadRequestException('Format tanggal mulai tidak valid. Gunakan format YYYY-MM-DD');
    }
    if (!datePattern.test(dto.endDate)) {
      throw new BadRequestException('Format tanggal selesai tidak valid. Gunakan format YYYY-MM-DD');
    }

    let startDate: Date;
    let endDate: Date;
    try {
      startDate = parseJakartaDateString(dto.startDate);
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Tanggal mulai tidak valid');
    }
    try {
      endDate = parseJakartaDateString(dto.endDate);
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Tanggal selesai tidak valid');
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Tanggal mulai atau selesai tidak valid');
    }

    // Date validation rules:
    // 1. Tanggal mulai pengajuan harus menerima: tanggal hari ini ✅ dan tanggal masa depan ✅
    // 2. Jangan menolak tanggal hari ini.
    // 3. Tetap tolak tanggal yang tidak valid: masa lalu, tanggal selesai sebelum tanggal mulai, tanggal tidak masuk akal.
    const { attendanceDate: todayJakarta, dateString: todayString } = getJakartaDateInfo();

    if (startDate.getTime() < todayJakarta.getTime()) {
      throw new BadRequestException(
        `Tanggal mulai pengajuan (${dto.startDate}) tidak boleh di masa lalu. Pengajuan diperbolehkan untuk hari ini (${todayString}) atau tanggal mendatang.`
      );
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('Tanggal selesai tidak boleh sebelum tanggal mulai');
    }

    // Sensible boundary check (max 5 years in advance)
    const maxAllowedYear = todayJakarta.getUTCFullYear() + 5;
    if (startDate.getUTCFullYear() > maxAllowedYear || endDate.getUTCFullYear() > maxAllowedYear) {
      throw new BadRequestException('Tanggal pengajuan tidak masuk akal (maksimal 5 tahun ke depan)');
    }

    // Check for overlapping active (PENDING or APPROVED) leave requests
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: employeeId,
        status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlapping) {
      throw new ConflictException('Sudah terdapat pengajuan cuti/izin aktif pada rentang tanggal tersebut');
    }

    // Auto-calculate duration in calendar days (inclusive)
    const diffTime = endDate.getTime() - startDate.getTime();
    const calculatedDuration = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    const duration = dto.duration && dto.duration > 0 ? dto.duration : calculatedDuration;

    const created = await this.prisma.leaveRequest.create({
      data: {
        employeeId: employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        duration,
        reason: dto.reason,
        status: dto.status || LeaveRequestStatus.PENDING,
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    // Notify all ADMIN and HR users of new leave submission
    try {
      const adminAndHrUsers = await this.prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.HR] } },
        select: { id: true },
      });
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      await this.notificationsService.createBulk(
        adminAndHrUsers.map((u) => u.id),
        {
          type: 'LEAVE_SUBMITTED',
          title: `Pengajuan ${created.leaveType.name} Baru`,
          message: `${created.employee.firstName} ${created.employee.lastName} (${created.employee.employeeId}) mengajukan ${created.leaveType.name} tanggal ${startDateStr} s/d ${endDateStr} (${created.duration} hari).`,
          referenceType: 'LEAVE_REQUEST',
          referenceId: created.id,
        },
      );
    } catch (e) {
      // Non-blocking notification dispatch
    }

    return created;
  }

  async update(id: string, dto: UpdateLeaveRequestDto, approverUser?: any) {
    if (approverUser?.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('Akses ditolak: Karyawan tidak memiliki izin untuk mengubah status pengajuan cuti');
    }

    const existing = await this.findOne(id);

    // Rule: APPROVED or REJECTED status cannot revert to PENDING
    if (
      (existing.status === LeaveRequestStatus.APPROVED || existing.status === LeaveRequestStatus.REJECTED) &&
      dto.status === LeaveRequestStatus.PENDING
    ) {
      throw new BadRequestException(`Cannot revert an ${existing.status} leave request back to PENDING`);
    }

    const approvedBy = dto.approvedBy || (dto.status && dto.status !== LeaveRequestStatus.PENDING && approverUser?.id ? approverUser.id : undefined);

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: dto.status,
        approvedBy: approvedBy || existing.approvedBy,
        approvedAt: dto.status && dto.status !== LeaveRequestStatus.PENDING ? new Date() : undefined,
        reason: dto.reason,
      },
      include: {
        employee: true,
        leaveType: true,
        approver: { select: { id: true, email: true, role: true } },
      },
    });

    // Notify employee on approval or rejection
    try {
      if (
        (dto.status === LeaveRequestStatus.APPROVED || dto.status === LeaveRequestStatus.REJECTED) &&
        existing.employee.userId
      ) {
        const isApproved = dto.status === LeaveRequestStatus.APPROVED;
        await this.notificationsService.create({
          userId: existing.employee.userId,
          type: isApproved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
          title: isApproved ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak',
          message: isApproved
            ? `Pengajuan ${existing.leaveType.name} Anda telah disetujui.`
            : `Pengajuan ${existing.leaveType.name} Anda ditolak.`,
          referenceType: 'LEAVE_REQUEST',
          referenceId: id,
        });
      }
    } catch (e) {
      // Non-blocking notification dispatch
    }

    return updated;
  }

  async approve(id: string, user: any) {
    if (user?.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('Akses ditolak: Karyawan tidak memiliki izin untuk menyetujui pengajuan cuti');
    }
    const existing = await this.findOne(id);
    if (existing.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(`Pengajuan cuti sudah berstatus ${existing.status} dan tidak dapat disetujui lagi`);
    }
    return this.update(id, { status: LeaveRequestStatus.APPROVED }, user);
  }

  async reject(id: string, user: any, reason?: string) {
    if (user?.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('Akses ditolak: Karyawan tidak memiliki izin untuk menolak pengajuan cuti');
    }
    const existing = await this.findOne(id);
    if (existing.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(`Pengajuan cuti sudah berstatus ${existing.status} dan tidak dapat ditolak lagi`);
    }
    return this.update(id, { status: LeaveRequestStatus.REJECTED, reason: reason || existing.reason }, user);
  }

  async cancel(id: string, user: any) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      throw new NotFoundException(`Pengajuan cuti dengan ID '${id}' tidak ditemukan`);
    }

    if (user.role === UserRole.EMPLOYEE && existing.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki izin untuk membatalkan pengajuan karyawan lain');
    }

    if (existing.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(`Hanya pengajuan cuti dengan status PENDING yang dapat dibatalkan (status saat ini: ${existing.status})`);
    }

    await this.prisma.leaveRequest.delete({
      where: { id },
    });

    return {
      message: 'Pengajuan cuti berhasil dibatalkan',
      id,
    };
  }

  async findAllLeaveTypes() {
    return this.prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
