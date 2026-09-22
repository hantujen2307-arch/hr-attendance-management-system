import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOvertimeRequestDto } from './dto/create-overtime-request.dto';
import { UpdateOvertimeRequestDto } from './dto/update-overtime-request.dto';
import { QueryOvertimeDto } from './dto/query-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import {
  calculateOvertimeMinutes,
  hasOvertimeOverlap,
} from './overtime.time.util';
import {
  parseJakartaDateString,
  getJakartaDateInfo,
} from '../attendance/attendance.time.util';
import {
  EmploymentStatus,
  LeaveRequestStatus,
  OvertimeStatus,
  Prisma,
  UserRole,
} from '@prisma/client';

@Injectable()
export class OvertimeService {
  private readonly logger = new Logger(OvertimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to resolve employee profile from user context.
   */
  private async resolveEmployeeId(user: any, requestedEmployeeId?: string): Promise<string> {
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        // Fallback: look up employee by userId in DB
        const emp = await this.prisma.employee.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!emp) {
          throw new ForbiddenException('Akun pengguna tidak memiliki data profil karyawan yang valid');
        }
        return emp.id;
      }
      return user.employee.id;
    }

    // ADMIN or HR can act on behalf of an employee or themselves
    if (requestedEmployeeId) {
      return requestedEmployeeId;
    }

    if (user.employee?.id) {
      return user.employee.id;
    }

    throw new BadRequestException('ID karyawan wajib disertakan');
  }

  /**
   * Submit a new overtime request.
   */
  async create(dto: CreateOvertimeRequestDto, user: any, ipAddress?: string) {
    const employeeId = await this.resolveEmployeeId(user, dto.employeeId);

    // 1. Verify employee exists and is active
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true, department: true },
    });

    if (!employee) {
      throw new NotFoundException(`Karyawan dengan ID '${employeeId}' tidak ditemukan`);
    }

    if (employee.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new BadRequestException('Pengajuan lembur hanya dapat diajukan untuk karyawan dengan status AKTIF');
    }

    // 2. Validate and calculate duration
    const dateObj = parseJakartaDateString(dto.date);
    const requestedMinutes = calculateOvertimeMinutes(dto.plannedStartTime, dto.plannedEndTime);

    if (requestedMinutes <= 0) {
      throw new BadRequestException('Durasi lembur harus lebih dari 0 menit');
    }

    // 3. Check Leave conflict (Requirement #17)
    const conflictingLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: dateObj },
        endDate: { gte: dateObj },
      },
      include: { leaveType: true },
    });

    if (conflictingLeave) {
      throw new BadRequestException(
        `Karyawan tercatat sedang dalam masa ${conflictingLeave.leaveType?.name || 'Cuti/Izin'} pada tanggal ${dto.date}`,
      );
    }

    // 4. Check duplicate/overlapping active overtime requests (Requirement #18)
    const existingOvertimes = await this.prisma.overtimeRequest.findMany({
      where: {
        employeeId,
        date: dateObj,
        status: { notIn: [OvertimeStatus.REJECTED, OvertimeStatus.CANCELLED] },
      },
    });

    for (const ex of existingOvertimes) {
      if (hasOvertimeOverlap(dto.plannedStartTime, dto.plannedEndTime, ex.plannedStartTime, ex.plannedEndTime)) {
        throw new ConflictException(
          `Terdapat pengajuan lembur yang tumpang tindih (${ex.plannedStartTime} - ${ex.plannedEndTime}) pada tanggal ${dto.date}`,
        );
      }
    }

    // 5. Resolve active shift / schedule (Requirement #11, #16)
    let scheduleId = dto.scheduleId || null;
    if (!scheduleId) {
      const activeSchedule = await this.prisma.employeeSchedule.findFirst({
        where: {
          employeeId,
          status: 'ACTIVE',
          startDate: { lte: dateObj },
          endDate: { gte: dateObj },
        },
      });
      if (activeSchedule) {
        scheduleId = activeSchedule.id;
      }
    }

    // 6. Check attendance linkage if already attended today (Requirement #12)
    let attendanceId = dto.attendanceId || null;
    let actualStartTime: string | null = null;
    let actualEndTime: string | null = null;
    let actualMinutes: number | null = null;

    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        uq_employee_attendance_date: {
          employeeId,
          attendanceDate: dateObj,
        },
      },
    });

    if (existingAttendance) {
      attendanceId = existingAttendance.id;
      if (existingAttendance.checkIn && existingAttendance.checkOut) {
        const inInfo = getJakartaDateInfo(existingAttendance.checkIn);
        const outInfo = getJakartaDateInfo(existingAttendance.checkOut);
        actualStartTime = `${String(inInfo.hour).padStart(2, '0')}:${String(inInfo.minute).padStart(2, '0')}`;
        actualEndTime = `${String(outInfo.hour).padStart(2, '0')}:${String(outInfo.minute).padStart(2, '0')}`;
        actualMinutes = calculateOvertimeMinutes(actualStartTime, actualEndTime);
      }
    }

    // 7. Create Overtime Request
    const overtime = await this.prisma.overtimeRequest.create({
      data: {
        employeeId,
        date: dateObj,
        plannedStartTime: dto.plannedStartTime,
        plannedEndTime: dto.plannedEndTime,
        actualStartTime,
        actualEndTime,
        requestedMinutes,
        actualMinutes,
        status: OvertimeStatus.PENDING,
        reason: dto.reason,
        notes: dto.notes,
        scheduleId,
        attendanceId,
      },
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
      },
    });

    // 8. Send Notification to HR & Admin (Requirement #20)
    try {
      const adminAndHrUsers = await this.prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.HR] } },
        select: { id: true },
      });
      const recipientIds = adminAndHrUsers.map((u) => u.id);

      await this.notificationsService.createBulk(recipientIds, {
        type: 'OVERTIME_REQUEST',
        title: 'Pengajuan Lembur Baru',
        message: `${employee.firstName} ${employee.lastName} mengajukan lembur pada ${dto.date} (${dto.plannedStartTime} - ${dto.plannedEndTime})`,
        referenceType: 'OVERTIME',
        referenceId: overtime.id,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch overtime notification: ${err.message}`);
    }

    // 9. Audit Logging (Requirement #21)
    await this.auditService.log({
      userId: user.id,
      action: 'OVERTIME_CREATED',
      details: `Pengajuan lembur dibuat untuk ${employee.firstName} ${employee.lastName} (${dto.date}, ${dto.plannedStartTime}-${dto.plannedEndTime}, ${requestedMinutes} menit)`,
      metadata: { overtimeId: overtime.id, employeeId, date: dto.date, requestedMinutes },
      ipAddress,
    });

    return overtime;
  }

  /**
   * Retrieve overtime requests list with filters and role authorization.
   */
  async findAll(query: QueryOvertimeDto, user: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OvertimeRequestWhereInput = {};

    // IDOR Protection: EMPLOYEE can only view their own overtime records
    if (user.role === UserRole.EMPLOYEE) {
      const empId = await this.resolveEmployeeId(user);
      where.employeeId = empId;
    } else {
      if (query.employeeId) {
        where.employeeId = query.employeeId;
      }
      if (query.departmentId) {
        where.employee = { departmentId: query.departmentId };
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.date) {
      where.date = parseJakartaDateString(query.date);
    } else if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = parseJakartaDateString(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = parseJakartaDateString(query.endDate);
      }
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.overtimeRequest.count({ where }),
      this.prisma.overtimeRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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
          approver: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          schedule: {
            include: { shift: true },
          },
          attendance: {
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              status: true,
              workingMinutes: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single overtime request details with full relations and IDOR check.
   */
  async findOne(id: string, user: any) {
    const overtime = await this.prisma.overtimeRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            user: { select: { id: true, email: true, role: true } },
          },
        },
        approver: {
          select: { id: true, email: true, role: true },
        },
        schedule: {
          include: { shift: true },
        },
        attendance: true,
      },
    });

    if (!overtime) {
      throw new NotFoundException(`Pengajuan lembur dengan ID '${id}' tidak ditemukan`);
    }

    // IDOR Protection: Employee can only view their own
    if (user.role === UserRole.EMPLOYEE) {
      const empId = await this.resolveEmployeeId(user);
      if (overtime.employeeId !== empId) {
        throw new ForbiddenException('Anda tidak memiliki izin untuk melihat pengajuan lembur karyawan lain');
      }
    }

    return overtime;
  }

  /**
   * Update pending overtime request.
   */
  async update(id: string, dto: UpdateOvertimeRequestDto, user: any, ipAddress?: string) {
    const overtime = await this.findOne(id, user);

    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Hanya pengajuan lembur dengan status PENDING yang dapat diubah');
    }

    const dateStr = dto.date || overtime.date.toISOString().split('T')[0];
    const plannedStart = dto.plannedStartTime || overtime.plannedStartTime;
    const plannedEnd = dto.plannedEndTime || overtime.plannedEndTime;

    const dateObj = parseJakartaDateString(dateStr);
    const requestedMinutes = calculateOvertimeMinutes(plannedStart, plannedEnd);

    if (requestedMinutes <= 0) {
      throw new BadRequestException('Durasi lembur harus lebih dari 0 menit');
    }

    // Re-check overlap if times changed
    if (dto.plannedStartTime || dto.plannedEndTime || dto.date) {
      const existingOvertimes = await this.prisma.overtimeRequest.findMany({
        where: {
          employeeId: overtime.employeeId,
          date: dateObj,
          id: { not: id },
          status: { notIn: [OvertimeStatus.REJECTED, OvertimeStatus.CANCELLED] },
        },
      });

      for (const ex of existingOvertimes) {
        if (hasOvertimeOverlap(plannedStart, plannedEnd, ex.plannedStartTime, ex.plannedEndTime)) {
          throw new ConflictException(
            `Terdapat pengajuan lembur yang tumpang tindih (${ex.plannedStartTime} - ${ex.plannedEndTime}) pada tanggal ${dateStr}`,
          );
        }
      }
    }

    const updated = await this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        date: dateObj,
        plannedStartTime: plannedStart,
        plannedEndTime: plannedEnd,
        requestedMinutes,
        reason: dto.reason ?? overtime.reason,
        notes: dto.notes ?? overtime.notes,
      },
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
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'OVERTIME_UPDATED',
      details: `Pengajuan lembur diperbarui (${dateStr}, ${plannedStart}-${plannedEnd}, ${requestedMinutes} menit)`,
      metadata: { overtimeId: id, requestedMinutes },
      ipAddress,
    });

    return updated;
  }

  /**
   * Cancel pending overtime request.
   */
  async cancel(id: string, user: any, ipAddress?: string) {
    const overtime = await this.findOne(id, user);

    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Hanya pengajuan lembur dengan status PENDING yang dapat dibatalkan');
    }

    const updated = await this.prisma.overtimeRequest.update({
      where: { id },
      data: { status: OvertimeStatus.CANCELLED },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'OVERTIME_CANCELLED',
      details: `Pengajuan lembur dibatalkan oleh pengguna`,
      metadata: { overtimeId: id },
      ipAddress,
    });

    return updated;
  }

  /**
   * Approve overtime request (Admin / HR only).
   */
  async approve(id: string, dto: ApproveOvertimeDto, user: any, ipAddress?: string) {
    const overtime = await this.prisma.overtimeRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: { user: true },
        },
      },
    });

    if (!overtime) {
      throw new NotFoundException(`Pengajuan lembur dengan ID '${id}' tidak ditemukan`);
    }

    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException(`Pengajuan lembur sudah berstatus '${overtime.status}' dan tidak dapat disetujui lagi`);
    }

    const approvedMinutes = dto.approvedMinutes || overtime.requestedMinutes;

    const updated = await this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: OvertimeStatus.APPROVED,
        approvedMinutes,
        approvedBy: user.id,
        approvedAt: new Date(),
        notes: dto.notes ?? overtime.notes,
      },
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
        approver: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    // Notify employee
    if (overtime.employee.user?.id) {
      try {
        const dateStr = overtime.date.toISOString().split('T')[0];
        await this.notificationsService.create({
          userId: overtime.employee.user.id,
          type: 'OVERTIME_APPROVED',
          title: 'Pengajuan Lembur Disetujui',
          message: `Pengajuan lembur Anda pada tanggal ${dateStr} telah disetujui (${approvedMinutes} menit).`,
          referenceType: 'OVERTIME',
          referenceId: overtime.id,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch approval notification: ${err.message}`);
      }
    }

    await this.auditService.log({
      userId: user.id,
      action: 'OVERTIME_APPROVED',
      details: `Pengajuan lembur disetujui untuk ${overtime.employee.firstName} ${overtime.employee.lastName} (${approvedMinutes} menit disetujui)`,
      metadata: { overtimeId: id, approvedMinutes },
      ipAddress,
    });

    return updated;
  }

  /**
   * Reject overtime request (Admin / HR only).
   */
  async reject(id: string, dto: RejectOvertimeDto, user: any, ipAddress?: string) {
    const overtime = await this.prisma.overtimeRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: { user: true },
        },
      },
    });

    if (!overtime) {
      throw new NotFoundException(`Pengajuan lembur dengan ID '${id}' tidak ditemukan`);
    }

    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException(`Pengajuan lembur sudah berstatus '${overtime.status}' dan tidak dapat ditolak`);
    }

    const updated = await this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: OvertimeStatus.REJECTED,
        rejectedReason: dto.rejectedReason,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
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
        approver: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    // Notify employee
    if (overtime.employee.user?.id) {
      try {
        const dateStr = overtime.date.toISOString().split('T')[0];
        await this.notificationsService.create({
          userId: overtime.employee.user.id,
          type: 'OVERTIME_REJECTED',
          title: 'Pengajuan Lembur Ditolak',
          message: `Pengajuan lembur Anda pada tanggal ${dateStr} ditolak: ${dto.rejectedReason}`,
          referenceType: 'OVERTIME',
          referenceId: overtime.id,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch rejection notification: ${err.message}`);
      }
    }

    await this.auditService.log({
      userId: user.id,
      action: 'OVERTIME_REJECTED',
      details: `Pengajuan lembur ditolak untuk ${overtime.employee.firstName} ${overtime.employee.lastName}. Alasan: ${dto.rejectedReason}`,
      metadata: { overtimeId: id, rejectedReason: dto.rejectedReason },
      ipAddress,
    });

    return updated;
  }

  /**
   * Automatically synchronizes attendance check-out data to matching overtime requests.
   */
  async syncAttendance(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance || !attendance.checkIn || !attendance.checkOut) return;

    const inInfo = getJakartaDateInfo(attendance.checkIn);
    const outInfo = getJakartaDateInfo(attendance.checkOut);
    const actualStartTime = `${String(inInfo.hour).padStart(2, '0')}:${String(inInfo.minute).padStart(2, '0')}`;
    const actualEndTime = `${String(outInfo.hour).padStart(2, '0')}:${String(outInfo.minute).padStart(2, '0')}`;
    const actualMinutes = calculateOvertimeMinutes(actualStartTime, actualEndTime);

    await this.prisma.overtimeRequest.updateMany({
      where: {
        employeeId: attendance.employeeId,
        date: attendance.attendanceDate,
        status: { in: [OvertimeStatus.PENDING, OvertimeStatus.APPROVED] },
      },
      data: {
        attendanceId,
        actualStartTime,
        actualEndTime,
        actualMinutes,
      },
    });
  }
}
