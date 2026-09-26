import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceStatus, EmploymentStatus, Prisma, UserRole } from '@prisma/client';
import {
  getJakartaDateInfo,
  parseJakartaDateString,
  determinePunctualityStatus,
  calculateWorkingMinutes,
  calculateHaversineDistance,
} from './attendance.time.util';
import { calculateOvertimeMinutes } from '../overtime/overtime.time.util';

import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../common/services/storage.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Helper to retrieve or initialize default attendance configuration.
   */
  private async getSetting() {
    let setting = await this.prisma.attendanceSetting.findFirst();
    if (!setting) {
      setting = await this.prisma.attendanceSetting.create({
        data: {
          locationName: 'Kantor Utama',
          latitude: -6.2088,
          longitude: 106.8456,
          radiusMeters: 100,
          workStartTime: '08:00',
          toleranceMinutes: 15,
          workEndTime: '17:00',
        },
      });
    }
    return setting;
  }

  /**
   * Helper to securely upload or persist selfie image to Cloud Storage (Supabase/Cloudinary)
   * or persistent Base64 Data URI in PostgreSQL (@db.Text) for serverless/ephemeral environments.
   */
  private async savePhoto(
    photoData: string,
    employeeId: string,
    dateString: string,
    type: 'check-in' | 'check-out'
  ): Promise<string> {
    if (!photoData) {
      throw new BadRequestException('Foto selfie absensi diperlukan');
    }

    if (
      photoData.startsWith('/uploads/') ||
      photoData.startsWith('http://') ||
      photoData.startsWith('https://')
    ) {
      return photoData;
    }

    try {
      const safeEmployeeId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
      const safeDateString = dateString.replace(/[^0-9-]/g, '');
      const folder = `attendance-photos/${safeEmployeeId}/${safeDateString}`;

      const savedUrl = await this.storageService.uploadImage(photoData, {
        folder,
        type,
      });

      return savedUrl;
    } catch (err: any) {
      console.error('Failed to save attendance photo via StorageService:', err);
      if (photoData.startsWith('data:image/')) {
        return photoData;
      }
      return `data:image/jpeg;base64,${photoData.replace(/^data:image\/\w+;base64,/, '')}`;
    }
  }

  /**
   * Helper to resolve Employee profile for authenticated user.
   * Auto-links userId to Employee by email, links unlinked employee,
   * or auto-provisions a default profile for Admin/HR/privileged accounts.
   */
  async resolveEmployee(user: any, throwOnError: boolean = true) {
    let employeeId = user?.employee?.id;
    let employee: any = null;

    // 1. Try finding by user.employee.id if populated
    if (employeeId) {
      employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: { shift: true },
      });
      if (employee && (!employee.userId || employee.userId !== user?.id) && user?.id) {
        await this.prisma.employee
          .update({
            where: { id: employee.id },
            data: { userId: user.id },
          })
          .catch(() => {});
      }
    }

    // 2. Try finding by userId
    if (!employee && user?.id) {
      employee = await this.prisma.employee.findFirst({
        where: { userId: user.id },
        include: { shift: true },
      });
    }

    // 3. Try finding by email (case-insensitive)
    if (!employee && user?.email) {
      employee = await this.prisma.employee.findFirst({
        where: {
          email: { equals: user.email.trim(), mode: 'insensitive' as const },
        },
        include: { shift: true },
      });

      if (employee && user?.id) {
        // Link to current user
        await this.prisma.employee
          .update({
            where: { id: employee.id },
            data: { userId: user.id },
          })
          .catch(() => {});
      }
    }

    // 4. Try matching unlinked employee by username prefix
    if (!employee && user?.email && user?.id) {
      const username = user.email.split('@')[0].trim().toLowerCase();
      if (username) {
        const unlinked = await this.prisma.employee.findFirst({
          where: {
            userId: null,
            email: { startsWith: username, mode: 'insensitive' as const },
          },
          include: { shift: true },
        });

        if (unlinked) {
          try {
            employee = await this.prisma.employee.update({
              where: { id: unlinked.id },
              data: { userId: user.id },
              include: { shift: true },
            });
          } catch (e) {
            // Ignore update error
          }
        }
      }
    }

    // 5. Fallback: Auto-provision default employee profile for Admin, HR, or developer accounts
    if (!employee && user?.id && user?.email) {
      const isAdminOrHr =
        user.role === UserRole.ADMIN ||
        user.role === UserRole.HR ||
        user.role === 'ADMIN' ||
        user.role === 'HR';

      if (isAdminOrHr) {
        try {
          // Resolve or create default department
          let department = await this.prisma.department.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          });

          if (!department) {
            department = await this.prisma.department.create({
              data: {
                name: 'Management',
                code: 'MGMT',
                status: 'ACTIVE',
                description: 'Executive Management & Administration',
              },
            });
          }

          // Resolve default shift
          const defaultShift = await this.prisma.shift.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          });

          const rolePrefix =
            user.role === 'ADMIN' || user.role === UserRole.ADMIN ? 'ADM' : 'HR';
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const empId = `EMP-${rolePrefix}-${randomSuffix}`;

          const nameParts = (user.email.split('@')[0] || 'Administrator')
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
              : (isAdminOrHr ? '(Staff)' : '');

          const positionTitle =
            user.role === 'ADMIN' || user.role === UserRole.ADMIN
              ? 'System Administrator'
              : 'HR Specialist';

          employee = await this.prisma.employee.create({
            data: {
              userId: user.id,
              employeeId: empId,
              firstName: firstName || 'Administrator',
              lastName: lastName || '',
              email: user.email.trim().toLowerCase(),
              departmentId: department.id,
              shiftId: defaultShift?.id || null,
              position: positionTitle,
              joinDate: new Date(),
              employmentStatus: EmploymentStatus.ACTIVE,
            },
            include: { shift: true },
          });
        } catch (createErr) {
          console.error('Auto-provisioning employee profile in resolveEmployee failed:', createErr);
        }
      }
    }

    if (!employee) {
      if (throwOnError) {
        throw new BadRequestException(
          'Authenticated user is not linked to an employee profile. Please contact HR to link your employee profile.'
        );
      }
      return null;
    }

    if (employee.employmentStatus === EmploymentStatus.INACTIVE) {
      if (throwOnError) {
        throw new ForbiddenException('Karyawan berstatus nonaktif tidak dapat melakukan absensi');
      }
      return null;
    }

    return employee;
  }

  /**
   * Check in for authenticated employee with GPS validation and selfie photo.
   */
  async checkIn(user: any, dto: CheckInDto) {
    const employee = await this.resolveEmployee(user);
    const employeeId = employee.id;

    const now = new Date();
    const { attendanceDate, dateString, hour, minute } = getJakartaDateInfo(now);

    // Resolve active shift for today: EmployeeSchedule -> employee.shift -> attendanceSetting
    const activeSchedule = await this.prisma.employeeSchedule.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
      include: { shift: true },
    });

    const activeShift = activeSchedule?.shift || employee.shift;
    const setting = await this.getSetting();
    const workStartTime = activeShift?.startTime || setting.workStartTime;
    const toleranceMinutes = activeShift?.toleranceMinutes ?? setting.toleranceMinutes;

    // Verify unique attendance for today
    const existing = await this.prisma.attendance.findUnique({
      where: {
        uq_employee_attendance_date: {
          employeeId,
          attendanceDate,
        },
      },
    });

    if (existing && existing.checkIn) {
      throw new ConflictException(`Anda sudah melakukan absensi masuk hari ini (${dateString})`);
    }

    // Validate GPS location
    const distance = calculateHaversineDistance(
      dto.latitude,
      dto.longitude,
      setting.latitude,
      setting.longitude
    );

    console.log(`📍 [GPS Geofence Audit] Check-In Request:`, {
      employee: `${employee.firstName} ${employee.lastName} (${employee.employeeId})`,
      employeeGPS: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy ?? 'N/A',
      },
      officeCoordinates: {
        locationName: setting.locationName,
        latitude: setting.latitude,
        longitude: setting.longitude,
      },
      allowedRadiusMeters: setting.radiusMeters,
      actualDistanceMeters: distance,
      isWithinGeofence: distance <= setting.radiusMeters,
    });

    if (distance > setting.radiusMeters) {
      throw new BadRequestException(
        `Anda berada di luar area absensi. Jarak Anda: ${distance} meter dari ${setting.locationName}. Batas radius absensi: ${setting.radiusMeters} meter. (GPS Anda: ${dto.latitude}, ${dto.longitude} | Kantor: ${setting.latitude}, ${setting.longitude}). Status: DI LUAR AREA.`
      );
    }

    // Save selfie photo
    const photoPath = await this.savePhoto(
      dto.photo,
      employee.employeeId,
      dateString,
      'check-in'
    );

    // Determine punctuality status based on active shift workStartTime + toleranceMinutes
    const status = determinePunctualityStatus(
      now,
      workStartTime,
      toleranceMinutes
    );

    let record;
    if (existing) {
      // Update existing placeholder (e.g. if created as leave/sick before)
      record = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          shiftId: activeShift?.id || null,
          checkIn: now,
          status,
          photoCheckIn: photoPath,
          latitudeCheckIn: dto.latitude,
          longitudeCheckIn: dto.longitude,
          accuracyCheckIn: dto.accuracy ?? null,
          distanceCheckIn: distance,
        },
        include: {
          shift: true,
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
    } else {
      record = await this.prisma.attendance.create({
        data: {
          employeeId,
          shiftId: activeShift?.id || null,
          attendanceDate,
          checkIn: now,
          status,
          photoCheckIn: photoPath,
          latitudeCheckIn: dto.latitude,
          longitudeCheckIn: dto.longitude,
          accuracyCheckIn: dto.accuracy ?? null,
          distanceCheckIn: distance,
        },
        include: {
          shift: true,
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
    }

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: 'ATTENDANCE_CHECK_IN',
      details: `${employee.firstName} ${employee.lastName} (${employee.employeeId}) checked in at ${now.toISOString()} with status ${status} on shift ${activeShift?.name || 'Default'}. Jarak: ${distance}m.`,
      metadata: {
        distance,
        status,
        shiftId: activeShift?.id,
        shiftName: activeShift?.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        photoPath,
      },
    });

    // Notify employee if check-in is late
    if (
      status === AttendanceStatus.LATE &&
      setting.enableNotifications !== false &&
      setting.enableLateAlert !== false
    ) {
      try {
        const [schedHour, schedMin] = workStartTime.split(':').map((v: string) => parseInt(v, 10));
        const schedMins = schedHour * 60 + (schedMin || 0);
        const actualMins = hour * 60 + minute;
        const lateMinutes = actualMins - schedMins;

        await this.notificationsService.create({
          userId: user.id,
          type: 'LATE_ATTENDANCE',
          title: 'Absensi Terlambat',
          message: `Absensi Anda tercatat terlambat ${Math.max(1, lateMinutes)} menit dari jadwal ${workStartTime} (toleransi ${toleranceMinutes}m).`,
          referenceType: 'ATTENDANCE',
          referenceId: record.id,
          idempotencyKey: `LATE_ATTENDANCE_${record.id}`,
        });
      } catch (e) {
        // Non-blocking notification dispatch
      }
    }

    return record;
  }

  /**
   * Check out for authenticated employee today with GPS validation and selfie photo.
   * Supports overnight shifts where check-in occurred on previous date.
   */
  async checkOut(user: any, dto: CheckOutDto) {
    const employee = await this.resolveEmployee(user);
    const employeeId = employee.id;

    const now = new Date();
    const { attendanceDate, dateString } = getJakartaDateInfo(now);

    // Locate attendance record to check out:
    // 1. Try today's record first
    let record = await this.prisma.attendance.findUnique({
      where: {
        uq_employee_attendance_date: {
          employeeId,
          attendanceDate,
        },
      },
      include: { shift: true },
    });

    let targetDateString = dateString;

    // 2. If no open checkIn for today, check yesterday's record for an open overnight shift
    if (!record || !record.checkIn || record.checkOut) {
      const yesterday = new Date(attendanceDate);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayInfo = getJakartaDateInfo(yesterday);

      const openYesterday = await this.prisma.attendance.findUnique({
        where: {
          uq_employee_attendance_date: {
            employeeId,
            attendanceDate: yesterday,
          },
        },
        include: { shift: true },
      });

      if (openYesterday && openYesterday.checkIn && !openYesterday.checkOut) {
        const isOvernight =
          openYesterday.shift?.isOvernight ||
          (openYesterday.shift?.startTime &&
            openYesterday.shift?.endTime &&
            openYesterday.shift.startTime > openYesterday.shift.endTime);

        if (isOvernight) {
          record = openYesterday;
          targetDateString = yesterdayInfo.dateString;
        }
      }
    }

    if (!record || !record.checkIn) {
      throw new NotFoundException(
        `Belum ada data absen masuk untuk hari ini (${dateString}) atau shift malam kemarin. Silakan absen masuk terlebih dahulu.`
      );
    }

    if (record.checkOut) {
      throw new ConflictException('Anda sudah melakukan absensi pulang untuk sesi kerja ini');
    }

    if (now.getTime() < record.checkIn.getTime()) {
      throw new BadRequestException('Waktu absen pulang tidak boleh lebih awal dari waktu absen masuk');
    }

    // Fetch setting and validate GPS location
    const setting = await this.getSetting();
    const distance = calculateHaversineDistance(
      dto.latitude,
      dto.longitude,
      setting.latitude,
      setting.longitude
    );

    console.log(`📍 [GPS Geofence Audit] Check-Out Request:`, {
      employee: `${employee.firstName} ${employee.lastName} (${employee.employeeId})`,
      employeeGPS: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy ?? 'N/A',
      },
      officeCoordinates: {
        locationName: setting.locationName,
        latitude: setting.latitude,
        longitude: setting.longitude,
      },
      allowedRadiusMeters: setting.radiusMeters,
      actualDistanceMeters: distance,
      isWithinGeofence: distance <= setting.radiusMeters,
    });

    if (distance > setting.radiusMeters) {
      throw new BadRequestException(
        `Anda berada di luar area absensi. Jarak Anda: ${distance} meter dari ${setting.locationName}. Batas radius absensi: ${setting.radiusMeters} meter. (GPS Anda: ${dto.latitude}, ${dto.longitude} | Kantor: ${setting.latitude}, ${setting.longitude}). Status: DI LUAR AREA.`
      );
    }

    // Save selfie photo
    const photoPath = await this.savePhoto(
      dto.photo,
      employee.employeeId,
      targetDateString,
      'check-out'
    );

    const rawWorkingMinutes = calculateWorkingMinutes(record.checkIn, now);
    const breakMinutes = record.shift?.breakMinutes ?? 0;
    const workingMinutes =
      rawWorkingMinutes > breakMinutes && breakMinutes > 0
        ? rawWorkingMinutes - breakMinutes
        : rawWorkingMinutes;

    const updated = await this.prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOut: now,
        workingMinutes,
        photoCheckOut: photoPath,
        latitudeCheckOut: dto.latitude,
        longitudeCheckOut: dto.longitude,
        accuracyCheckOut: dto.accuracy ?? null,
        distanceCheckOut: distance,
      },
      include: {
        shift: true,
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

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: 'ATTENDANCE_CHECK_OUT',
      details: `${employee.firstName} ${employee.lastName} checked out at ${now.toISOString()}. Durasi kerja: ${workingMinutes} menit (raw: ${rawWorkingMinutes}m, break: ${breakMinutes}m). Jarak: ${distance}m.`,
      metadata: {
        distance,
        workingMinutes,
        rawWorkingMinutes,
        latitude: dto.latitude,
        longitude: dto.longitude,
        photoPath,
      },
    });

    // Sync actual overtime if there is an overtime request for today
    try {
      if (updated.checkIn && updated.checkOut) {
        const inInfo = getJakartaDateInfo(updated.checkIn);
        const outInfo = getJakartaDateInfo(updated.checkOut);
        const actualStart = `${String(inInfo.hour).padStart(2, '0')}:${String(inInfo.minute).padStart(2, '0')}`;
        const actualEnd = `${String(outInfo.hour).padStart(2, '0')}:${String(outInfo.minute).padStart(2, '0')}`;

        const otRequests = await this.prisma.overtimeRequest.findMany({
          where: {
            employeeId: employee.id,
            date: record.attendanceDate,
            status: { in: ['PENDING', 'APPROVED'] },
          },
        });

        for (const ot of otRequests) {
          const actMins = calculateOvertimeMinutes(ot.plannedStartTime, actualEnd);
          await this.prisma.overtimeRequest.update({
            where: { id: ot.id },
            data: {
              attendanceId: updated.id,
              actualStartTime: actualStart,
              actualEndTime: actualEnd,
              actualMinutes: Math.max(0, actMins),
            },
          });
        }
      }
    } catch (otErr: any) {
      // Non-blocking overtime synchronization
    }

    return updated;
  }

  /**
   * Get today's attendance summary & self-status.
   */
  async getTodaySummary(user: any) {
    const { attendanceDate, dateString } = getJakartaDateInfo();
    const setting = await this.getSetting();

    const [totalEmployees, todayAttendances] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.attendance.findMany({
        where: { attendanceDate },
        select: { status: true, checkIn: true },
      }),
    ]);

    let present = 0;
    let late = 0;
    let absent = 0;
    let leave = 0;
    let sick = 0;
    let businessTrip = 0;
    let alreadyCheckedIn = 0;

    for (const att of todayAttendances) {
      if (att.status === AttendanceStatus.PRESENT) present++;
      else if (att.status === AttendanceStatus.LATE) late++;
      else if (att.status === AttendanceStatus.ABSENT) absent++;
      else if (att.status === AttendanceStatus.LEAVE) leave++;
      else if (att.status === AttendanceStatus.SICK) sick++;
      else if (att.status === AttendanceStatus.BUSINESS_TRIP) businessTrip++;

      if (att.checkIn) {
        alreadyCheckedIn++;
      }
    }

    const notYetCheckedIn = Math.max(0, totalEmployees - alreadyCheckedIn);

    let myAttendance: any = null;
    let employee = null;
    try {
      employee = await this.resolveEmployee(user, false);
    } catch {
      // Non-blocking in summary
    }
    const employeeId = employee?.id || user?.employee?.id;

    if (employeeId) {
      myAttendance = await this.prisma.attendance.findUnique({
        where: {
          uq_employee_attendance_date: {
            employeeId,
            attendanceDate,
          },
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
    }

    return {
      date: dateString,
      serverTime: new Date().toISOString(),
      setting: {
        locationName: setting.locationName,
        latitude: setting.latitude,
        longitude: setting.longitude,
        radiusMeters: setting.radiusMeters,
        workStartTime: setting.workStartTime,
        toleranceMinutes: setting.toleranceMinutes,
        workEndTime: setting.workEndTime,
      },
      summary: {
        totalEmployees,
        alreadyCheckedIn,
        notYetCheckedIn,
        present,
        late,
        absent,
        leave,
        sick,
        businessTrip,
      },
      attendance: myAttendance,
    };
  }

  /**
   * Paginated and filtered attendance query with role access scoping.
   */
  async findAll(query: QueryAttendanceDto, user: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {};

    // Role-based scoping: EMPLOYEE can only view self
    if (user.role === UserRole.EMPLOYEE) {
      let selfEmployeeId = user.employee?.id;
      if (!selfEmployeeId && user?.id) {
        const emp = await this.prisma.employee.findFirst({
          where: {
            OR: [
              { userId: user.id },
              ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
            ],
          },
          select: { id: true },
        });
        if (emp) selfEmployeeId = emp.id;
      }

      if (!selfEmployeeId) {
        return {
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        };
      }
      where.employeeId = selfEmployeeId;
    } else if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.status) {
      // Support Indonesian aliases
      let statusKey = query.status as any;
      if (statusKey === 'HADIR') statusKey = AttendanceStatus.PRESENT;
      else if (statusKey === 'TERLAMBAT') statusKey = AttendanceStatus.LATE;
      else if (statusKey === 'IZIN') statusKey = AttendanceStatus.LEAVE;
      else if (statusKey === 'SAKIT') statusKey = AttendanceStatus.SICK;
      else if (statusKey === 'DINAS') statusKey = AttendanceStatus.BUSINESS_TRIP;
      else if (statusKey === 'ALPHA') statusKey = AttendanceStatus.ABSENT;

      where.status = statusKey;
    }

    if (query.date) {
      where.attendanceDate = parseJakartaDateString(query.date);
    }

    const employeeWhere: Prisma.EmployeeWhereInput = {};
    if (query.departmentId) {
      employeeWhere.departmentId = query.departmentId;
    }

    if (query.search) {
      employeeWhere.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(employeeWhere).length > 0) {
      where.employee = employeeWhere;
    }

    const [total, data, setting] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              position: true,
              department: { select: { id: true, name: true } },
              shift: { select: { id: true, name: true, startTime: true, endTime: true } },
            },
          },
        },
        orderBy: [
          { attendanceDate: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.getSetting(),
    ]);

    return {
      data,
      setting: {
        locationName: setting.locationName,
        latitude: setting.latitude,
        longitude: setting.longitude,
        radiusMeters: setting.radiusMeters,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Detail attendance record with role scoping and office setting coordinates.
   */
  async findOne(id: string, user?: any) {
    const [attendance, setting] = await Promise.all([
      this.prisma.attendance.findUnique({
        where: { id },
        include: {
          employee: {
            include: {
              department: true,
              shift: true,
            },
          },
        },
      }),
      this.getSetting(),
    ]);

    if (!attendance) {
      throw new NotFoundException(`Attendance record with ID '${id}' not found`);
    }

    // Role-based check: EMPLOYEE can only view their own attendance
    if (user && user.role === UserRole.EMPLOYEE) {
      if (attendance.employeeId !== user.employee?.id) {
        throw new ForbiddenException('You do not have permission to view this attendance record');
      }
    }

    return {
      ...attendance,
      setting: {
        locationName: setting.locationName,
        latitude: setting.latitude,
        longitude: setting.longitude,
        radiusMeters: setting.radiusMeters,
        workStartTime: setting.workStartTime,
        toleranceMinutes: setting.toleranceMinutes,
        workEndTime: setting.workEndTime,
      },
    };
  }

  /**
   * Manual creation by ADMIN or HR.
   */
  async create(dto: CreateAttendanceDto) {
    const dateObj = parseJakartaDateString(dto.attendanceDate);

    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID '${dto.employeeId}' not found`);
    }

    // Check unique constraint
    const existing = await this.prisma.attendance.findUnique({
      where: {
        uq_employee_attendance_date: {
          employeeId: dto.employeeId,
          attendanceDate: dateObj,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Attendance record already exists for '${employee.firstName} ${employee.lastName}' on ${dto.attendanceDate}`
      );
    }

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : null;
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : null;

    if (checkIn && checkOut && checkOut.getTime() < checkIn.getTime()) {
      throw new BadRequestException('Check-out time cannot be earlier than check-in time');
    }

    let workingMinutes = dto.workingMinutes ?? null;
    if (workingMinutes === null && checkIn && checkOut) {
      workingMinutes = calculateWorkingMinutes(checkIn, checkOut);
    }

    // Status normalization
    let status = dto.status || AttendanceStatus.PRESENT;

    return this.prisma.attendance.create({
      data: {
        employeeId: dto.employeeId,
        attendanceDate: dateObj,
        checkIn,
        checkOut,
        status,
        workingMinutes,
        notes: dto.notes || null,
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
  }

  /**
   * Manual update by ADMIN or HR.
   */
  async update(id: string, dto: UpdateAttendanceDto, user?: any) {
    const existing = await this.findOne(id, user);

    const newCheckIn =
      dto.checkIn !== undefined
        ? dto.checkIn
          ? new Date(dto.checkIn)
          : null
        : existing.checkIn;

    const newCheckOut =
      dto.checkOut !== undefined
        ? dto.checkOut
          ? new Date(dto.checkOut)
          : null
        : existing.checkOut;

    if (newCheckIn && newCheckOut && newCheckOut.getTime() < newCheckIn.getTime()) {
      throw new BadRequestException('Check-out time cannot be earlier than check-in time');
    }

    let workingMinutes = dto.workingMinutes !== undefined ? dto.workingMinutes : existing.workingMinutes;
    if (dto.workingMinutes === undefined && newCheckIn && newCheckOut) {
      workingMinutes = calculateWorkingMinutes(newCheckIn, newCheckOut);
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        status: dto.status,
        workingMinutes,
        notes: dto.notes,
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

    if (user) {
      await this.auditService.log({
        userId: user.id,
        action: 'UPDATE_ATTENDANCE_STATUS',
        details: `Updated attendance for ${updated.employee.firstName} ${updated.employee.lastName} on ${updated.attendanceDate.toISOString().split('T')[0]} to status ${updated.status}`,
        metadata: { attendanceId: id, previousStatus: existing.status, newStatus: updated.status },
      });
    }

    return updated;
  }
}
