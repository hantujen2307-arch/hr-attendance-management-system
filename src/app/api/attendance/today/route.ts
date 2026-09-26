import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://hr-attendance-management-system-production.up.railway.app/api';

export async function GET(request: NextRequest) {
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

    const backendResponse = await fetch(`${BACKEND_URL}/attendance/today`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await backendResponse.json();

    if (backendResponse.ok && data?.attendance?.id) {
      try {
        const dbRecord = await prisma.attendance.findUnique({
          where: { id: data.attendance.id },
          select: { photoCheckIn: true, photoCheckOut: true },
        });
        if (dbRecord?.photoCheckIn) {
          data.attendance.photoCheckIn = dbRecord.photoCheckIn;
          data.attendance.checkInPhoto = dbRecord.photoCheckIn;
          data.attendance.photoUrl = dbRecord.photoCheckIn;
        }
        if (dbRecord?.photoCheckOut) {
          data.attendance.photoCheckOut = dbRecord.photoCheckOut;
          data.attendance.checkOutPhoto = dbRecord.photoCheckOut;
        }
      } catch (err) {
        // non-blocking database enrichment
      }
    }

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('Error in GET /api/attendance/today BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to fetch today attendance summary' },
      { status: 500 }
    );
  }
}
