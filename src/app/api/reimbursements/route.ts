import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5001/api';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/reimbursements${searchParams ? `?${searchParams}` : ''}`;

    const backendResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('Error in GET /api/reimbursements BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reimbursements from backend' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const payload: any = {
      category: body.category,
      amount: body.amount,
      date: body.date || body.expenseDate,
      description: body.description,
      receipt: body.receipt || body.receiptProof,
      status: body.status,
    };
    if (body.employeeId) {
      payload.employeeId = body.employeeId;
    }

    const backendResponse = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('Error in POST /api/reimbursements BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to submit reimbursement to backend' },
      { status: 500 }
    );
  }
}
