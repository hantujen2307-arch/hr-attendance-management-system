export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/jwt';
import { getJakartaDateInfo } from '@/lib/date-utils';
import { AttendanceStatus, EmploymentStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const { year, month, attendanceDate } = getJakartaDateInfo();

    // 1. Employee Dashboard View
    if (authUser.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: authUser.sub },
            { email: { equals: authUser.email, mode: 'insensitive' } },
          ],
        },
        include: {
          shift: true,
        },
      });

      if (!employee) {
        return NextResponse.json({
          isEmployee: true,
          attendanceThisMonth: 0,
          lateThisMonth: 0,
          leaveThisMonth: 0,
          workingMinutesThisMonth: 0,
          todayAttendance: null,
          currentShift: null,
          overtimeThisMonth: 0,
          pendingOvertime: 0,
          approvedOvertimeMinutes: 0,
          officeSetting: null,
        });
      }

      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const [monthAttendances, todayAttendance, employeeSchedule, officeSetting, employeeOvertimes] =
        await Promise.all([
          prisma.attendance.findMany({
            where: {
              employeeId: employee.id,
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
          prisma.attendance.findUnique({
            where: {
              uq_employee_attendance_date: {
                employeeId: employee.id,
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
          prisma.employeeSchedule.findFirst({
            where: {
              employeeId: employee.id,
              status: 'ACTIVE',
              startDate: { lte: attendanceDate },
              endDate: { gte: attendanceDate },
            },
            include: { shift: true },
          }),
          prisma.attendanceSetting.findFirst(),
          prisma.overtimeRequest.findMany({
            where: {
              employeeId: employee.id,
              date: { gte: startOfMonth, lte: endOfMonth },
            },
            select: {
              status: true,
              approvedMinutes: true,
            },
          }),
        ]);

      const activeShift = employeeSchedule?.shift || employee.shift;
      const currentShift = activeShift
        ? {
            id: activeShift.id,
            name: activeShift.name,
            code: activeShift.code || null,
            startTime: activeShift.startTime,
            endTime: activeShift.endTime,
            breakMinutes: activeShift.breakMinutes,
            toleranceMinutes: activeShift.toleranceMinutes ?? 15,
            isOvernight: activeShift.isOvernight ?? false,
            workDays: activeShift.workDays ?? '1,2,3,4,5',
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

      let overtimeThisMonth = employeeOvertimes.length;
      let pendingOvertime = 0;
      let approvedOvertimeMinutes = 0;

      for (const ot of employeeOvertimes) {
        if (ot.status === 'PENDING') pendingOvertime++;
        if (ot.status === 'APPROVED' && ot.approvedMinutes) {
          approvedOvertimeMinutes += ot.approvedMinutes;
        }
      }

      return NextResponse.json({
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
      });
    }

    // 2. ADMIN & HR Company Summary
    const [
      totalEmployees,
      attendancesToday,
      pendingOvertime,
      approvedOvertimes,
      overtimeRequestsCount,
    ] = await Promise.all([
      prisma.employee.count({
        where: { employmentStatus: EmploymentStatus.ACTIVE },
      }),
      prisma.attendance.findMany({
        where: { attendanceDate },
        select: { status: true },
      }),
      prisma.overtimeRequest.count({
        where: { status: 'PENDING' },
      }),
      prisma.overtimeRequest.findMany({
        where: { status: 'APPROVED' },
        select: { approvedMinutes: true },
      }),
      prisma.overtimeRequest.count(),
    ]);

    const approvedOvertime = approvedOvertimes.length;
    const totalOvertimeMinutes = approvedOvertimes.reduce(
      (acc, curr) => acc + (curr.approvedMinutes || 0),
      0
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

    return NextResponse.json({
      isEmployee: false,
      totalEmployees,
      presentToday,
      lateToday,
      absentToday,
      onLeaveToday,
      pendingOvertime,
      approvedOvertime,
      totalOvertimeMinutes,
      overtimeRequests: overtimeRequestsCount,
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/summary route:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve dashboard metrics' },
      { status: 500 }
    );
  }
}
