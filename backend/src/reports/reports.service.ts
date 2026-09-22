import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, EmploymentStatus, OvertimeStatus, Prisma, UserRole } from '@prisma/client';
import { QueryAttendanceReportDto } from './dto/query-attendance-report.dto';
import { getJakartaDateInfo, parseJakartaDateString } from '../attendance/attendance.time.util';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the number of working days (Monday-Friday) between two dates inclusive.
   * Weekends (Saturday and Sunday) are strictly excluded.
   */
  calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const cur = new Date(startDate);
    const end = new Date(endDate);

    while (cur <= end) {
      const dayOfWeek = cur.getUTCDay(); // 0 is Sunday, 6 is Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return count;
  }

  /**
   * Resolves date boundaries based on query (explicit dates, or month & year, or default current month).
   */
  private resolveDateRange(query: QueryAttendanceReportDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = parseJakartaDateString(query.startDate);
      endDate = parseJakartaDateString(query.endDate);
    } else if (query.month && query.year) {
      startDate = new Date(Date.UTC(query.year, query.month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(query.year, query.month, 0, 23, 59, 59, 999));
    } else if (query.month) {
      startDate = new Date(Date.UTC(currentYear, query.month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(currentYear, query.month, 0, 23, 59, 59, 999));
    } else if (query.year) {
      startDate = new Date(Date.UTC(query.year, 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(query.year, 11, 31, 23, 59, 59, 999));
    } else {
      // Default to current month
      startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
    }

    return { startDate, endDate };
  }

  /**
   * Builds Prisma where clause based on filters and role scope.
   */
  private buildReportWhere(query: QueryAttendanceReportDto, user: any): {
    where: Prisma.AttendanceWhereInput;
    startDate: Date;
    endDate: Date;
  } {
    const where: Prisma.AttendanceWhereInput = {};
    const { startDate, endDate } = this.resolveDateRange(query);

    where.attendanceDate = {
      gte: startDate,
      lte: endDate,
    };

    // Role-based scope: EMPLOYEE can only access own records
    if (user?.role === UserRole.EMPLOYEE) {
      const selfEmployeeId = user.employee?.id;
      if (!selfEmployeeId) {
        where.employeeId = '00000000-0000-0000-0000-000000000000';
        return { where, startDate, endDate };
      }
      where.employeeId = selfEmployeeId;
    } else if (query.employeeId && query.employeeId !== 'all') {
      where.employeeId = query.employeeId;
    }

    if (query.departmentId && query.departmentId !== 'all') {
      where.employee = {
        ...(where.employee ? (where.employee as any) : {}),
        departmentId: query.departmentId,
      };
    }

    if (query.position && query.position !== 'all') {
      where.employee = {
        ...(where.employee ? (where.employee as any) : {}),
        position: { contains: query.position, mode: 'insensitive' },
      };
    }

    if (query.status && (query.status as string) !== 'all') {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { employee: { firstName: { contains: term, mode: 'insensitive' } } },
        { employee: { lastName: { contains: term, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return { where, startDate, endDate };
  }

  /**
   * Paginated attendance report with multi-filter criteria and 9 KPI summary statistics.
   */
  async getAttendanceReport(query: QueryAttendanceReportDto, user: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const { where, startDate, endDate } = this.buildReportWhere(query, user);

    // Build sorting order
    const orderBy: Prisma.AttendanceOrderByWithRelationInput[] = [];
    if (query.sortBy === 'name') {
      orderBy.push({ employee: { firstName: query.sortOrder === 'desc' ? 'desc' : 'asc' } });
    } else if (query.sortBy === 'checkIn') {
      orderBy.push({ checkIn: query.sortOrder === 'desc' ? 'desc' : 'asc' });
    } else if (query.sortBy === 'checkOut') {
      orderBy.push({ checkOut: query.sortOrder === 'desc' ? 'desc' : 'asc' });
    } else if (query.sortBy === 'status') {
      orderBy.push({ status: query.sortOrder === 'desc' ? 'desc' : 'asc' });
    } else {
      orderBy.push({ attendanceDate: query.sortOrder === 'asc' ? 'asc' : 'desc' });
      orderBy.push({ createdAt: 'desc' });
    }

    // Determine total active employees matching scope
    const employeeCountWhere: Prisma.EmployeeWhereInput = {
      employmentStatus: EmploymentStatus.ACTIVE,
    };
    if (user?.role === UserRole.EMPLOYEE && user.employee?.id) {
      employeeCountWhere.id = user.employee.id;
    } else {
      if (query.employeeId && query.employeeId !== 'all') {
        employeeCountWhere.id = query.employeeId;
      }
      if (query.departmentId && query.departmentId !== 'all') {
        employeeCountWhere.departmentId = query.departmentId;
      }
      if (query.position && query.position !== 'all') {
        employeeCountWhere.position = { contains: query.position, mode: 'insensitive' };
      }
      if (query.search?.trim()) {
        const term = query.search.trim();
        employeeCountWhere.OR = [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { employeeId: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    const [total, summaryGroup, records, totalEmployeesCount, officeSetting] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          shift: {
            select: {
              name: true,
              startTime: true,
              endTime: true,
              toleranceMinutes: true,
            },
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              position: true,
              department: { select: { id: true, name: true } },
              shift: { select: { name: true, startTime: true, endTime: true, toleranceMinutes: true } },
            },
          },
        },
      }),
      this.prisma.employee.count({ where: employeeCountWhere }),
      this.prisma.attendanceSetting.findFirst(),
    ]);

    const totalWorkingDays = this.calculateWorkingDays(startDate, endDate);

    const summary = {
      totalEmployees: totalEmployeesCount,
      totalWorkingDays,
      present: 0,
      late: 0,
      leave: 0,
      sick: 0,
      businessTrip: 0,
      absent: 0,
      totalRecords: total,
    };

    for (const group of summaryGroup) {
      if (group.status === AttendanceStatus.PRESENT) summary.present = group._count.status;
      else if (group.status === AttendanceStatus.LATE) summary.late = group._count.status;
      else if (group.status === AttendanceStatus.LEAVE) summary.leave = group._count.status;
      else if (group.status === AttendanceStatus.SICK) summary.sick = group._count.status;
      else if (group.status === AttendanceStatus.BUSINESS_TRIP) summary.businessTrip = group._count.status;
      else if (group.status === AttendanceStatus.ABSENT) summary.absent = group._count.status;
    }

    const data = records.map((rec) => {
      const activeShift = rec.shift || rec.employee.shift;
      const shiftName = activeShift?.name || 'Standard';
      const scheduledCheckIn = activeShift?.startTime || officeSetting?.workStartTime || '08:00';
      const scheduledCheckOut = activeShift?.endTime || officeSetting?.workEndTime || '17:00';

      let diffMinutes: number | null = null;
      let diffFormatted = '-';
      if (rec.checkIn) {
        const checkInDate = new Date(rec.checkIn);
        const { hour, minute } = getJakartaDateInfo(checkInDate);
        const [schedHour, schedMin] = scheduledCheckIn.split(':').map((v) => parseInt(v, 10));
        const actualMins = hour * 60 + minute;
        const scheduledMins = schedHour * 60 + (schedMin || 0);
        diffMinutes = actualMins - scheduledMins;
        if (diffMinutes > 0) {
          diffFormatted = `+${diffMinutes} menit`;
        } else if (diffMinutes < 0) {
          diffFormatted = `${diffMinutes} menit`;
        } else {
          diffFormatted = 'Tepat waktu';
        }
      }

      return {
        id: rec.id,
        employee: `${rec.employee.firstName} ${rec.employee.lastName}`,
        employeeId: rec.employee.employeeId,
        department: rec.employee.department?.name || 'Umum',
        position: rec.employee.position || '-',
        shift: shiftName,
        scheduledCheckIn,
        scheduledCheckOut,
        diffMinutes,
        diffFormatted,
        date: rec.attendanceDate.toISOString().split('T')[0],
        checkIn: rec.checkIn,
        checkOut: rec.checkOut,
        status: rec.status,
        workingMinutes: rec.workingMinutes,
        notes: rec.notes,
        photoCheckIn: rec.photoCheckIn,
        photoCheckOut: rec.photoCheckOut,
        latitudeCheckIn: rec.latitudeCheckIn,
        longitudeCheckIn: rec.longitudeCheckIn,
        accuracyCheckIn: rec.accuracyCheckIn,
        distanceCheckIn: rec.distanceCheckIn,
        latitudeCheckOut: rec.latitudeCheckOut,
        longitudeCheckOut: rec.longitudeCheckOut,
        accuracyCheckOut: rec.accuracyCheckOut,
        distanceCheckOut: rec.distanceCheckOut,
        setting: officeSetting
          ? {
              locationName: officeSetting.locationName,
              latitude: officeSetting.latitude,
              longitude: officeSetting.longitude,
              radiusMeters: officeSetting.radiusMeters,
            }
          : null,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Monthly attendance recap aggregated per employee.
   * Hadir, Terlambat, Izin, Sakit, Dinas, Cuti, Alpha, Total Hari Kerja.
   */
  async getAttendanceRecap(
    filter: {
      month?: number;
      year?: number;
      employeeId?: string;
      departmentId?: string;
      position?: string;
      status?: string;
      search?: string;
    },
    user: any
  ) {
    const now = new Date();
    const year = filter.year || now.getFullYear();
    const month = filter.month || now.getMonth() + 1; // 1-12

    // Month boundary dates in UTC
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Calculate total working days in this month (excluding weekends)
    const totalWorkingDays = this.calculateWorkingDays(startDate, endDate);

    // Calculate elapsed working days up to today (for accurate Alpha calculation)
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    const effectiveElapsedEnd = endDate < today ? endDate : today;
    const elapsedWorkingDays = this.calculateWorkingDays(startDate, effectiveElapsedEnd);

    // Employee query filter based on role and options
    const employeeWhere: Prisma.EmployeeWhereInput = {
      employmentStatus: EmploymentStatus.ACTIVE,
    };

    if (user?.role === UserRole.EMPLOYEE) {
      const selfEmployeeId = user.employee?.id;
      if (!selfEmployeeId) return { month, year, totalWorkingDays, recap: [] };
      employeeWhere.id = selfEmployeeId;
    } else if (filter.employeeId && filter.employeeId !== 'all') {
      employeeWhere.id = filter.employeeId;
    }

    if (filter.departmentId && filter.departmentId !== 'all') {
      employeeWhere.departmentId = filter.departmentId;
    }

    if (filter.position && filter.position !== 'all') {
      employeeWhere.position = { contains: filter.position, mode: 'insensitive' };
    }

    if (filter.search?.trim()) {
      const term = filter.search.trim();
      employeeWhere.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { employeeId: { contains: term, mode: 'insensitive' } },
      ];
    }

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        position: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
        employeeId: {
          in: employees.map((e) => e.id),
        },
      },
      select: {
        employeeId: true,
        status: true,
        attendanceDate: true,
        notes: true,
      },
    });

    let overallHadir = 0;
    let overallTerlambat = 0;
    let overallIzin = 0;
    let overallSakit = 0;
    let overallDinas = 0;
    let overallCuti = 0;
    let overallAlpha = 0;

    const recap = employees.map((emp) => {
      const empAttendances = attendances.filter((a) => a.employeeId === emp.id);

      let present = 0;
      let late = 0;
      let izin = 0;
      let cuti = 0;
      let sick = 0;
      let businessTrip = 0;
      let recordedAbsent = 0;

      for (const att of empAttendances) {
        if (att.status === AttendanceStatus.PRESENT) present++;
        else if (att.status === AttendanceStatus.LATE) late++;
        else if (att.status === AttendanceStatus.LEAVE) {
          // Check notes to distinguish Izin vs Cuti
          if (att.notes?.toLowerCase().includes('cuti')) {
            cuti++;
          } else {
            izin++;
          }
        } else if (att.status === AttendanceStatus.SICK) sick++;
        else if (att.status === AttendanceStatus.BUSINESS_TRIP) businessTrip++;
        else if (att.status === AttendanceStatus.ABSENT) recordedAbsent++;
      }

      // Calculate unexcused absent based on elapsed working days minus total recorded productive/excused days
      const totalAccountedDays = present + late + izin + cuti + sick + businessTrip + recordedAbsent;
      const unexcusedDays = Math.max(0, elapsedWorkingDays - totalAccountedDays);
      const absent = recordedAbsent + unexcusedDays;

      overallHadir += present;
      overallTerlambat += late;
      overallIzin += izin;
      overallCuti += cuti;
      overallSakit += sick;
      overallDinas += businessTrip;
      overallAlpha += absent;

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name || 'General',
        position: emp.position,
        present,
        late,
        izin,
        cuti,
        sick,
        businessTrip,
        absent,
        totalWorkingDays,
        totalLogged: empAttendances.length,
      };
    });

    return {
      month,
      year,
      totalEmployees: employees.length,
      totalWorkingDays,
      elapsedWorkingDays,
      summary: {
        totalEmployees: employees.length,
        totalWorkingDays,
        hadir: overallHadir,
        terlambat: overallTerlambat,
        izin: overallIzin,
        cuti: overallCuti,
        sakit: overallSakit,
        dinas: overallDinas,
        alpha: overallAlpha,
      },
      recap,
    };
  }

  /**
   * Aggregated statistics grouped by department / unit kerja.
   */
  async getDepartmentRecap(query: QueryAttendanceReportDto, user: any) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const totalWorkingDays = this.calculateWorkingDays(startDate, endDate);

    const departments = await this.prisma.department.findMany({
      include: {
        employees: {
          where: { employmentStatus: EmploymentStatus.ACTIVE },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        employeeId: true,
        status: true,
        notes: true,
      },
    });

    const results = departments.map((dept) => {
      const empIds = new Set(dept.employees.map((e) => e.id));
      const deptAttendances = attendances.filter((a) => empIds.has(a.employeeId));

      let present = 0;
      let late = 0;
      let izin = 0;
      let cuti = 0;
      let sick = 0;
      let businessTrip = 0;
      let absent = 0;

      for (const att of deptAttendances) {
        if (att.status === AttendanceStatus.PRESENT) present++;
        else if (att.status === AttendanceStatus.LATE) late++;
        else if (att.status === AttendanceStatus.LEAVE) {
          if (att.notes?.toLowerCase().includes('cuti')) cuti++;
          else izin++;
        } else if (att.status === AttendanceStatus.SICK) sick++;
        else if (att.status === AttendanceStatus.BUSINESS_TRIP) businessTrip++;
        else if (att.status === AttendanceStatus.ABSENT) absent++;
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalEmployees: dept.employees.length,
        totalWorkingDays,
        present,
        late,
        izin,
        cuti,
        sick,
        businessTrip,
        absent,
      };
    });

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      departments: results,
    };
  }

  /**
   * Generates daily trend counts across the date range for charts.
   */
  async getAttendanceTrend(query: QueryAttendanceReportDto, user: any) {
    const { where, startDate, endDate } = this.buildReportWhere(query, user);

    const attendances = await this.prisma.attendance.findMany({
      where,
      select: {
        attendanceDate: true,
        status: true,
        notes: true,
      },
      orderBy: { attendanceDate: 'asc' },
    });

    // Create a continuous date map
    const dateMap = new Map<
      string,
      {
        present: number;
        late: number;
        izin: number;
        cuti: number;
        sick: number;
        businessTrip: number;
        absent: number;
      }
    >();

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dStr = cur.toISOString().split('T')[0];
      dateMap.set(dStr, {
        present: 0,
        late: 0,
        izin: 0,
        cuti: 0,
        sick: 0,
        businessTrip: 0,
        absent: 0,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    for (const att of attendances) {
      const dStr = att.attendanceDate.toISOString().split('T')[0];
      const entry = dateMap.get(dStr);
      if (entry) {
        if (att.status === AttendanceStatus.PRESENT) entry.present++;
        else if (att.status === AttendanceStatus.LATE) entry.late++;
        else if (att.status === AttendanceStatus.LEAVE) {
          if (att.notes?.toLowerCase().includes('cuti')) entry.cuti++;
          else entry.izin++;
        } else if (att.status === AttendanceStatus.SICK) entry.sick++;
        else if (att.status === AttendanceStatus.BUSINESS_TRIP) entry.businessTrip++;
        else if (att.status === AttendanceStatus.ABSENT) entry.absent++;
      }
    }

    const data = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      trend: data,
    };
  }

  /**
   * Generates downloadable CSV content matching active report filters for daily logs.
   * Includes UTF-8 BOM (\uFEFF) for native Excel compatibility.
   */
  async exportAttendanceCsv(query: QueryAttendanceReportDto, user: any): Promise<string> {
    const { where } = this.buildReportWhere(query, user);

    const records = await this.prisma.attendance.findMany({
      where,
      orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            position: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    const headers = [
      'No',
      'Tanggal',
      'Nama Karyawan',
      'NIP / ID',
      'Jabatan',
      'Unit Kerja',
      'Jam Masuk (WIB)',
      'Jam Pulang (WIB)',
      'Status',
      'Jarak dari Kantor (Meter)',
      'Durasi Kerja (Menit)',
      'Keterangan',
    ];

    const formatCsvField = (field: any): string => {
      if (field === null || field === undefined) return '""';
      const stringValue = String(field).replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    const formatWib = (date?: Date | null): string => {
      if (!date) return '—';
      return (
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(date) + ' WIB'
      );
    };

    const rows = records.map((rec, index) => {
      const no = index + 1;
      const date = rec.attendanceDate.toISOString().split('T')[0];
      const name = `${rec.employee.firstName} ${rec.employee.lastName}`;
      const empId = rec.employee.employeeId;
      const pos = rec.employee.position || 'Staff';
      const dept = rec.employee.department?.name || 'General';
      const checkIn = formatWib(rec.checkIn);
      const checkOut = formatWib(rec.checkOut);
      const status = rec.status;
      const distance =
        rec.distanceCheckIn !== null && rec.distanceCheckIn !== undefined
          ? `${rec.distanceCheckIn} m`
          : '—';
      const minutes = rec.workingMinutes ?? '—';
      const notes = rec.notes || '—';

      return [
        formatCsvField(no),
        formatCsvField(date),
        formatCsvField(name),
        formatCsvField(empId),
        formatCsvField(pos),
        formatCsvField(dept),
        formatCsvField(checkIn),
        formatCsvField(checkOut),
        formatCsvField(status),
        formatCsvField(distance),
        formatCsvField(minutes),
        formatCsvField(notes),
      ].join(',');
    });

    return '\uFEFF' + [headers.map(formatCsvField).join(','), ...rows].join('\r\n');
  }

  /**
   * Generates downloadable CSV for monthly per-employee recap.
   */
  async exportRecapCsv(
    filter: {
      month?: number;
      year?: number;
      departmentId?: string;
      position?: string;
      search?: string;
    },
    user: any
  ): Promise<string> {
    const recapResult = await this.getAttendanceRecap(filter, user);

    const headers = [
      'No',
      'Nama Karyawan',
      'NIP / ID',
      'Unit Kerja',
      'Jabatan',
      'Hadir',
      'Terlambat',
      'Izin',
      'Cuti',
      'Sakit',
      'Dinas',
      'Alpha',
      'Total Hari Kerja',
    ];

    const formatCsvField = (field: any): string => {
      if (field === null || field === undefined) return '""';
      const stringValue = String(field).replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    const rows = recapResult.recap.map((emp, index) => {
      return [
        formatCsvField(index + 1),
        formatCsvField(emp.name),
        formatCsvField(emp.employeeId),
        formatCsvField(emp.department),
        formatCsvField(emp.position || 'Staff'),
        formatCsvField(emp.present),
        formatCsvField(emp.late),
        formatCsvField(emp.izin),
        formatCsvField(emp.cuti),
        formatCsvField(emp.sick),
        formatCsvField(emp.businessTrip),
        formatCsvField(emp.absent),
        formatCsvField(emp.totalWorkingDays),
      ].join(',');
    });

    return '\uFEFF' + [headers.map(formatCsvField).join(','), ...rows].join('\r\n');
  }

  /**
   * Individual employee attendance analytics report.
   */
  async getEmployeeReport(
    employeeId: string,
    startDateStr?: string,
    endDateStr?: string,
    user?: any
  ) {
    if (user?.role === UserRole.EMPLOYEE && user.employee?.id !== employeeId) {
      throw new ForbiddenException('You can only access your own individual report');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        shift: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID '${employeeId}' not found`);
    }

    const where: Prisma.AttendanceWhereInput = {
      employeeId,
    };

    let startDate: Date;
    let endDate: Date;

    if (startDateStr || endDateStr) {
      where.attendanceDate = {};
      if (startDateStr) {
        startDate = parseJakartaDateString(startDateStr);
        where.attendanceDate.gte = startDate;
      } else {
        startDate = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
      }
      if (endDateStr) {
        endDate = parseJakartaDateString(endDateStr);
        where.attendanceDate.lte = endDate;
      } else {
        endDate = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 1, 0));
      }
    } else {
      startDate = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
      endDate = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 1, 0));
      where.attendanceDate = { gte: startDate, lte: endDate };
    }

    const records = await this.prisma.attendance.findMany({
      where,
      orderBy: { attendanceDate: 'desc' },
      select: {
        id: true,
        attendanceDate: true,
        checkIn: true,
        checkOut: true,
        status: true,
        workingMinutes: true,
        notes: true,
        distanceCheckIn: true,
        accuracyCheckIn: true,
        photoCheckIn: true,
        photoCheckOut: true,
      },
    });

    const attendance = {
      present: 0,
      late: 0,
      izin: 0,
      cuti: 0,
      sick: 0,
      businessTrip: 0,
      absent: 0,
    };

    let totalWorkingMinutes = 0;

    for (const rec of records) {
      if (rec.status === AttendanceStatus.PRESENT) attendance.present++;
      else if (rec.status === AttendanceStatus.LATE) attendance.late++;
      else if (rec.status === AttendanceStatus.LEAVE) {
        if (rec.notes?.toLowerCase().includes('cuti')) attendance.cuti++;
        else attendance.izin++;
      } else if (rec.status === AttendanceStatus.SICK) attendance.sick++;
      else if (rec.status === AttendanceStatus.BUSINESS_TRIP) attendance.businessTrip++;
      else if (rec.status === AttendanceStatus.ABSENT) attendance.absent++;

      if (rec.workingMinutes) {
        totalWorkingMinutes += rec.workingMinutes;
      }
    }

    const totalWorkingDays = this.calculateWorkingDays(startDate, endDate);

    return {
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name,
        position: employee.position,
        shift: employee.shift?.name,
      },
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      totalWorkingDays,
      attendance,
      workingMinutes: totalWorkingMinutes,
      records: records.map((r) => ({
        ...r,
        date: r.attendanceDate.toISOString().split('T')[0],
      })),
    };
  }

  /**
   * Get overtime report with multi-filter criteria and summary metrics.
   */
  async getOvertimeReport(query: any, user: any) {
    const where: Prisma.OvertimeRequestWhereInput = {};

    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        throw new ForbiddenException('Profil karyawan tidak ditemukan');
      }
      where.employeeId = user.employee.id;
    } else {
      if (query.employeeId) {
        where.employeeId = query.employeeId;
      }
      if (query.departmentId) {
        where.employee = { departmentId: query.departmentId };
      }
    }

    if (query.status) {
      where.status = query.status as OvertimeStatus;
    }

    if (query.startDate || query.endDate) {
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

    const records = await this.prisma.overtimeRequest.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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
        approver: {
          select: { id: true, email: true, role: true },
        },
        schedule: {
          include: { shift: true },
        },
        attendance: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            workingMinutes: true,
          },
        },
      },
    });

    let totalApprovedMinutes = 0;
    let totalRequestedMinutes = 0;
    let totalActualMinutes = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    for (const rec of records) {
      totalRequestedMinutes += rec.requestedMinutes;
      if (rec.status === OvertimeStatus.APPROVED) {
        approvedCount++;
        totalApprovedMinutes += rec.approvedMinutes || 0;
      } else if (rec.status === OvertimeStatus.PENDING) {
        pendingCount++;
      } else if (rec.status === OvertimeStatus.REJECTED) {
        rejectedCount++;
      }
      if (rec.actualMinutes) {
        totalActualMinutes += rec.actualMinutes;
      }
    }

    return {
      summary: {
        totalRequests: records.length,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalRequestedMinutes,
        totalApprovedMinutes,
        totalActualMinutes,
      },
      records: records.map((r) => ({
        ...r,
        dateFormatted: r.date.toISOString().split('T')[0],
      })),
    };
  }

  /**
   * Export overtime report as CSV.
   */
  async exportOvertimeCsv(query: any, user: any): Promise<string> {
    const { records } = await this.getOvertimeReport(query, user);

    const headers = [
      'No',
      'Nama Karyawan',
      'NIP',
      'Departemen',
      'Jabatan',
      'Tanggal',
      'Shift',
      'Jam Rencana',
      'Jam Aktual',
      'Menit Diajukan',
      'Menit Disetujui',
      'Menit Aktual',
      'Status',
      'Alasan',
      'Disetujui Oleh',
    ];

    const rows = records.map((r: any, idx: number) => {
      const shiftName = r.schedule?.shift?.name || '-';
      const planned = `${r.plannedStartTime} - ${r.plannedEndTime}`;
      const actual = r.actualStartTime && r.actualEndTime ? `${r.actualStartTime} - ${r.actualEndTime}` : '-';
      const approverEmail = r.approver?.email || '-';

      return [
        idx + 1,
        `"${(r.employee.firstName + ' ' + r.employee.lastName).replace(/"/g, '""')}"`,
        `"${r.employee.employeeId}"`,
        `"${(r.employee.department?.name || '-').replace(/"/g, '""')}"`,
        `"${(r.employee.position || '-').replace(/"/g, '""')}"`,
        r.dateFormatted,
        `"${shiftName.replace(/"/g, '""')}"`,
        `"${planned}"`,
        `"${actual}"`,
        r.requestedMinutes,
        r.approvedMinutes ?? '-',
        r.actualMinutes ?? '-',
        r.status,
        `"${(r.reason || '').replace(/"/g, '""')}"`,
        `"${approverEmail}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Comprehensive HR Analytics Aggregation Engine across all 9 Pillars
   */
  async getComprehensiveAnalytics(query: any, user: any) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();

    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate + 'T00:00:00.000Z');
      endDate = new Date(query.endDate + 'T23:59:59.999Z');
    } else if (query.period === 'last_month') {
      startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
    } else if (query.period === 'last_3_months') {
      startDate = new Date(Date.UTC(currentYear, currentMonth - 2, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
    } else if (query.period === 'year_to_date') {
      startDate = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
    } else {
      startDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
    }

    const isEmployee = user?.role === UserRole.EMPLOYEE;
    const selfEmployeeId = user?.employee?.id;

    if (isEmployee && !selfEmployeeId) {
      throw new ForbiddenException('Employee profile not linked to user account');
    }

    // Role-specific scoping:
    if (isEmployee) {
      const [
        employee,
        attendances,
        leaveRequests,
        overtimeRequests,
        payrollRecords,
        reimbursements,
      ] = await Promise.all([
        this.prisma.employee.findUnique({
          where: { id: selfEmployeeId },
          include: { department: true, shift: true },
        }),
        this.prisma.attendance.findMany({
          where: {
            employeeId: selfEmployeeId,
            attendanceDate: { gte: startDate, lte: endDate },
          },
          orderBy: { attendanceDate: 'asc' },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            employeeId: selfEmployeeId,
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
          include: { leaveType: true },
        }),
        this.prisma.overtimeRequest.findMany({
          where: {
            employeeId: selfEmployeeId,
            date: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.payrollRecord.findMany({
          where: {
            employeeId: selfEmployeeId,
          },
          include: { payrollPeriod: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        this.prisma.reimbursementRequest.findMany({
          where: {
            employeeId: selfEmployeeId,
            date: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      const totalAttendance = attendances.length;
      const presentCount = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
      const lateCount = attendances.filter((a) => a.status === AttendanceStatus.LATE).length;
      const absentCount = attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
      const leaveCount = attendances.filter((a) => a.status === AttendanceStatus.LEAVE).length;
      const sickCount = attendances.filter((a) => a.status === AttendanceStatus.SICK).length;
      const businessTripCount = attendances.filter((a) => a.status === AttendanceStatus.BUSINESS_TRIP).length;

      const totalWorkMinutes = attendances.reduce((acc, a) => acc + (a.workingMinutes || 0), 0);
      const attendanceRate = totalAttendance > 0 ? Math.round(((presentCount + lateCount) / totalAttendance) * 100) : 0;
      const punctualityRate = presentCount + lateCount > 0 ? Math.round((presentCount / (presentCount + lateCount)) * 100) : 0;

      const totalApprovedOvertimeMins = overtimeRequests
        .filter((o) => o.status === OvertimeStatus.APPROVED || o.status === OvertimeStatus.COMPLETED)
        .reduce((acc, o) => acc + (o.approvedMinutes || o.requestedMinutes || 0), 0);

      const totalReimbursementAmount = reimbursements.reduce((acc, r) => acc + Number(r.amount), 0);
      const paidReimbursementAmount = reimbursements
        .filter((r) => r.status === 'PAID')
        .reduce((acc, r) => acc + Number(r.amount), 0);

      return {
        isEmployee: true,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        employee: {
          id: employee?.id,
          name: `${employee?.firstName} ${employee?.lastName}`,
          employeeId: employee?.employeeId,
          department: employee?.department?.name,
          position: employee?.position,
          shift: employee?.shift?.name,
        },
        attendance: {
          totalLogged: totalAttendance,
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          leave: leaveCount,
          sick: sickCount,
          businessTrip: businessTripCount,
          totalWorkHours: Math.round(totalWorkMinutes / 60),
          attendanceRate,
          punctualityRate,
        },
        leave: {
          totalRequests: leaveRequests.length,
          approved: leaveRequests.filter((l) => l.status === 'APPROVED').length,
          pending: leaveRequests.filter((l) => l.status === 'PENDING').length,
          rejected: leaveRequests.filter((l) => l.status === 'REJECTED').length,
        },
        overtime: {
          totalRequests: overtimeRequests.length,
          approvedHours: (totalApprovedOvertimeMins / 60).toFixed(1),
          pendingRequests: overtimeRequests.filter((o) => o.status === OvertimeStatus.PENDING).length,
        },
        payroll: {
          latestSalary: payrollRecords[0]?.netSalary ? Number(payrollRecords[0].netSalary) : 0,
          records: payrollRecords.map((p) => ({
            id: p.id,
            periodName: p.payrollPeriod.name,
            netSalary: Number(p.netSalary),
            status: p.status,
            payDate: p.paidAt,
          })),
        },
        reimbursement: {
          totalRequests: reimbursements.length,
          totalAmount: totalReimbursementAmount,
          paidAmount: paidReimbursementAmount,
          pendingAmount: reimbursements
            .filter((r) => r.status === 'SUBMITTED' || r.status === 'APPROVED')
            .reduce((acc, r) => acc + Number(r.amount), 0),
        },
        performance: {
          score: Math.max(0, Math.min(100, Math.round(attendanceRate * 0.6 + punctualityRate * 0.4))),
          rating: attendanceRate >= 90 ? 'A (Excellent)' : attendanceRate >= 75 ? 'B (Good)' : 'C (Needs Attention)',
        },
      };
    }

    // ADMIN / HR Scope
    const deptFilter = query.departmentId && query.departmentId !== 'all' ? query.departmentId : undefined;
    const employeeDeptWhere = deptFilter ? { departmentId: deptFilter } : {};

    const [
      allEmployees,
      departments,
      attendances,
      leaveRequests,
      shifts,
      overtimeRequests,
      payrollRecords,
      reimbursements,
      jobVacancies,
      applicants,
    ] = await Promise.all([
      this.prisma.employee.findMany({
        where: employeeDeptWhere,
        include: { department: true, shift: true },
      }),
      this.prisma.department.findMany({
        include: {
          employees: true,
        },
      }),
      this.prisma.attendance.findMany({
        where: {
          attendanceDate: { gte: startDate, lte: endDate },
          ...(deptFilter ? { employee: { departmentId: deptFilter } } : {}),
        },
        include: {
          employee: {
            select: { id: true, departmentId: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          ...(deptFilter ? { employee: { departmentId: deptFilter } } : {}),
        },
        include: {
          leaveType: true,
          employee: { select: { departmentId: true } },
        },
      }),
      this.prisma.shift.findMany({
        include: {
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.overtimeRequest.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(deptFilter ? { employee: { departmentId: deptFilter } } : {}),
        },
        include: { employee: { select: { departmentId: true } } },
      }),
      this.prisma.payrollRecord.findMany({
        where: {
          ...(deptFilter ? { employee: { departmentId: deptFilter } } : {}),
        },
        include: { payrollPeriod: true, employee: { select: { departmentId: true } } },
      }),
      this.prisma.reimbursementRequest.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(deptFilter ? { employee: { departmentId: deptFilter } } : {}),
        },
        include: { employee: { select: { departmentId: true } } },
      }),
      this.prisma.jobVacancy.findMany({
        where: {
          ...(deptFilter ? { departmentId: deptFilter } : {}),
        },
      }),
      this.prisma.applicant.findMany({
        where: {
          ...(deptFilter ? { jobVacancy: { departmentId: deptFilter } } : {}),
        },
        include: { jobVacancy: true },
      }),
    ]);

    // 1. Employee Overview
    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter((e) => e.employmentStatus === EmploymentStatus.ACTIVE).length;
    const inactiveEmployees = allEmployees.filter((e) => e.employmentStatus === EmploymentStatus.INACTIVE).length;
    const onLeaveEmployees = allEmployees.filter((e) => e.employmentStatus === EmploymentStatus.ON_LEAVE).length;

    // 2. Attendance Aggregation
    const totalAttendanceRows = attendances.length;
    const presentCount = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const lateCount = attendances.filter((a) => a.status === AttendanceStatus.LATE).length;
    const absentCount = attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const leaveCount = attendances.filter((a) => a.status === AttendanceStatus.LEAVE).length;
    const sickCount = attendances.filter((a) => a.status === AttendanceStatus.SICK).length;
    const businessTripCount = attendances.filter((a) => a.status === AttendanceStatus.BUSINESS_TRIP).length;

    const totalPresentLate = presentCount + lateCount;
    const attendanceRate = totalAttendanceRows > 0 ? Math.round((totalPresentLate / totalAttendanceRows) * 100) : 0;
    const punctualityRate = totalPresentLate > 0 ? Math.round((presentCount / totalPresentLate) * 100) : 0;
    const lateRate = totalPresentLate > 0 ? Math.round((lateCount / totalPresentLate) * 100) : 0;
    const absentRate = totalAttendanceRows > 0 ? Math.round((absentCount / totalAttendanceRows) * 100) : 0;

    // Attendance Daily Trend
    const trendMap = new Map<string, { date: string; present: number; late: number; absent: number; total: number }>();
    attendances.forEach((a) => {
      const dStr = a.attendanceDate.toISOString().split('T')[0];
      if (!trendMap.has(dStr)) {
        trendMap.set(dStr, { date: dStr, present: 0, late: 0, absent: 0, total: 0 });
      }
      const entry = trendMap.get(dStr)!;
      entry.total++;
      if (a.status === AttendanceStatus.PRESENT) entry.present++;
      else if (a.status === AttendanceStatus.LATE) entry.late++;
      else if (a.status === AttendanceStatus.ABSENT) entry.absent++;
    });
    const attendanceTrends = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Leave Analytics
    const leaveStatusMap = {
      approved: leaveRequests.filter((l) => l.status === 'APPROVED').length,
      pending: leaveRequests.filter((l) => l.status === 'PENDING').length,
      rejected: leaveRequests.filter((l) => l.status === 'REJECTED').length,
    };
    const totalApprovedLeaveDays = leaveRequests
      .filter((l) => l.status === 'APPROVED')
      .reduce((acc, l) => acc + (l.duration || 1), 0);

    const leaveTypeCounts: Record<string, number> = {};
    leaveRequests.forEach((l) => {
      const typeName = l.leaveType?.name || 'LAINNYA';
      leaveTypeCounts[typeName] = (leaveTypeCounts[typeName] || 0) + 1;
    });

    // 4. Overtime Analytics
    const totalOvertimeRequests = overtimeRequests.length;
    const approvedOvertimeCount = overtimeRequests.filter((o) => o.status === OvertimeStatus.APPROVED || o.status === OvertimeStatus.COMPLETED).length;
    const pendingOvertimeCount = overtimeRequests.filter((o) => o.status === OvertimeStatus.PENDING).length;
    const rejectedOvertimeCount = overtimeRequests.filter((o) => o.status === OvertimeStatus.REJECTED).length;

    const totalApprovedOvertimeMins = overtimeRequests
      .filter((o) => o.status === OvertimeStatus.APPROVED || o.status === OvertimeStatus.COMPLETED)
      .reduce((acc, o) => acc + (o.approvedMinutes || o.requestedMinutes || 0), 0);

    // 5. Payroll Financial Summary
    const totalBasicSalary = payrollRecords.reduce((acc, p) => acc + Number(p.basicSalary || 0), 0);
    const totalAllowances = payrollRecords.reduce((acc, p) => acc + Number(p.allowances || 0), 0);
    const totalDeductions = payrollRecords.reduce((acc, p) => acc + Number(p.deductions || 0), 0);
    const totalOvertimePay = payrollRecords.reduce((acc, p) => acc + Number(p.overtimePay || 0), 0);
    const totalNetPaid = payrollRecords.reduce((acc, p) => acc + Number(p.netSalary || 0), 0);
    const totalGrossPaid = totalBasicSalary + totalAllowances + totalOvertimePay;
    const avgNetSalary = payrollRecords.length > 0 ? Math.round(totalNetPaid / payrollRecords.length) : 0;

    // 6. Reimbursement Financial Analytics
    const reimbursementTotalAmount = reimbursements.reduce((acc, r) => acc + Number(r.amount), 0);
    const reimbursementApprovedAmount = reimbursements
      .filter((r) => r.status === 'APPROVED' || r.status === 'PAID')
      .reduce((acc, r) => acc + Number(r.amount), 0);
    const reimbursementPaidAmount = reimbursements
      .filter((r) => r.status === 'PAID')
      .reduce((acc, r) => acc + Number(r.amount), 0);
    const reimbursementPendingAmount = reimbursements
      .filter((r) => r.status === 'SUBMITTED')
      .reduce((acc, r) => acc + Number(r.amount), 0);

    const reimbursementCategoryMap: Record<string, number> = {};
    reimbursements.forEach((r) => {
      reimbursementCategoryMap[r.category] = (reimbursementCategoryMap[r.category] || 0) + Number(r.amount);
    });

    // 7. Recruitment Funnel Analytics
    const totalVacancies = jobVacancies.length;
    const activeVacancies = jobVacancies.filter((v) => v.status === 'OPEN').length;
    const totalApplicants = applicants.length;

    const applicantStages = {
      applied: applicants.filter((a) => a.currentStage === 'APPLIED').length,
      screening: applicants.filter((a) => a.currentStage === 'SCREENING').length,
      interview: applicants.filter((a) => a.currentStage === 'INTERVIEW').length,
      selected: applicants.filter((a) => a.currentStage === 'SELECTED').length,
      hired: applicants.filter((a) => a.currentStage === 'HIRED').length,
      rejected: applicants.filter((a) => a.currentStage === 'REJECTED').length,
    };
    const hiringConversionRate = totalApplicants > 0 ? Math.round((applicantStages.hired / totalApplicants) * 100) : 0;

    // 8. KPI / Performance Index
    const consistencyScore = Math.max(0, Math.min(100, Math.round(attendanceRate * 0.6 + punctualityRate * 0.4)));
    const performanceRating =
      consistencyScore >= 90
        ? 'A (Excellent)'
        : consistencyScore >= 80
        ? 'B (Good)'
        : consistencyScore >= 70
        ? 'C (Satisfactory)'
        : 'D (Needs Improvement)';

    // 9. Department Breakdown Table
    const departmentBreakdown = departments.map((dept) => {
      const deptEmployees = allEmployees.filter((e) => e.departmentId === dept.id);
      const deptAttendances = attendances.filter((a) => a.employee.departmentId === dept.id);
      const deptPresent = deptAttendances.filter((a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
      const deptLate = deptAttendances.filter((a) => a.status === AttendanceStatus.LATE).length;
      const deptAbsent = deptAttendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
      const deptAttRate = deptAttendances.length > 0 ? Math.round((deptPresent / deptAttendances.length) * 100) : 0;

      const deptOvertimeMins = overtimeRequests
        .filter((o) => o.employee?.departmentId === dept.id && (o.status === OvertimeStatus.APPROVED || o.status === OvertimeStatus.COMPLETED))
        .reduce((acc, o) => acc + (o.approvedMinutes || o.requestedMinutes || 0), 0);

      const deptPayroll = payrollRecords
        .filter((p) => p.employee.departmentId === dept.id)
        .reduce((acc, p) => acc + Number(p.netSalary || 0), 0);

      const deptReimbursement = reimbursements
        .filter((r) => r.employee.departmentId === dept.id)
        .reduce((acc, r) => acc + Number(r.amount || 0), 0);

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        employeeCount: deptEmployees.length,
        totalAttendance: deptAttendances.length,
        presentCount: deptPresent,
        lateCount: deptLate,
        absentCount: deptAbsent,
        attendanceRate: deptAttRate,
        overtimeHours: (deptOvertimeMins / 60).toFixed(1),
        payrollTotal: deptPayroll,
        reimbursementTotal: deptReimbursement,
      };
    });

    // 10. Shifts Distribution
    const shiftDistribution = shifts.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      workingHours: `${s.startTime} - ${s.endTime}`,
      employeeCount: s._count.employees,
    }));

    return {
      isEmployee: false,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      filter: {
        departmentId: deptFilter || 'all',
      },
      headcount: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        onLeave: onLeaveEmployees,
      },
      attendance: {
        totalRecords: totalAttendanceRows,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        leave: leaveCount,
        sick: sickCount,
        businessTrip: businessTripCount,
        attendanceRate,
        punctualityRate,
        lateRate,
        absentRate,
        dailyTrends: attendanceTrends,
      },
      leave: {
        totalRequests: leaveRequests.length,
        approvedDays: totalApprovedLeaveDays,
        status: leaveStatusMap,
        typeDistribution: leaveTypeCounts,
      },
      shifts: shiftDistribution,
      overtime: {
        totalRequests: totalOvertimeRequests,
        approvedCount: approvedOvertimeCount,
        pendingCount: pendingOvertimeCount,
        rejectedCount: rejectedOvertimeCount,
        approvedHours: (totalApprovedOvertimeMins / 60).toFixed(1),
        totalApprovedMinutes: totalApprovedOvertimeMins,
      },
      payroll: {
        totalRecords: payrollRecords.length,
        totalGrossPaid,
        totalNetPaid,
        totalAllowances,
        totalDeductions,
        totalOvertimePay,
        averageNetSalary: avgNetSalary,
      },
      reimbursement: {
        totalRequests: reimbursements.length,
        totalAmount: reimbursementTotalAmount,
        approvedAmount: reimbursementApprovedAmount,
        paidAmount: reimbursementPaidAmount,
        pendingAmount: reimbursementPendingAmount,
        categories: reimbursementCategoryMap,
      },
      recruitment: {
        totalVacancies,
        activeVacancies,
        totalApplicants,
        funnel: applicantStages,
        conversionRate: hiringConversionRate,
      },
      performance: {
        consistencyScore,
        rating: performanceRating,
        punctualityRate,
        attendanceRate,
      },
      departmentBreakdown,
    };
  }
}

