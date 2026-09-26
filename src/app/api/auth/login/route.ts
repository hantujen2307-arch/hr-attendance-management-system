import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signJwt } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailNormalized = email.trim().toLowerCase();

    // 1. Find user in database via Prisma
    const user = await prisma.user.findUnique({
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
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials. User not found.' },
        { status: 401 }
      );
    }

    // 2. Validate password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials. Password incorrect.' },
        { status: 401 }
      );
    }

    // 3. Resolve employee details if not directly linked
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

    // 4. Generate JWT access token
    const accessToken = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. Log audit trail
    await prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          details: `User ${user.email} (${user.role}) logged in successfully`,
          metadata: { email: user.email, role: user.role },
        },
      })
      .catch((err) => console.error('Failed to log audit:', err));

    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      employee,
    };

    // 6. Set HTTP-only secure cookies for tokens
    const response = NextResponse.json({
      success: true,
      user: userData,
      access_token: accessToken,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    };

    response.cookies.set('access_token', accessToken, cookieOptions);
    response.cookies.set('auth_token', accessToken, cookieOptions);

    response.cookies.set('user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { message: 'Authentication failed due to an internal server error' },
      { status: 500 }
    );
  }
}
