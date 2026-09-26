export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withDbRetry, formatDatabaseError } from '@/lib/prisma';
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

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
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
      })
    );

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
      let matchedEmployee = await prisma.employee.findFirst({
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

      if (!matchedEmployee) {
        const username = user.email.split('@')[0].trim().toLowerCase();
        if (username) {
          const unlinked = await prisma.employee.findFirst({
            where: {
              userId: null,
              email: { startsWith: username, mode: 'insensitive' },
            },
            include: {
              department: true,
              shift: true,
            },
          });
          if (unlinked) {
            matchedEmployee = unlinked;
          }
        }
      }

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
      } else if (user.role === 'ADMIN' || user.role === 'HR') {
        try {
          let dept = await prisma.department.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          });
          if (!dept) {
            dept = await prisma.department.create({
              data: {
                name: 'Management',
                code: 'MGMT',
                status: 'ACTIVE',
              },
            });
          }

          const defaultShift = await prisma.shift.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          });

          const rolePrefix = user.role === 'ADMIN' ? 'ADM' : 'HR';
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const nameParts = (user.email.split('@')[0] || 'Administrator')
            .replace(/[._-]/g, ' ')
            .trim()
            .split(' ');
          const firstName =
            nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
          const lastName =
            nameParts.length > 1
              ? nameParts
                  .slice(1)
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(' ')
              : '(Staff)';

          const createdEmp = await prisma.employee.create({
            data: {
              userId: user.id,
              employeeId: `EMP-${rolePrefix}-${randomSuffix}`,
              firstName: firstName || 'Administrator',
              lastName: lastName || '',
              email: user.email.trim().toLowerCase(),
              departmentId: dept.id,
              shiftId: defaultShift?.id || null,
              position: user.role === 'ADMIN' ? 'System Administrator' : 'HR Specialist',
              joinDate: new Date(),
              employmentStatus: 'ACTIVE',
            },
            include: {
              department: true,
              shift: true,
            },
          });
          (user as any).employee = createdEmp;
        } catch (err) {
          console.error('[AUTH_ME] Auto-provisioning employee profile failed:', err);
        }
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
    const dbErr = formatDatabaseError(error, 'Gagal memverifikasi sesi autentikasi.');
    return NextResponse.json(
      { message: dbErr.message, isColdStart: dbErr.isColdStart },
      {
        status: dbErr.isColdStart ? 503 : 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  }
}

