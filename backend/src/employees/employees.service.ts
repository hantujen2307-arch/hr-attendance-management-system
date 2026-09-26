import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateSelfProfileDto } from './dto/update-self-profile.dto';
import { ImportEmployeesDto, ImportEmployeeRowDto } from './dto/import-employees.dto';
import {
  EmploymentStatus,
  Prisma,
  ShiftStatus,
  UserRole,
  AttendanceStatus,
  LeaveRequestStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * KPI Statistics for Employee Management.
   * Direct aggregation from database.
   */
  async getStats() {
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
      totalDepartments,
      totalPositions,
    ] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { employmentStatus: EmploymentStatus.ACTIVE } }),
      this.prisma.employee.count({ where: { employmentStatus: EmploymentStatus.INACTIVE } }),
      this.prisma.employee.count({ where: { employmentStatus: EmploymentStatus.ON_LEAVE } }),
      this.prisma.department.count({ where: { status: 'ACTIVE' } }),
      this.prisma.position.count({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
      totalDepartments,
      totalPositions,
    };
  }

  /**
   * List all master positions for selection.
   */
  async getMasterPositions() {
    return this.prisma.position.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Helper to generate next unique Employee Code / NIP e.g., "EMP-006".
   */
  async generateNextEmployeeId(): Promise<string> {
    const employees = await this.prisma.employee.findMany({
      select: { employeeId: true },
    });

    let maxNum = 0;
    for (const emp of employees) {
      const match = emp.employeeId.match(/^EMP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNum = maxNum + 1;
    return `EMP-${nextNum.toString().padStart(3, '0')}`;
  }

  /**
   * Helper to save avatar image (base64 or URL).
   */
  private async saveAvatarPhoto(photoData: string, employeeId: string): Promise<string> {
    if (!photoData) return '';

    if (
      photoData.startsWith('/uploads/') ||
      photoData.startsWith('http://') ||
      photoData.startsWith('https://')
    ) {
      return photoData;
    }

    try {
      const baseDirs = [
        path.resolve(process.cwd(), 'public/uploads/avatars'),
        path.resolve(process.cwd(), '../public/uploads/avatars'),
      ];

      const match = photoData.match(/^data:image\/(\w+);base64,/);
      const extension = match ? match[1] === 'jpeg' ? 'jpg' : match[1] : 'jpg';

      if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension.toLowerCase())) {
        throw new BadRequestException('Format foto hanya mendukung JPG, JPEG, PNG atau WEBP');
      }

      const cleanBase64 = photoData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (buffer.length > 2 * 1024 * 1024) {
        throw new BadRequestException('Ukuran file foto profil maksimal 2 MB');
      }

      let actualExt = 'jpg';
      if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        actualExt = 'jpg';
      } else if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        actualExt = 'png';
      } else if (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      ) {
        actualExt = 'webp';
      } else {
        throw new BadRequestException('Format file foto tidak valid. Hanya JPEG, PNG, atau WebP yang diperbolehkan.');
      }

      const safeEmpId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `avatar-${safeEmpId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${actualExt}`;

      for (const baseDir of baseDirs) {
        try {
          if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
          }
          fs.writeFileSync(path.join(baseDir, filename), buffer);
        } catch {
          // Ignore directory errors for secondary paths
        }
      }

      return `/uploads/avatars/${filename}`;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('Failed to save avatar photo:', err);
      return '';
    }
  }

  /**
   * List employees with server-side filters and search.
   */
  async findAll(params?: {
    departmentId?: string;
    status?: EmploymentStatus;
    position?: string;
    search?: string;
  }) {
    const { departmentId, status, position, search } = params || {};
    const where: Prisma.EmployeeWhereInput = {};

    if (departmentId && departmentId !== 'all') {
      where.departmentId = departmentId;
    }

    if (status && (status as any) !== 'all') {
      where.employmentStatus = status;
    }

    if (position && position !== 'all') {
      where.position = { contains: position, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { employeeId: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { position: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /**
   * Basic find one employee by ID.
   */
  async findOne(id: string, currentUser?: any) {
    // Role check: EMPLOYEE can only view own profile
    if (currentUser?.role === UserRole.EMPLOYEE && currentUser.employee?.id !== id) {
      throw new ForbiddenException('Akses ditolak: Anda hanya dapat melihat data Anda sendiri');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        shift: true,
        user: { select: { id: true, email: true, role: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Karyawan dengan ID '${id}' tidak ditemukan`);
    }

    return employee;
  }

  /**
   * Get detailed employee profile including full attendance statistics,
   * recent attendances, recent leave requests, and audit logs.
   */
  async getDetailedProfile(id: string, currentUser?: any) {
    // Role check: EMPLOYEE can only view own profile
    if (currentUser?.role === UserRole.EMPLOYEE && currentUser.employee?.id !== id) {
      throw new ForbiddenException('Akses ditolak: Anda hanya dapat melihat profil Anda sendiri');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        shift: true,
        user: { select: { id: true, email: true, role: true, createdAt: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Karyawan dengan ID '${id}' tidak ditemukan`);
    }

    // Parallel fetch attendance stats, recent attendances, leave requests, audit logs, and overtime requests
    const [attendances, recentAttendances, recentLeaves, auditLogs, recentOvertimes] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { employeeId: id },
        _count: { status: true },
      }),
      this.prisma.attendance.findMany({
        where: { employeeId: id },
        take: 15,
        orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.leaveRequest.findMany({
        where: { employeeId: id },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          leaveType: true,
          approver: {
            select: {
              id: true,
              email: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { userId: employee.userId ?? undefined },
            { details: { contains: employee.employeeId } },
            { details: { contains: `${employee.firstName} ${employee.lastName}` } },
          ],
        },
        take: 15,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.overtimeRequest.findMany({
        where: { employeeId: id },
        take: 15,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          approver: {
            select: {
              id: true,
              email: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    // Attendance stats breakdown
    const stats = {
      hadir: 0,
      terlambat: 0,
      izin: 0,
      sakit: 0,
      dinas: 0,
      cuti: 0,
      alpha: 0,
      totalRecords: 0,
    };

    for (const group of attendances) {
      stats.totalRecords += group._count.status;
      switch (group.status) {
        case AttendanceStatus.PRESENT:
          stats.hadir += group._count.status;
          break;
        case AttendanceStatus.LATE:
          stats.terlambat += group._count.status;
          break;
        case AttendanceStatus.LEAVE:
          stats.izin += group._count.status;
          break;
        case AttendanceStatus.SICK:
          stats.sakit += group._count.status;
          break;
        case AttendanceStatus.BUSINESS_TRIP:
          stats.dinas += group._count.status;
          break;
        case AttendanceStatus.ABSENT:
          stats.alpha += group._count.status;
          break;
      }
    }

    // Calculate cuti specifically from approved cuti requests
    const approvedCutiCount = recentLeaves.filter(
      (l) =>
        l.status === LeaveRequestStatus.APPROVED &&
        (l.leaveType?.name.toLowerCase().includes('cuti') ||
          l.leaveType?.name.toLowerCase().includes('annual'))
    ).length;
    stats.cuti = approvedCutiCount;

    return {
      employee,
      stats,
      recentAttendances,
      recentLeaves,
      recentOvertimes,
      auditLogs,
    };
  }

  /**
   * Register a new employee with secure user account provisioning.
   */
  async create(dto: CreateEmployeeDto, currentUser?: any) {
    const employeeId = dto.employeeId?.trim();
    if (!employeeId) {
      throw new BadRequestException('NIP / Employee ID wajib diisi');
    }

    const email = dto.email.trim().toLowerCase();

    // Verify unique employeeId
    const existingCode = await this.prisma.employee.findUnique({
      where: { employeeId },
    });
    if (existingCode) {
      throw new ConflictException(`NIP / Employee ID '${employeeId}' sudah digunakan karyawan lain`);
    }

    // Verify unique email in employee table
    const existingEmpEmail = await this.prisma.employee.findUnique({
      where: { email },
    });
    if (existingEmpEmail) {
      throw new ConflictException(`Email '${email}' sudah digunakan oleh karyawan lain`);
    }

    // Verify department exists
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Unit Kerja / Department dengan ID '${dto.departmentId}' tidak ditemukan`);
    }

    // Verify shift if provided
    if (dto.shiftId) {
      const shift = await this.prisma.shift.findUnique({
        where: { id: dto.shiftId },
      });
      if (!shift) {
        throw new NotFoundException(`Shift dengan ID '${dto.shiftId}' tidak ditemukan`);
      }
      if (shift.status === ShiftStatus.INACTIVE) {
        throw new BadRequestException('Shift yang tidak aktif tidak dapat dialokasikan');
      }
    }

    // Process photo if provided
    let photoPath = dto.photo || '';
    if (photoPath && photoPath.startsWith('data:image/')) {
      photoPath = await this.saveAvatarPhoto(photoPath, employeeId);
    }

    // Execute atomic transaction for User + Employee creation
    const createdEmployee = await this.prisma.$transaction(async (tx) => {
      let linkedUserId = dto.userId;

      if (!linkedUserId && dto.createAccount !== false) {
        // Check if User already exists with this email
        let user = await tx.user.findUnique({ where: { email } });
        if (user) {
          // Verify user is not already linked to another employee
          const userLinked = await tx.employee.findUnique({ where: { userId: user.id } });
          if (userLinked) {
            throw new ConflictException(`Akun login dengan email '${email}' sudah terhubung dengan karyawan lain`);
          }
          linkedUserId = user.id;
        } else {
          // Create new user account with hashed password
          const initialPwd = dto.initialPassword || 'Password123!';
          const passwordHash = await bcrypt.hash(initialPwd, 10);
          user = await tx.user.create({
            data: {
              email,
              passwordHash,
              role: UserRole.EMPLOYEE,
            },
          });
          linkedUserId = user.id;
        }
      }

      return tx.employee.create({
        data: {
          employeeId,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          phone: dto.phone?.trim() || null,
          photo: photoPath || null,
          address: dto.address?.trim() || null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          departmentId: dto.departmentId,
          shiftId: dto.shiftId || null,
          userId: linkedUserId || null,
          position: dto.position.trim(),
          joinDate: new Date(dto.joinDate),
          employmentStatus: dto.employmentStatus || EmploymentStatus.ACTIVE,
        },
        include: {
          department: true,
          shift: true,
          user: { select: { id: true, email: true, role: true } },
        },
      });
    });

    // Write audit log
    await this.auditService.log({
      userId: currentUser?.id,
      action: 'EMPLOYEE_CREATE',
      details: `Karyawan baru dibuat: ${createdEmployee.firstName} ${createdEmployee.lastName} (${createdEmployee.employeeId})`,
      metadata: {
        employeeId: createdEmployee.employeeId,
        id: createdEmployee.id,
        department: department.name,
        position: createdEmployee.position,
      },
    });

    // Notify all ADMIN and HR users of new employee
    try {
      const adminAndHrUsers = await this.prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.HR] } },
        select: { id: true },
      });
      await this.notificationsService.createBulk(
        adminAndHrUsers.map((u) => u.id),
        {
          type: 'EMPLOYEE_CREATED',
          title: 'Karyawan Baru Terdaftar',
          message: `${createdEmployee.firstName} ${createdEmployee.lastName} (${createdEmployee.employeeId}) berhasil didaftarkan di unit ${department.name}.`,
          referenceType: 'EMPLOYEE',
          referenceId: createdEmployee.id,
        },
      );
    } catch (e) {
      // Non-blocking notification dispatch
    }

    return createdEmployee;
  }

  /**
   * Update employee details with validation and audit logging.
   */
  async update(id: string, dto: UpdateEmployeeDto, currentUser?: any) {
    const existing = await this.findOne(id);

    // Validate NIP uniqueness if changed
    if (dto.employeeId && dto.employeeId.trim() !== existing.employeeId) {
      const codeExists = await this.prisma.employee.findUnique({
        where: { employeeId: dto.employeeId.trim() },
      });
      if (codeExists && codeExists.id !== id) {
        throw new ConflictException(`NIP '${dto.employeeId}' sudah digunakan karyawan lain`);
      }
    }

    // Validate email uniqueness if changed
    if (dto.email && dto.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const emailExists = await this.prisma.employee.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (emailExists && emailExists.id !== id) {
        throw new ConflictException(`Email '${dto.email}' sudah digunakan karyawan lain`);
      }
    }

    // Process photo if provided
    let photoPath = dto.photo !== undefined ? dto.photo : existing.photo;
    if (dto.photo && dto.photo.startsWith('data:image/')) {
      photoPath = await this.saveAvatarPhoto(dto.photo, existing.employeeId);
    }

    const updatedEmployee = await this.prisma.$transaction(async (tx) => {
      // If email changed and employee is linked to a user account, sync the user email as well
      if (dto.email && existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { email: dto.email.trim().toLowerCase() },
        });
      }

      return tx.employee.update({
        where: { id },
        data: {
          employeeId: dto.employeeId ? dto.employeeId.trim() : undefined,
          firstName: dto.firstName ? dto.firstName.trim() : undefined,
          lastName: dto.lastName ? dto.lastName.trim() : undefined,
          email: dto.email ? dto.email.trim().toLowerCase() : undefined,
          phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
          photo: photoPath !== undefined ? photoPath || null : undefined,
          address: dto.address !== undefined ? dto.address?.trim() || null : undefined,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          departmentId: dto.departmentId || undefined,
          shiftId: dto.shiftId !== undefined ? dto.shiftId : undefined,
          position: dto.position ? dto.position.trim() : undefined,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
          employmentStatus: dto.employmentStatus || undefined,
        },
        include: {
          department: true,
          shift: true,
          user: { select: { id: true, email: true, role: true } },
        },
      });
    });

    // Write audit log
    const changedFields: string[] = [];
    if (dto.photo && dto.photo !== existing.photo) changedFields.push('foto');
    if (dto.departmentId && dto.departmentId !== existing.departmentId) changedFields.push('unit_kerja');
    if (dto.position && dto.position !== existing.position) changedFields.push('jabatan');
    if (dto.employmentStatus && dto.employmentStatus !== existing.employmentStatus) changedFields.push('status');

    await this.auditService.log({
      userId: currentUser?.id,
      action: 'EMPLOYEE_UPDATE',
      details: `Data karyawan diperbarui: ${updatedEmployee.firstName} ${updatedEmployee.lastName} (${updatedEmployee.employeeId})`,
      metadata: {
        employeeId: updatedEmployee.employeeId,
        id: updatedEmployee.id,
        changedFields,
      },
    });

    return updatedEmployee;
  }

  /**
   * Soft deactivation of employee.
   * Preserves all historical records while preventing new attendances/leaves.
   */
  async deactivate(id: string, currentUser?: any) {
    const existing = await this.findOne(id);

    const deactivated = await this.prisma.employee.update({
      where: { id },
      data: { employmentStatus: EmploymentStatus.INACTIVE },
      include: {
        department: true,
        shift: true,
      },
    });

    await this.auditService.log({
      userId: currentUser?.id,
      action: 'EMPLOYEE_DEACTIVATE',
      details: `Karyawan dinonaktifkan: ${existing.firstName} ${existing.lastName} (${existing.employeeId})`,
      metadata: { employeeId: existing.employeeId, id },
    });

    return deactivated;
  }

  /**
   * Re-activate employee back to ACTIVE status.
   */
  async activate(id: string, currentUser?: any) {
    const existing = await this.findOne(id);

    const activated = await this.prisma.employee.update({
      where: { id },
      data: { employmentStatus: EmploymentStatus.ACTIVE },
      include: {
        department: true,
        shift: true,
      },
    });

    await this.auditService.log({
      userId: currentUser?.id,
      action: 'EMPLOYEE_ACTIVATE',
      details: `Karyawan diaktifkan kembali: ${existing.firstName} ${existing.lastName} (${existing.employeeId})`,
      metadata: { employeeId: existing.employeeId, id },
    });

    return activated;
  }

  /**
   * Soft remove employee record (alias for deactivate).
   */
  async remove(id: string, currentUser?: any) {
    return this.deactivate(id, currentUser);
  }

  /**
   * Employee self-profile update.
   * Strictly limited to: phone, address, photo.
   */
  async updateSelfProfile(currentUser: any, dto: UpdateSelfProfileDto) {
    const employeeId = currentUser?.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Pengguna tidak terhubung dengan profil karyawan');
    }

    const existing = await this.findOne(employeeId);

    let photoPath = existing.photo;
    if (dto.photo && dto.photo.startsWith('data:image/')) {
      photoPath = await this.saveAvatarPhoto(dto.photo, existing.employeeId);
    } else if (dto.photo !== undefined) {
      photoPath = dto.photo;
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
        address: dto.address !== undefined ? dto.address?.trim() || null : undefined,
        photo: photoPath,
      },
      include: {
        department: true,
        shift: true,
        user: { select: { id: true, email: true, role: true } },
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: 'EMPLOYEE_SELF_UPDATE',
      details: `Karyawan memperbarui profil mandiri: ${existing.firstName} ${existing.lastName}`,
      metadata: { employeeId: existing.employeeId, id: employeeId },
    });

    return updated;
  }

  /**
   * Export employees matching active filter as UTF-8 BOM CSV.
   * Excludes any sensitive password hashes or authentication secrets.
   */
  async exportCsv(params?: {
    departmentId?: string;
    status?: EmploymentStatus;
    position?: string;
    search?: string;
  }): Promise<string> {
    const employees = await this.findAll(params);

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headers = [
      'No',
      'ID Karyawan',
      'Nama Lengkap',
      'NIP',
      'Email',
      'No. Telepon',
      'Jabatan',
      'Unit Kerja',
      'Tanggal Mulai Kerja',
      'Status',
    ];

    const rows = employees.map((emp, index) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.trim();
      const joinDateStr = emp.joinDate.toISOString().split('T')[0];
      const statusText =
        emp.employmentStatus === EmploymentStatus.ACTIVE
          ? 'AKTIF'
          : emp.employmentStatus === EmploymentStatus.INACTIVE
          ? 'NONAKTIF'
          : 'CUTI';

      return [
        index + 1,
        escapeCsv(emp.id),
        escapeCsv(fullName),
        escapeCsv(emp.employeeId),
        escapeCsv(emp.email),
        escapeCsv(emp.phone || '-'),
        escapeCsv(emp.position),
        escapeCsv(emp.department?.name || '-'),
        escapeCsv(joinDateStr),
        escapeCsv(statusText),
      ].join(',');
    });

    // Prepend UTF-8 Byte Order Mark for Excel automatic UTF-8 recognition
    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Import batch employees with row-level validation.
   */
  async importBatch(dto: ImportEmployeesDto, currentUser?: any) {
    let rows: ImportEmployeeRowDto[] = [];

    if (dto.csvContent) {
      // Parse raw CSV content
      const lines = dto.csvContent
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        throw new BadRequestException('File CSV kosong atau tidak memiliki baris data');
      }

      // Read header
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        // Regex parse CSV row preserving quotes
        const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const values = match.map((v) => v.replace(/^"|"$/g, '').trim());

        const getVal = (possibleHeaders: string[]) => {
          for (const ph of possibleHeaders) {
            const idx = headers.findIndex((h) => h.includes(ph));
            if (idx !== -1 && values[idx] !== undefined) return values[idx];
          }
          return '';
        };

        rows.push({
          fullName: getVal(['nama', 'name']),
          employeeId: getVal(['nip', 'id']),
          email: getVal(['email']),
          phone: getVal(['telepon', 'phone', 'hp']),
          position: getVal(['jabatan', 'position']),
          department: getVal(['unit', 'departemen', 'department']),
          joinDate: getVal(['mulai', 'join', 'tanggal']),
          status: getVal(['status']),
        });
      }
    } else if (dto.rows && Array.isArray(dto.rows)) {
      rows = dto.rows;
    } else {
      throw new BadRequestException('Data import tidak valid');
    }

    if (rows.length === 0) {
      throw new BadRequestException('Tidak ada baris data karyawan untuk diimpor');
    }

    // Load reference data from DB for validation
    const [existingEmployees, departments, positions] = await Promise.all([
      this.prisma.employee.findMany({ select: { employeeId: true, email: true } }),
      this.prisma.department.findMany(),
      this.prisma.position.findMany(),
    ]);

    const existingNips = new Set(existingEmployees.map((e) => e.employeeId.toUpperCase()));
    const existingEmails = new Set(existingEmployees.map((e) => e.email.toLowerCase()));

    const fileNips = new Set<string>();
    const fileEmails = new Set<string>();

    const errors: Array<{ row: number; field: string; message: string }> = [];
    const validRows: Array<{
      rowNum: number;
      firstName: string;
      lastName: string;
      employeeId: string;
      email: string;
      phone: string | null;
      position: string;
      departmentId: string;
      joinDate: Date;
      employmentStatus: EmploymentStatus;
    }> = [];

    for (let index = 0; index < rows.length; index++) {
      const rowNum = index + 2; // 1-based, accounting for header row
      const r = rows[index];

      // Validate Nama
      if (!r.fullName || !r.fullName.trim()) {
        errors.push({ row: rowNum, field: 'fullName', message: 'Nama lengkap wajib diisi' });
      }

      // Validate NIP
      const nip = r.employeeId ? r.employeeId.trim().toUpperCase() : '';
      if (!nip) {
        errors.push({ row: rowNum, field: 'employeeId', message: 'NIP wajib diisi' });
      } else if (existingNips.has(nip)) {
        errors.push({ row: rowNum, field: 'employeeId', message: `NIP '${nip}' sudah digunakan di database` });
      } else if (fileNips.has(nip)) {
        errors.push({ row: rowNum, field: 'employeeId', message: `NIP '${nip}' duplikat di dalam file import` });
      } else {
        fileNips.add(nip);
      }

      // Validate Email
      const email = r.email ? r.email.trim().toLowerCase() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push({ row: rowNum, field: 'email', message: `Format email '${r.email}' tidak valid` });
      } else if (existingEmails.has(email)) {
        errors.push({ row: rowNum, field: 'email', message: `Email '${email}' sudah digunakan di database` });
      } else if (fileEmails.has(email)) {
        errors.push({ row: rowNum, field: 'email', message: `Email '${email}' duplikat di dalam file import` });
      } else {
        fileEmails.add(email);
      }

      // Validate Unit Kerja
      const deptName = r.department ? r.department.trim().toLowerCase() : '';
      const matchedDept = departments.find(
        (d) =>
          d.name.toLowerCase() === deptName ||
          (d.code && d.code.toLowerCase() === deptName)
      );
      if (!matchedDept) {
        errors.push({
          row: rowNum,
          field: 'department',
          message: `Unit Kerja '${r.department}' tidak ditemukan. Pilihan: ${departments.map((d) => d.name).join(', ')}`,
        });
      }

      // Validate Jabatan
      const posName = r.position ? r.position.trim() : '';
      if (!posName) {
        errors.push({ row: rowNum, field: 'position', message: 'Jabatan wajib diisi' });
      }

      // Validate Join Date
      let joinDate = new Date();
      if (r.joinDate && r.joinDate.trim()) {
        const parsed = new Date(r.joinDate.trim());
        if (isNaN(parsed.getTime())) {
          errors.push({ row: rowNum, field: 'joinDate', message: `Format tanggal mulai '${r.joinDate}' tidak valid (YYYY-MM-DD)` });
        } else {
          joinDate = parsed;
        }
      }

      // Validate Status
      let empStatus: EmploymentStatus = EmploymentStatus.ACTIVE;
      if (r.status) {
        const s = r.status.trim().toUpperCase();
        if (s === 'NONAKTIF' || s === 'INACTIVE') empStatus = EmploymentStatus.INACTIVE;
        else if (s === 'CUTI' || s === 'ON_LEAVE') empStatus = EmploymentStatus.ON_LEAVE;
      }

      if (errors.length === 0 || errors.every((e) => e.row !== rowNum)) {
        const nameParts = (r.fullName || '').trim().split(/\s+/);
        const firstName = nameParts[0] || 'Employee';
        const lastName = nameParts.slice(1).join(' ') || '-';

        validRows.push({
          rowNum,
          firstName,
          lastName,
          employeeId: nip,
          email,
          phone: r.phone?.trim() || null,
          position: posName,
          departmentId: matchedDept?.id || '',
          joinDate,
          employmentStatus: empStatus,
        });
      }
    }

    // If any validation error occurred, abort and report row-level errors
    if (errors.length > 0) {
      return {
        success: false,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errors.length,
        errors,
      };
    }

    // All rows valid: insert atomically in transaction and create user accounts
    const createdCount = await this.prisma.$transaction(async (tx) => {
      const defaultPwdHash = await bcrypt.hash('Password123!', 10);
      let count = 0;

      for (const row of validRows) {
        // Check if user already exists with this email
        let user = await tx.user.findUnique({ where: { email: row.email } });
        if (!user) {
          user = await tx.user.create({
            data: {
              email: row.email,
              passwordHash: defaultPwdHash,
              role: UserRole.EMPLOYEE,
            },
          });
        }

        await tx.employee.create({
          data: {
            employeeId: row.employeeId,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            departmentId: row.departmentId,
            position: row.position,
            joinDate: row.joinDate,
            employmentStatus: row.employmentStatus,
            userId: user.id,
          },
        });
        count++;
      }

      return count;
    });

    // Write audit log
    await this.auditService.log({
      userId: currentUser?.id,
      action: 'EMPLOYEE_BATCH_IMPORT',
      details: `Impor batch ${createdCount} karyawan berhasil`,
      metadata: { count: createdCount },
    });

    return {
      success: true,
      totalRows: rows.length,
      importedCount: createdCount,
      errors: [],
    };
  }

  /**
   * Explicitly link a User to an Employee profile, or auto-provision for Admin/HR
   */
  async linkUserToEmployee(
    dto: { employeeId?: string; userId?: string; autoProvision?: boolean },
    currentUser: any
  ) {
    const targetUserId = dto.userId || currentUser?.id;
    if (!targetUserId) {
      throw new BadRequestException('User ID tidak valid');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { employee: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User akun tidak ditemukan');
    }

    // 1. If explicit employeeId is given, link directly
    if (dto.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.employeeId },
      });
      if (!employee) {
        throw new NotFoundException('Data karyawan tidak ditemukan');
      }

      // Check if employee already linked to another user
      if (employee.userId && employee.userId !== targetUserId) {
        await this.prisma.employee.update({
          where: { id: employee.id },
          data: { userId: null },
        });
      }

      const updated = await this.prisma.employee.update({
        where: { id: employee.id },
        data: { userId: targetUserId },
        include: { department: true, shift: true },
      });

      await this.auditService.log({
        userId: currentUser?.id,
        action: 'EMPLOYEE_USER_LINKED',
        details: `User ${targetUser.email} dihubungkan ke karyawan ${updated.firstName} ${updated.lastName} (${updated.employeeId})`,
        metadata: { employeeId: updated.id, userId: targetUserId },
      });

      return {
        success: true,
        message: `Berhasil menghubungkan user ke karyawan ${updated.firstName} ${updated.lastName}`,
        employee: updated,
      };
    }

    // 2. Auto-link by email
    let employee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { userId: targetUserId },
          { email: { equals: targetUser.email, mode: 'insensitive' } },
        ],
      },
      include: { department: true, shift: true },
    });

    if (employee) {
      if (employee.userId !== targetUserId) {
        employee = await this.prisma.employee.update({
          where: { id: employee.id },
          data: { userId: targetUserId },
          include: { department: true, shift: true },
        });
      }
      return {
        success: true,
        message: `Berhasil menghubungkan profil karyawan (${employee.employeeId}) berdasarkan email.`,
        employee,
      };
    }

    // 3. Auto-provision if Admin, HR, or requested
    let dept = await this.prisma.department.findFirst({ where: { status: 'ACTIVE' } });
    if (!dept) {
      dept = await this.prisma.department.create({
        data: { name: 'Management', code: 'MGMT', status: 'ACTIVE' },
      });
    }

    const shift = await this.prisma.shift.findFirst({ where: { status: 'ACTIVE' } });
    const empCount = await this.prisma.employee.count();
    const rolePrefix =
      targetUser.role === 'ADMIN' ? 'ADM' : targetUser.role === 'HR' ? 'HR' : 'EMP';

    const nameParts = (targetUser.email.split('@')[0] || 'User')
      .replace(/[._-]/g, ' ')
      .trim()
      .split(' ');
    const firstName =
      nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
    const lastName =
      nameParts.length > 1
        ? nameParts
            .slice(1)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
        : (targetUser.role === 'ADMIN' ? '(Admin)' : '');

    const position =
      targetUser.role === 'ADMIN'
        ? 'System Administrator'
        : targetUser.role === 'HR'
        ? 'HR Specialist'
        : 'Staff Employee';

    const newEmployee = await this.prisma.employee.create({
      data: {
        userId: targetUserId,
        employeeId: `EMP-${rolePrefix}-${String(empCount + 1).padStart(3, '0')}`,
        firstName: firstName || 'User',
        lastName: lastName || '',
        email: targetUser.email,
        departmentId: dept.id,
        shiftId: shift?.id || null,
        position,
        joinDate: new Date(),
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      include: { department: true, shift: true },
    });

    await this.auditService.log({
      userId: currentUser?.id,
      action: 'EMPLOYEE_AUTO_PROVISIONED',
      details: `Profil karyawan otomatis dibuat dan dihubungkan untuk user ${targetUser.email}`,
      metadata: { employeeId: newEmployee.id, userId: targetUserId },
    });

    return {
      success: true,
      message: `Profil karyawan (${newEmployee.employeeId}) berhasil dibuat otomatis dan dihubungkan ke akun Anda.`,
      employee: newEmployee,
    };
  }
}
