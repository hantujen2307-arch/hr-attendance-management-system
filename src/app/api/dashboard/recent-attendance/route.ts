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
    console.error('Error in GET /api/dashboard/recent-attendance route:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve recent attendance feed' },
      { status: 500 }
    );
  }
}
