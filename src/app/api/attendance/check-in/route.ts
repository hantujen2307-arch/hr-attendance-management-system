import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://hr-attendance-management-system-production.up.railway.app/api';

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('access_token')?.value ||
      request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Defensive payload normalization: extract photo from any alias, send only valid whitelisted fields
    const photo = body.photo || body.photoUrl || body.checkInPhoto || body.photoCheckIn;
    const sanitizedPayload: Record<string, any> = {
      latitude: body.latitude,
      longitude: body.longitude,
      photo,
    };
    if (typeof body.accuracy === 'number') {
      sanitizedPayload.accuracy = body.accuracy;
    }

    const backendResponse = await fetch(`${BACKEND_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
    });

    const data = await backendResponse.json();

    // Persist real Base64 photo directly into Neon PostgreSQL so photos never 404 or depend on disk
    if (backendResponse.ok && data?.id && photo && typeof photo === 'string') {
      try {
        await prisma.attendance.update({
          where: { id: data.id },
          data: { photoCheckIn: photo },
        });
        data.photoCheckIn = photo;
        data.checkInPhoto = photo;
        data.photoUrl = photo;
      } catch (dbErr) {
        console.warn('Could not directly update attendance photo in Neon:', dbErr);
      }
    }

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('Error in POST /api/attendance/check-in BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to record check-in' },
      { status: 500 }
    );
  }
}
