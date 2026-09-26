import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, EmploymentStatus, Prisma, UserRole } from '@prisma/client';
import {
  getJakartaDateInfo,
  parseJakartaDateString,
} from '../attendance/attendance.time.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregated dashboard summary.
   * Admin/HR: company-wide statistics.
   * Employee: personal statistics for current month and today's status.
   */
  async getSummary(user: any) {
    const { year, month, attendanceDate } = getJakartaDateInfo();

    if (user.role === UserRole.EMPLOYEE) {
      let employeeId = user.employee?.id;
      if (!employeeId && user?.id) {
        const matchedEmployee = await this.prisma.employee.findFirst({
          where: {
            OR: [
              { userId: user.id },
              ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
            ],
          },
          select: { id: true, userId: true },
        });

        if (matchedEmployee) {
          employeeId = matchedEmployee.id;
          if (!matchedEmployee.userId || matchedEmployee.userId !== user.id) {
            await this.prisma.employee
              .update({
                where: { id: matchedEmployee.id },
                data: { userId: user.id },
              })
              .catch(() => {});
          }
        }
      }

      if (!employeeId) {
        return {
          isEmployee: true,
          attendanceThisMonth: 0,
          lateThisMonth: 0,
          leaveThisMonth: 0,
          workingMinutesThisMonth: 0,
          todayAttendance: null,
          currentShift: null,
        };
      }

      // First day of current month (UTC midnight for Prisma date matching)
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      // Last day of current month
      const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const [monthAttendances, todayAttendance, employee] = await Promise.all([
        this.prisma.attendance.findMany({
          where: {
            employeeId,
            attendanceDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            status: true,
            workingMinutes: true,
          },
        }),
        this.prisma.attendance.findUnique({
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
        }),
        this.prisma.employee.findUnique({
          where: { id: employeeId },
          select: {
            shift: {
              select: {
                id: true,
                name: true,
                startTime: true,
                endTime: true,
                breakMinutes: true,
                status: true,
              },
            },
          },
        }),
      ]);

      // Resolve active shift for today: EmployeeSchedule -> employee.shift
      const activeSchedule = await this.prisma.employeeSchedule.findFirst({
        where: {
          employeeId,
          status: 'ACTIVE',
          startDate: { lte: attendanceDate },
          endDate: { gte: attendanceDate },
        },
        include: { shift: true },
      });

      const activeShift = activeSchedule?.shift || employee?.shift || null;
      const currentShift = activeShift
        ? {
            id: activeShift.id,
            name: activeShift.name,
            code: (activeShift as any).code || null,
            startTime: activeShift.startTime,
            endTime: activeShift.endTime,
            breakMinutes: activeShift.breakMinutes,
            toleranceMinutes: (activeShift as any).toleranceMinutes ?? 15,
            isOvernight: (activeShift as any).isOvernight ?? false,
            workDays: (activeShift as any).workDays ?? '1,2,3,4,5',
            status: activeShift.status,
            attendanceStatusToday: todayAttendance?.checkIn ? 'SUDAH ABSEN' : 'BELUM ABSEN',
          }
        : null;

      let attendanceThisMonth = 0;
      let lateThisMonth = 0;
      let leaveThisMonth = 0;
      let workingMinutesThisMonth = 0;

      for (const record of monthAttendances) {
        if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE) {
          attendanceThisMonth++;
        }
        if (record.status === AttendanceStatus.LATE) {
          lateThisMonth++;
        }
        if (record.status === AttendanceStatus.LEAVE) {
          leaveThisMonth++;
        }
        if (record.workingMinutes) {
          workingMinutesThisMonth += record.workingMinutes;
        }
      }

      // Overtime statistics for current month
      const employeeOvertimes = await this.prisma.overtimeRequest.findMany({
        where: {
          employeeId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          status: true,
          approvedMinutes: true,
        },
      });

      let overtimeThisMonth = employeeOvertimes.length;
      let pendingOvertime = 0;
      let approvedOvertimeMinutes = 0;

      for (const ot of employeeOvertimes) {
        if (ot.status === 'PENDING') pendingOvertime++;
        if (ot.status === 'APPROVED' && ot.approvedMinutes) {
          approvedOvertimeMinutes += ot.approvedMinutes;
        }
      }

      const officeSetting = await this.prisma.attendanceSetting.findFirst();

      return {
        isEmployee: true,
        attendanceThisMonth,
        lateThisMonth,
        leaveThisMonth,
        workingMinutesThisMonth,
        todayAttendance,
        currentShift,
        overtimeThisMonth,
        pendingOvertime,
        approvedOvertimeMinutes,
        officeSetting: officeSetting
          ? {
              locationName: officeSetting.locationName,
              latitude: officeSetting.latitude,
              longitude: officeSetting.longitude,
              radiusMeters: officeSetting.radiusMeters,
              workStartTime: officeSetting.workStartTime,
              toleranceMinutes: officeSetting.toleranceMinutes,
              workEndTime: officeSetting.workEndTime,
            }
          : null,
      };
    }

    // ADMIN & HR: Company-wide metrics
    const totalEmployees = await this.prisma.employee
      .count({ where: { employmentStatus: EmploymentStatus.ACTIVE } })
      .catch(() => 0);

    const attendancesToday = await this.prisma.attendance
      .findMany({
        where: { attendanceDate },
        select: { status: true },
      })
      .catch(() => []);

    let pendingOvertime = 0;
    let approvedOvertimes: any[] = [];
    let overtimeRequestsCount = 0;

    try {
      const [pending, approved, totalCount] = await Promise.all([
        this.prisma.overtimeRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.overtimeRequest.findMany({
          where: { status: 'APPROVED' },
          select: { approvedMinutes: true },
        }),
        this.prisma.overtimeRequest.count(),
      ]);
      pendingOvertime = pending;
      approvedOvertimes = approved;
      overtimeRequestsCount = totalCount;
    } catch (otError) {
      console.warn('[DASHBOARD_OVERTIME_QUERY_WARN] Overtime tables not yet queryable:', otError);
    }

    const approvedOvertime = approvedOvertimes.length;
    const totalOvertimeMinutes = approvedOvertimes.reduce(
      (acc: number, curr: { approvedMinutes: number | null }) => acc + (curr.approvedMinutes || 0),
      0,
    );

    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;
    let onLeaveToday = 0;

    for (const record of attendancesToday) {
      if (record.status === AttendanceStatus.PRESENT) presentToday++;
      else if (record.status === AttendanceStatus.LATE) lateToday++;
      else if (record.status === AttendanceStatus.ABSENT) absentToday++;
      else if (record.status === AttendanceStatus.LEAVE) onLeaveToday++;
    }

    return {
      totalEmployees,
      presentToday,
      lateToday,
      absentToday,
      onLeaveToday,
      pendingOvertime,
      approvedOvertime,
      totalOvertimeMinutes,
      overtimeRequests: overtimeRequestsCount,
    };
  }

  /**
   * Daily attendance statistics per date.
   */
  async getAttendanceOverview(
    startDateStr?: string,
    endDateStr?: string,
    user?: any
  ) {
    const { year, month, day } = getJakartaDateInfo();
    const today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    // Default to last 7 days
    const defaultStart = new Date(today);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 6);

    const startDate = startDateStr ? parseJakartaDateString(startDateStr) : defaultStart;
    const endDate = endDateStr ? parseJakartaDateString(endDateStr) : today;

    const where: Prisma.AttendanceWhereInput = {
      attendanceDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (user?.role === UserRole.EMPLOYEE && user.employee?.id) {
      where.employeeId = user.employee.id;
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      select: {
        attendanceDate: true,
        status: true,
      },
      orderBy: { attendanceDate: 'asc' },
    });

    // Map each date within the range to initialize counts
    const dateMap = new Map<string, { present: number; late: number; absent: number; leave: number }>();

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dStr = cur.toISOString().split('T')[0];
      dateMap.set(dStr, { present: 0, late: 0, absent: 0, leave: 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    for (const att of attendances) {
      const dStr = att.attendanceDate.toISOString().split('T')[0];
      const entry = dateMap.get(dStr);
      if (entry) {
        if (att.status === AttendanceStatus.PRESENT) entry.present++;
        else if (att.status === AttendanceStatus.LATE) entry.late++;
        else if (att.status === AttendanceStatus.ABSENT) entry.absent++;
        else if (att.status === AttendanceStatus.LEAVE) entry.leave++;
      }
    }

    const result = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return {
      data: result,
    };
  }

  /**
   * Recent attendance feed.
   */
  async getRecentAttendance(limit: number = 10, user?: any) {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const where: Prisma.AttendanceWhereInput = {};

    if (user?.role === UserRole.EMPLOYEE && user.employee?.id) {
      where.employeeId = user.employee.id;
    }

    const records = await this.prisma.attendance.findMany({
      where,
      take: safeLimit,
      orderBy: [
        { attendanceDate: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            shift: { select: { id: true, name: true } },
          },
        },
      },
    });

    return records.map((record) => ({
      id: record.id,
      employee: record.employee
        ? `${record.employee.firstName} ${record.employee.lastName}`
        : 'Unknown',
      employeeId: record.employee?.employeeId,
      department: record.employee?.department?.name,
      shift: record.shift?.name || record.employee?.shift?.name || 'Tidak ada shift',
      date: record.attendanceDate.toISOString().split('T')[0],
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      workingMinutes: record.workingMinutes,
    }));
  }
}
