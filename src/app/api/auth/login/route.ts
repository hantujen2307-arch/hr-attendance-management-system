import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5001/api';

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

    const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: data.message || 'Invalid credentials' },
        { status: backendResponse.status || 401 }
      );
    }

    // Set HTTP-only secure cookie for token storage (both access_token and auth_token for compatibility)
    const response = NextResponse.json({
      success: true,
      user: data.user,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    };

    response.cookies.set('access_token', data.access_token, cookieOptions);
    response.cookies.set('auth_token', data.access_token, cookieOptions);

    response.cookies.set('user_role', data.user.role, {
      httpOnly: false, // Accessible for client role indicators
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { message: 'Unable to connect to authentication service' },
      { status: 500 }
    );
  }
}
