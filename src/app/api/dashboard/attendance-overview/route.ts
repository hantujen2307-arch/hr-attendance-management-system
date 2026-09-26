export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/jwt';
import { getJakartaDateInfo, parseJakartaDateString } from '@/lib/date-utils';
import { AttendanceStatus, Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const { year, month, day } = getJakartaDateInfo();
    const today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const defaultStart = new Date(today);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 6);

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = startDateStr ? parseJakartaDateString(startDateStr) : defaultStart;
      endDate = endDateStr ? parseJakartaDateString(endDateStr) : today;
    } catch {
      startDate = defaultStart;
      endDate = today;
    }

    const where: Prisma.AttendanceWhereInput = {
      attendanceDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (authUser.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: authUser.sub },
            { email: { equals: authUser.email, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (employee) {
        where.employeeId = employee.id;
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
      select: {
        attendanceDate: true,
        status: true,
      },
      orderBy: { attendanceDate: 'asc' },
    });

    const dateMap = new Map<
      string,
      { present: number; late: number; absent: number; leave: number }
    >();

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

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/attendance-overview route:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve attendance overview' },
      { status: 500 }
    );
  }
}
