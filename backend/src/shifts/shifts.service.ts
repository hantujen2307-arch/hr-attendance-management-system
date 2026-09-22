import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { UpdateEmployeeScheduleDto } from './dto/update-employee-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { EmploymentStatus, Prisma, ShiftStatus, UserRole } from '@prisma/client';
import { getJakartaDateInfo, parseJakartaDateString } from '../attendance/attendance.time.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * List all master shifts with active employee and schedule counts.
   */
  async findAll() {
    return this.prisma.shift.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            schedules: true,
            attendances: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Find a single master shift by ID with related employees and recent schedules.
   */
  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            position: true,
            department: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            employees: true,
            schedules: true,
            attendances: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID '${id}' not found`);
    }

    return shift;
  }

  /**
   * Create a new master shift.
   */
  async create(dto: CreateShiftDto, user?: any) {
    // 1. Check duplicate name
    const existingName = await this.prisma.shift.findUnique({
      where: { name: dto.name },
    });
    if (existingName) {
      throw new ConflictException(`Shift dengan nama '${dto.name}' sudah ada`);
    }

    // 2. Validate or auto-generate unique shift code
    let shiftCode = dto.code?.trim().toUpperCase();
    if (shiftCode) {
      const existingCode = await this.prisma.shift.findUnique({
        where: { code: shiftCode },
      });
      if (existingCode) {
        throw new ConflictException(`Shift dengan kode '${shiftCode}' sudah digunakan`);
      }
    } else {
      const baseCode = dto.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'SHF';
      let candidate = baseCode;
      let counter = 1;
      while (await this.prisma.shift.findUnique({ where: { code: candidate } })) {
        candidate = `${baseCode}${counter}`;
        counter++;
      }
      shiftCode = candidate;
    }

    const shift = await this.prisma.shift.create({
      data: {
        name: dto.name,
        code: shiftCode,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakMinutes: dto.breakMinutes ?? 60,
        toleranceMinutes: dto.toleranceMinutes ?? 15,
        isOvernight: dto.isOvernight ?? false,
        workDays: dto.workDays ?? '1,2,3,4,5',
        description: dto.description,
        status: dto.status ?? ShiftStatus.ACTIVE,
      },
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'SHIFT_CREATED',
      details: `Shift '${shift.name}' (${shift.code}) dibuat: ${shift.startTime}-${shift.endTime}, toleransi ${shift.toleranceMinutes}m`,
      metadata: { shiftId: shift.id, ...dto },
    });

    return shift;
  }

  /**
   * Update an existing shift safely without breaking historical attendance data.
   */
  async update(id: string, dto: UpdateShiftDto, user?: any) {
    const existing = await this.findOne(id);

    if (dto.name && dto.name !== existing.name) {
      const duplicateName = await this.prisma.shift.findUnique({
        where: { name: dto.name },
      });
      if (duplicateName && duplicateName.id !== id) {
        throw new ConflictException(`Shift dengan nama '${dto.name}' sudah ada`);
      }
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicateCode = await this.prisma.shift.findUnique({
        where: { code: dto.code },
      });
      if (duplicateCode && duplicateCode.id !== id) {
        throw new ConflictException(`Shift dengan kode '${dto.code}' sudah digunakan`);
      }
    }

    const updated = await this.prisma.shift.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'SHIFT_UPDATED',
      details: `Shift '${updated.name}' diperbarui`,
      metadata: { shiftId: id, changes: dto },
    });

    return updated;
  }

  /**
   * Soft deactivate a shift. Inactive shifts cannot be assigned to new schedules.
   */
  async deactivate(id: string, user?: any) {
    await this.findOne(id);

    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.INACTIVE },
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'SHIFT_DEACTIVATED',
      details: `Shift '${updated.name}' dinonaktifkan`,
      metadata: { shiftId: id },
    });

    return updated;
  }

  /**
   * Re-activate a disabled shift.
   */
  async activate(id: string, user?: any) {
    await this.findOne(id);

    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.ACTIVE },
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'SHIFT_ACTIVATED',
      details: `Shift '${updated.name}' diaktifkan kembali`,
      metadata: { shiftId: id },
    });

    return updated;
  }

  /**
   * Assign a shift to an employee with date range, schedule conflict check, and audit logging.
   */
  async assignShift(dto: AssignShiftDto, user?: any) {
    // 1. Validate employee
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: { department: true },
    });
    if (!employee) {
      throw new NotFoundException(`Karyawan dengan ID '${dto.employeeId}' tidak ditemukan`);
    }
    if (employee.employmentStatus === EmploymentStatus.INACTIVE) {
      throw new BadRequestException('Karyawan berstatus nonaktif tidak dapat diberikan penugasan shift');
    }

    // 2. Validate shift
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
    });
    if (!shift) {
      throw new NotFoundException(`Shift dengan ID '${dto.shiftId}' tidak ditemukan`);
    }
    if (shift.status === ShiftStatus.INACTIVE) {
      throw new BadRequestException('Shift nonaktif tidak dapat diberikan ke jadwal baru');
    }

    // 3. Resolve start and end dates
    const now = new Date();
    const todayJakarta = getJakartaDateInfo(now).attendanceDate;

    let startDate: Date;
    let endDate: Date;

    if (dto.startDate) {
      startDate = parseJakartaDateString(dto.startDate);
    } else {
      startDate = todayJakarta;
    }

    if (dto.endDate) {
      endDate = parseJakartaDateString(dto.endDate);
    } else {
      // Default: 1 year from start date
      endDate = new Date(startDate);
      endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
    }

    // 4. BACKEND SCHEDULE CONFLICT CHECK:
    // Prevent overlapping active schedules for this employee
    const conflict = await this.prisma.employeeSchedule.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: 'ACTIVE',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { shift: true },
    });

    if (conflict) {
      throw new BadRequestException('Jadwal karyawan bertabrakan dengan jadwal yang sudah ada.');
    }

    // 5. Create EmployeeSchedule
    const workDays = dto.workDays || shift.workDays || '1,2,3,4,5';

    const schedule = await this.prisma.employeeSchedule.create({
      data: {
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        startDate,
        endDate,
        workDays,
        notes: dto.notes,
        status: 'ACTIVE',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            position: true,
            department: { select: { id: true, name: true } },
          },
        },
        shift: true,
      },
    });

    // If marked as default or employee has no current default shift, update employee.shiftId
    if (dto.setAsDefault || !employee.shiftId) {
      await this.prisma.employee.update({
        where: { id: dto.employeeId },
        data: { shiftId: dto.shiftId },
      });
    }

    await this.auditService.log({
      userId: user?.id,
      action: 'EMPLOYEE_SHIFT_ASSIGNED',
      details: `Shift '${shift.name}' ditugaskan ke ${employee.firstName} ${employee.lastName} (${employee.employeeId}) periode ${dto.startDate || 'hari ini'} s/d ${dto.endDate || '1 tahun'}`,
      metadata: {
        scheduleId: schedule.id,
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        startDate,
        endDate,
      },
    });

    // Notify employee of assigned shift
    try {
      if (employee.userId) {
        const startStr = dto.startDate || 'hari ini';
        const endStr = dto.endDate || '1 tahun ke depan';
        await this.notificationsService.create({
          userId: employee.userId,
          type: 'SHIFT_ASSIGNED',
          title: 'Jadwal Shift Baru',
          message: `Anda mendapatkan penugasan jadwal ${shift.name} (${shift.startTime} - ${shift.endTime}) pada periode ${startStr} s/d ${endStr}.`,
          referenceType: 'SHIFT_ASSIGNMENT',
          referenceId: schedule.id,
        });
      }
    } catch (e) {
      // Non-blocking notification dispatch
    }

    return schedule;
  }

  /**
   * List all employee schedules with search, filter, and pagination.
   */
  async findAllSchedules(query: QueryScheduleDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(query.limit || 25, 100));
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeScheduleWhereInput = {};

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.shiftId && query.shiftId !== 'all') {
      where.shiftId = query.shiftId;
    }

    const employeeFilter: Prisma.EmployeeWhereInput = {};

    if (query.departmentId && query.departmentId !== 'all') {
      employeeFilter.departmentId = query.departmentId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      employeeFilter.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { employeeId: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(employeeFilter).length > 0) {
      where.employee = { is: employeeFilter };
    }

    if (query.date) {
      const parsedDate = parseJakartaDateString(query.date);
      where.startDate = { lte: parsedDate };
      where.endDate = { gte: parsedDate };
    } else {
      if (query.startDate && query.endDate) {
        const start = parseJakartaDateString(query.startDate);
        const end = parseJakartaDateString(query.endDate);
        where.startDate = { lte: end };
        where.endDate = { gte: start };
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.employeeSchedule.count({ where }),
      this.prisma.employeeSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              position: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
          shift: {
            select: {
              id: true,
              name: true,
              code: true,
              startTime: true,
              endTime: true,
              breakMinutes: true,
              toleranceMinutes: true,
              isOvernight: true,
              workDays: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Update schedule dates or notes with conflict check excluding self.
   */
  async updateSchedule(
    id: string,
    dto: UpdateEmployeeScheduleDto,
    user?: any
  ) {
    const schedule = await this.prisma.employeeSchedule.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!schedule) {
      throw new NotFoundException(`Jadwal dengan ID '${id}' tidak ditemukan`);
    }

    const startDate = dto.startDate ? parseJakartaDateString(dto.startDate) : schedule.startDate;
    const endDate = dto.endDate ? parseJakartaDateString(dto.endDate) : schedule.endDate;

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
    }

    // Overlap check excluding self
    const conflict = await this.prisma.employeeSchedule.findFirst({
      where: {
        id: { not: id },
        employeeId: schedule.employeeId,
        status: 'ACTIVE',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (conflict) {
      throw new BadRequestException('Jadwal karyawan bertabrakan dengan jadwal yang sudah ada.');
    }

    const updated = await this.prisma.employeeSchedule.update({
      where: { id },
      data: {
        startDate,
        endDate,
        shiftId: dto.shiftId || schedule.shiftId,
        status: dto.status || schedule.status,
        notes: dto.notes !== undefined ? dto.notes : schedule.notes,
      },
      include: {
        employee: true,
        shift: true,
      },
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'EMPLOYEE_SHIFT_UPDATED',
      details: `Jadwal shift ${schedule.employee.firstName} ${schedule.employee.lastName} diperbarui`,
      metadata: { scheduleId: id, changes: dto },
    });

    // Notify employee of shift modification
    try {
      if (schedule.employee?.userId) {
        await this.notificationsService.create({
          userId: schedule.employee.userId,
          type: 'SHIFT_CHANGED',
          title: 'Perubahan Jadwal Shift',
          message: `Jadwal shift Anda telah diperbarui. Silakan periksa jadwal terbaru Anda.`,
          referenceType: 'SHIFT_ASSIGNMENT',
          referenceId: updated.id,
        });
      }
    } catch (e) {
      // Non-blocking notification dispatch
    }

    return updated;
  }

  /**
   * Deactivate a schedule assignment.
   */
  async deactivateSchedule(id: string, user?: any) {
    const schedule = await this.prisma.employeeSchedule.findUnique({
      where: { id },
      include: { employee: true, shift: true },
    });
    if (!schedule) {
      throw new NotFoundException(`Jadwal dengan ID '${id}' tidak ditemukan`);
    }

    const updated = await this.prisma.employeeSchedule.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'EMPLOYEE_SHIFT_DEACTIVATED',
      details: `Jadwal shift ${schedule.shift.name} untuk ${schedule.employee.firstName} dinonaktifkan`,
      metadata: { scheduleId: id },
    });

    // Notify employee of shift deactivation
    try {
      if (schedule.employee?.userId) {
        await this.notificationsService.create({
          userId: schedule.employee.userId,
          type: 'SHIFT_CHANGED',
          title: 'Perubahan Jadwal Shift',
          message: `Jadwal shift Anda (${schedule.shift.name}) telah dinonaktifkan.`,
          referenceType: 'SHIFT_ASSIGNMENT',
          referenceId: id,
        });
      }
    } catch (e) {
      // Non-blocking notification dispatch
    }

    return updated;
  }

  /**
   * Remove a schedule assignment.
   */
  async removeSchedule(id: string, user?: any) {
    const schedule = await this.prisma.employeeSchedule.findUnique({
      where: { id },
      include: { employee: true, shift: true },
    });
    if (!schedule) {
      throw new NotFoundException(`Jadwal dengan ID '${id}' tidak ditemukan`);
    }

    await this.prisma.employeeSchedule.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'EMPLOYEE_SHIFT_DELETED',
      details: `Jadwal shift ${schedule.shift.name} untuk ${schedule.employee.firstName} dihapus`,
      metadata: { scheduleId: id },
    });

    return { success: true, message: 'Jadwal shift berhasil dihapus' };
  }

  /**
   * Get active shift schedule for the authenticated employee.
   */
  async getMySchedule(user: any) {
    const employeeId = user?.employee?.id;
    if (!employeeId) {
      throw new ForbiddenException('User is not linked to an employee record');
    }

    const now = new Date();
    const todayJakarta = getJakartaDateInfo(now).attendanceDate;

    // 1. Look for active date-range schedule
    const activeSchedule = await this.prisma.employeeSchedule.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: todayJakarta },
        endDate: { gte: todayJakarta },
      },
      include: { shift: true },
    });

    if (activeSchedule) {
      return {
        hasSpecificSchedule: true,
        schedule: activeSchedule,
        shift: activeSchedule.shift,
      };
    }

    // 2. Fallback to employee.shift
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });

    if (employee?.shift) {
      return {
        hasSpecificSchedule: false,
        schedule: null,
        shift: employee.shift,
      };
    }

    // 3. Fallback to general office settings
    const officeSetting = await this.prisma.attendanceSetting.findFirst();

    return {
      hasSpecificSchedule: false,
      schedule: null,
      shift: {
        id: 'office-default',
        name: 'Shift Kantor Utama',
        code: 'REG',
        startTime: officeSetting?.workStartTime || '08:00',
        endTime: officeSetting?.workEndTime || '17:00',
        toleranceMinutes: officeSetting?.toleranceMinutes || 15,
        breakMinutes: 60,
        isOvernight: false,
        workDays: '1,2,3,4,5',
        status: 'ACTIVE',
      },
    };
  }

  /**
   * Soft delete or hard delete master shift depending on usage.
   */
  async remove(id: string, user?: any) {
    const shift = await this.findOne(id);

    const hasReferences =
      (shift._count?.employees || 0) > 0 ||
      (shift._count?.schedules || 0) > 0 ||
      (shift._count?.attendances || 0) > 0;

    if (hasReferences) {
      // Soft deactivate
      const updated = await this.prisma.shift.update({
        where: { id },
        data: { status: ShiftStatus.INACTIVE },
      });

      await this.auditService.log({
        userId: user?.id,
        action: 'SHIFT_DEACTIVATED',
        details: `Shift '${shift.name}' dinonaktifkan (karena memiliki referensi data histori)`,
        metadata: { shiftId: id },
      });

      return {
        ...updated,
        message: 'Shift telah dinonaktifkan karena memiliki referensi histori data',
      };
    }

    await this.prisma.shift.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: user?.id,
      action: 'SHIFT_DELETED',
      details: `Shift '${shift.name}' dihapus permanen`,
      metadata: { shiftId: id },
    });

    return { success: true, message: 'Shift berhasil dihapus' };
  }
}
