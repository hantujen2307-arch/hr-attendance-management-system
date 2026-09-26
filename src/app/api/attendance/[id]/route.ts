import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://hr-attendance-management-system-production.up.railway.app/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token =
      request.cookies.get('access_token')?.value ||
      request.cookies.get('auth_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    let data: any = null;
    let status = 200;

    try {
      const backendResponse = await fetch(`${BACKEND_URL}/attendance/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (backendResponse.ok) {
        data = await backendResponse.json();
        status = backendResponse.status;
      }
    } catch (err) {
      console.warn('Backend fetch failed for attendance detail, falling back to database:', err);
    }

    if (!data?.id) {
      try {
        const dbAttendance = await prisma.attendance.findUnique({
          where: { id },
          include: {
            employee: {
              include: { department: true, shift: true },
            },
            shift: true,
          },
        });

        if (dbAttendance) {
          const setting = await prisma.attendanceSetting.findFirst();
          data = {
            ...dbAttendance,
            setting,
            photoUrl: dbAttendance.photoCheckIn,
            checkInPhoto: dbAttendance.photoCheckIn,
            checkOutPhoto: dbAttendance.photoCheckOut,
          };
          status = 200;
        } else {
          return NextResponse.json(
            { message: 'Attendance record not found' },
            { status: 404 }
          );
        }
      } catch (dbErr) {
        console.error('Database query fallback failed for attendance detail:', dbErr);
        return NextResponse.json(
          { message: 'Failed to fetch attendance details' },
          { status: 500 }
        );
      }
    } else {
      try {
        const dbRecord = await prisma.attendance.findUnique({
          where: { id: data.id },
          select: { photoCheckIn: true, photoCheckOut: true },
        });
        if (dbRecord?.photoCheckIn) {
          data.photoCheckIn = dbRecord.photoCheckIn;
          data.checkInPhoto = dbRecord.photoCheckIn;
          data.photoUrl = dbRecord.photoCheckIn;
        }
        if (dbRecord?.photoCheckOut) {
          data.photoCheckOut = dbRecord.photoCheckOut;
          data.checkOutPhoto = dbRecord.photoCheckOut;
        }
      } catch (err) {
        // non-blocking database enrichment
      }
    }

    return NextResponse.json(data, {
      status,
    });
  } catch (error) {
    console.error('Error in GET /api/attendance/[id] BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to fetch attendance details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token =
      request.cookies.get('access_token')?.value ||
      request.cookies.get('auth_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const backendResponse = await fetch(`${BACKEND_URL}/attendance/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('Error in PATCH /api/attendance/[id] BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to update attendance record' },
      { status: 500 }
    );
  }
}
