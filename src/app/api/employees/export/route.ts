import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5001/api';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/employees/export${searchParams ? `?${searchParams}` : ''}`;

    const backendResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: 'Failed to export employee data' },
        { status: backendResponse.status }
      );
    }

    const csvData = await backendResponse.text();
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="data-karyawan-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/employees/export:', error);
    return NextResponse.json(
      { message: 'Failed to export employee data' },
      { status: 500 }
    );
  }
}
