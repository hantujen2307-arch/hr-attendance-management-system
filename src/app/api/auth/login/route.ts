import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, withDbRetry, formatDatabaseError } from '@/lib/prisma';
import { signJwt } from '@/lib/jwt';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  'https://hr-attendance-management-system-production.up.railway.app/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { email, password } = body;
    const emailNormalized = email.trim().toLowerCase();

    let authenticatedUser: any = null;
    let accessToken: string | null = null;
    let backendFetchAttempted = false;

    // 1. Attempt primary authentication via NestJS Backend (Railway / configured BACKEND_API_URL)
    try {
      backendFetchAttempted = true;
      const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailNormalized, password }),
        cache: 'no-store',
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        if (backendData?.access_token) {
          accessToken = backendData.access_token;
          authenticatedUser = backendData.user;
        }
      } else if (backendResponse.status === 401 || backendResponse.status === 400) {
        const errData = await backendResponse.json().catch(() => ({}));
        return NextResponse.json(
          { message: errData.message || 'Invalid credentials. Please verify your email and password.' },
          { status: backendResponse.status }
        );
      } else {
        console.warn(
          `[AUTH_LOGIN] Backend returned HTTP ${backendResponse.status}. Attempting direct Prisma fallback...`
        );
      }
    } catch (backendError) {
      console.warn(
        '[AUTH_LOGIN] Backend service connection failed. Falling back to direct Prisma database authentication:',
        backendError
      );
    }

    // 2. Direct Prisma Fallback if backend was unreachable or returned non-auth error
    if (!accessToken || !authenticatedUser) {
      try {
        const user = await withDbRetry(() =>
          prisma.user.findUnique({
            where: { email: emailNormalized },
            include: {
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  firstName: true,
                  lastName: true,
                  department: { select: { id: true, name: true } },
                  position: true,
                },
              },
            },
          })
        );

        if (!user) {
          return NextResponse.json(
            { message: 'Invalid credentials. User not found.' },
            { status: 401 }
          );
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return NextResponse.json(
            { message: 'Invalid credentials. Password incorrect.' },
            { status: 401 }
          );
        }

        let employee = user.employee;
        if (!employee) {
          const matchedEmployee = await prisma.employee.findFirst({
            where: {
              OR: [
                { userId: user.id },
                { email: { equals: emailNormalized, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
              position: true,
              userId: true,
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
            employee = matchedEmployee;
          }
        }

        accessToken = signJwt({
          sub: user.id,
          email: user.email,
          role: user.role,
        });

        authenticatedUser = {
          id: user.id,
          email: user.email,
          role: user.role,
          employee,
        };

        // Asynchronously log audit without blocking user login
        prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: 'LOGIN_SUCCESS',
              details: `User ${user.email} (${user.role}) logged in successfully via Next.js`,
              metadata: { email: user.email, role: user.role },
            },
          })
          .catch((err) => console.error('[AUDIT_LOG_ERROR]', err));
      } catch (prismaError: any) {
        console.error('[AUTH_LOGIN_PRISMA_ERROR] Direct database authentication failed:', prismaError);
        const dbErr = formatDatabaseError(prismaError, 'Layanan autentikasi database sedang tidak tersedia.');
        return NextResponse.json(
          {
            message: dbErr.message,
            isColdStart: dbErr.isColdStart,
          },
          { status: 503 }
        );
      }
    }

    if (!accessToken || !authenticatedUser) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 3. Construct response and set secure authentication cookies
    const response = NextResponse.json({
      success: true,
      user: authenticatedUser,
      access_token: accessToken,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    };

    response.cookies.set('access_token', accessToken, cookieOptions);
    response.cookies.set('auth_token', accessToken, cookieOptions);

    response.cookies.set('user_role', authenticatedUser.role, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH_LOGIN_FATAL_ERROR] Unexpected error in POST /api/auth/login:', error);
    return NextResponse.json(
      {
        message: 'Authentication failed due to an unexpected server error.',
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
