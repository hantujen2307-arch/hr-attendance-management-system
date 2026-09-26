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
    console.warn('[ATTENDANCE_OVERVIEW] Direct Prisma query failed, attempting Railway backend fallback:', error);
    const BACKEND_URL =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://hr-attendance-management-system-production.up.railway.app/api';
    const token =
      request.cookies.get('access_token')?.value ||
      request.cookies.get('auth_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (token) {
      try {
        const search = request.nextUrl.searchParams.toString();
        const backendRes = await fetch(`${BACKEND_URL}/dashboard/attendance-overview${search ? `?${search}` : ''}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        if (backendRes.ok) {
          const backendData = await backendRes.json();
          return NextResponse.json(backendData);
        }
      } catch (backendErr) {
        console.warn('[ATTENDANCE_OVERVIEW_BACKEND_FALLBACK_WARN]', backendErr);
      }
    }

    return NextResponse.json({ data: [] });
  }
}
