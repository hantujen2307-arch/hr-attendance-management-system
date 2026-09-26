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

    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/attendance${searchParams ? `?${searchParams}` : ''}`;

    const backendResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await backendResponse.json();

    if (backendResponse.ok && Array.isArray(data?.data) && data.data.length > 0) {
      try {
        const ids = data.data.map((d: any) => d.id).filter(Boolean);
        const dbRecords = await prisma.attendance.findMany({
          where: { id: { in: ids } },
          select: { id: true, photoCheckIn: true, photoCheckOut: true },
        });
        const photoMap = new Map(dbRecords.map((r) => [r.id, r]));
        for (const item of data.data) {
          const dbItem = photoMap.get(item.id);
          if (dbItem?.photoCheckIn) {
            item.photoCheckIn = dbItem.photoCheckIn;
            item.checkInPhoto = dbItem.photoCheckIn;
            item.photoUrl = dbItem.photoCheckIn;
          }
          if (dbItem?.photoCheckOut) {
            item.photoCheckOut = dbItem.photoCheckOut;
            item.checkOutPhoto = dbItem.photoCheckOut;
          }
        }
      } catch (e) {
        // non-blocking database enrichment
      }
    }

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('Error in GET /api/attendance BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to fetch attendance logs from backend' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const backendResponse = await fetch(`${BACKEND_URL}/attendance`, {
      method: 'POST',
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
    console.error('Error in POST /api/attendance BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to log manual attendance in backend' },
      { status: 500 }
    );
  }
}
