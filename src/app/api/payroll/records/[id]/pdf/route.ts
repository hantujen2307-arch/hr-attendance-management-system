import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://hr-attendance-management-system-production.up.railway.app/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token =
      request.cookies.get('access_token')?.value ||
      request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const backendResponse = await fetch(`${BACKEND_URL}/payroll/records/${id}/pdf`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      const err = await backendResponse.json().catch(() => ({ message: 'Gagal mengunduh slip PDF' }));
      return NextResponse.json(err, { status: backendResponse.status });
    }

    const contentDisposition =
      backendResponse.headers.get('content-disposition') ||
      `attachment; filename="slip-gaji-${id}.pdf"`;
    const pdfBuffer = await backendResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/payroll/records/[id]/pdf BFF route:', error);
    return NextResponse.json(
      { message: 'Failed to download payslip PDF' },
      { status: 500 }
    );
  }
}
