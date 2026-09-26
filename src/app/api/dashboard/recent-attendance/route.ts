export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/jwt';
import { Prisma } from '@prisma/client';

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
    const limitParam = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 10 : limitParam), 50);

    const where: Prisma.AttendanceWhereInput = {};

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

    const records = await prisma.attendance.findMany({
      where,
      take: limit,
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

    const result = records.map((record) => ({
      id: record.id,
      employee: record.employee
        ? `${record.employee.firstName} ${record.employee.lastName}`.trim()
        : 'Unknown',
      employeeId: record.employee?.employeeId,
      department: record.employee?.department?.name,
      shift: record.shift?.name || record.employee?.shift?.name || 'Standard Shift',
      date: record.attendanceDate.toISOString().split('T')[0],
      checkIn: record.checkIn ? record.checkIn.toISOString() : null,
      checkOut: record.checkOut ? record.checkOut.toISOString() : null,
      status: record.status,
      workingMinutes: record.workingMinutes,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.warn('[RECENT_ATTENDANCE] Direct Prisma query failed, attempting Railway backend fallback:', error);
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
        const backendRes = await fetch(`${BACKEND_URL}/dashboard/recent-attendance${search ? `?${search}` : ''}`, {
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
        console.warn('[RECENT_ATTENDANCE_BACKEND_FALLBACK_WARN]', backendErr);
      }
    }

    return NextResponse.json([]);
  }
}
