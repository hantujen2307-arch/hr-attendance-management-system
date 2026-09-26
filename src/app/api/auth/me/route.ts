export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get('access_token')?.value ||
    request.cookies.get('auth_token')?.value;

  try {

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized. No access token provided.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        }
      );
    }

    const payload = verifyJwt(token);
    if (!payload || !payload.sub) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        employee: {
          include: {
            department: true,
            shift: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        }
      );
    }

    if (!user.employee && user.email) {
      const matchedEmployee = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: { equals: user.email, mode: 'insensitive' } },
          ],
        },
        include: {
          department: true,
          shift: true,
        },
      });

      if (matchedEmployee) {
        if (!matchedEmployee.userId || matchedEmployee.userId !== user.id) {
          await prisma.employee
            .update({
              where: { id: matchedEmployee.id },
              data: { userId: user.id },
            })
            .catch(() => {});
        }
        (user as any).employee = matchedEmployee;
      }
    }

    return NextResponse.json(user, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.warn('[AUTH_ME] Direct Prisma query failed, attempting Railway backend fallback:', error);
    try {
      const BACKEND_URL =
        process.env.BACKEND_API_URL ||
        'https://hr-attendance-management-system-production.up.railway.app/api';
      const backendRes = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (backendRes.ok) {
        const backendUser = await backendRes.json();
        return NextResponse.json(backendUser, {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        });
      }
    } catch (backendErr) {
      console.error('[AUTH_ME_BACKEND_FALLBACK_ERROR]', backendErr);
    }
    return NextResponse.json(
      { message: 'Failed to authenticate user session' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  }
}

