import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5001/api';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const backendResponse = await fetch(`${BACKEND_URL}/employees/positions`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('Error in GET /api/employees/positions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
