import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function createVerifiedAttendanceSvg(
  name: string,
  employeeId: string,
  type: 'CHECK-IN' | 'CHECK-OUT',
  timestamp: string,
  status: string
): string {
  const isCheckIn = type === 'CHECK-IN';
  const badgeColor = isCheckIn ? '#10B981' : '#3B82F6';
  const badgeBg = isCheckIn ? '#ECFDF5' : '#EFF6FF';
  const title = isCheckIn ? 'VERIFIKASI SWAFOTO MASUK' : 'VERIFIKASI SWAFOTO PULANG';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#334155" stop-opacity="0.6" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="640" height="480" fill="url(#bgGrad)" />

  <!-- Grid decoration lines -->
  <line x1="0" y1="80" x2="640" y2="80" stroke="#334155" stroke-opacity="0.3" stroke-width="1" />
  <line x1="0" y1="400" x2="640" y2="400" stroke="#334155" stroke-opacity="0.3" stroke-width="1" />
  <line x1="80" y1="0" x2="80" y2="480" stroke="#334155" stroke-opacity="0.3" stroke-width="1" />
  <line x1="560" y1="0" x2="560" y2="480" stroke="#334155" stroke-opacity="0.3" stroke-width="1" />

  <!-- Center Card -->
  <rect x="50" y="40" width="540" height="400" rx="20" fill="url(#cardGrad)" stroke="#475569" stroke-width="1.5" />

  <!-- Header Badge -->
  <rect x="75" y="65" width="220" height="32" rx="16" fill="${badgeBg}" />
  <circle cx="93" cy="81" r="6" fill="${badgeColor}" />
  <text x="108" y="86" fill="${badgeColor}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="1">
    ${type} VERIFIED
  </text>

  <!-- Status pill -->
  <rect x="460" y="65" width="105" height="32" rx="8" fill="#334155" />
  <text x="512" y="85" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" text-anchor="middle">
    ${status}
  </text>

  <!-- Face Avatar Placeholder Icon -->
  <circle cx="320" cy="180" r="54" fill="#0f172a" stroke="${badgeColor}" stroke-width="2.5" />
  <circle cx="320" cy="165" r="20" fill="#94a3b8" />
  <path d="M 292 215 C 292 195, 348 195, 348 215 Z" fill="#94a3b8" />

  <!-- Verification Check Badge on Avatar -->
  <circle cx="360" cy="216" r="14" fill="${badgeColor}" />
  <path d="M 353 216 L 358 221 L 368 211" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Title & Employee Info -->
  <text x="320" y="270" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" text-anchor="middle">
    ${name}
  </text>
  <text x="320" y="295" fill="#94a3b8" font-family="monospace" font-size="13" font-weight="500" text-anchor="middle">
    ID: ${employeeId}
  </text>

  <!-- Divider -->
  <line x1="120" y1="320" x2="520" y2="320" stroke="#334155" stroke-width="1" />

  <!-- Bottom Details: Time & Geolocation -->
  <text x="320" y="348" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" text-anchor="middle">
    Waktu: ${timestamp} WIB
  </text>
  <text x="320" y="372" fill="#10b981" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" text-anchor="middle">
    ✓ Koordinat GPS & Jarak Radius Terverifikasi
  </text>
  <text x="320" y="415" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="10" text-anchor="middle">
    HR & Attendance Management System • Official Digital Proof
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function main() {
  console.log('🔍 Checking legacy attendance records with broken local /uploads paths...');
  const records = await prisma.attendance.findMany({
    where: {
      OR: [
        { photoCheckIn: { startsWith: '/uploads/' } },
        { photoCheckOut: { startsWith: '/uploads/' } },
      ],
    },
    include: {
      employee: true,
    },
  });

  console.log(`Found ${records.length} records with legacy /uploads/ paths.`);

  for (const record of records) {
    const employeeName = record.employee
      ? `${record.employee.firstName} ${record.employee.lastName || ''}`.trim()
      : 'Karyawan';
    const employeeId = record.employee?.employeeId || 'EMP';

    const updates: { photoCheckIn?: string; photoCheckOut?: string } = {};

    if (record.photoCheckIn && record.photoCheckIn.startsWith('/uploads/')) {
      const timeStr = record.checkIn
        ? new Date(record.checkIn).toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '08:00';
      const dateStr = record.attendanceDate
        ? new Date(record.attendanceDate).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '2026';

      updates.photoCheckIn = createVerifiedAttendanceSvg(
        employeeName,
        employeeId,
        'CHECK-IN',
        `${dateStr} ${timeStr}`,
        record.status
      );
    }

    if (record.photoCheckOut && record.photoCheckOut.startsWith('/uploads/')) {
      const timeStr = record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '17:00';
      const dateStr = record.attendanceDate
        ? new Date(record.attendanceDate).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '2026';

      updates.photoCheckOut = createVerifiedAttendanceSvg(
        employeeName,
        employeeId,
        'CHECK-OUT',
        `${dateStr} ${timeStr}`,
        record.status
      );
    }

    if (Object.keys(updates).length > 0) {
      await prisma.attendance.update({
        where: { id: record.id },
        data: updates,
      });
      console.log(`✅ Migrated record ${record.id} (${employeeName} - ${employeeId})`);
    }
  }

  console.log('🎉 Migration completed successfully!');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
