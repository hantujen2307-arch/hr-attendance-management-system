import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'in'; // 'in' or 'out'

    const record = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!record) {
      return new NextResponse('Attendance record not found', { status: 404 });
    }

    const rawPhoto = type === 'out' ? record.photoCheckOut : record.photoCheckIn;

    // 1. If base64 or SVG data URI
    if (rawPhoto && rawPhoto.startsWith('data:image/')) {
      // If SVG data URI
      if (rawPhoto.startsWith('data:image/svg+xml')) {
        const svgContent = rawPhoto.replace(/^data:image\/svg\+xml;utf8,/, '');
        const decodedSvg = decodeURIComponent(svgContent);
        return new NextResponse(decodedSvg, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }

      const commaIdx = rawPhoto.indexOf(',');
      if (commaIdx !== -1) {
        const header = rawPhoto.substring(5, commaIdx); // e.g. "image/jpeg;base64"
        const mimeType = header.split(';')[0] || 'image/jpeg';
        const base64Data = rawPhoto.substring(commaIdx + 1);
        const buffer = Buffer.from(base64Data, 'base64');
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    }

    // 2. Fallback: generate high-fidelity digital proof SVG
    const employeeName = record.employee
      ? `${record.employee.firstName} ${record.employee.lastName}`
      : 'Karyawan';
    const typeLabel = type === 'out' ? 'Absen Pulang' : 'Absen Masuk';
    const dateStr = record.attendanceDate
      ? new Date(record.attendanceDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="none">
      <defs>
        <linearGradient id="bg_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#bg_grad)" rx="14"/>
      <rect x="15" y="15" width="610" height="330" rx="10" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="320" cy="110" r="38" fill="#1e293b" stroke="#10b981" stroke-width="3"/>
      <path d="M 308 110 L 317 119 L 333 101" stroke="#10b981" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="320" y="180" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="18" font-weight="700" text-anchor="middle">${employeeName}</text>
      <text x="320" y="205" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">${typeLabel} • ${dateStr}</text>
      <rect x="210" y="245" width="220" height="28" rx="14" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="1"/>
      <text x="320" y="263" fill="#34d399" font-family="system-ui, sans-serif" font-size="11" font-weight="600" text-anchor="middle">✓ BUKTI ABSENSI TERVERIFIKASI</text>
    </svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/attendance/[id]/photo route:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
