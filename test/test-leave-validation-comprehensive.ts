export {};

const FRONTEND_URL = 'http://localhost:3000';

async function request(url: string, options: any = {}): Promise<{ status: number; ok: boolean; headers: any; data: any }> {
  const res = await fetch(url, options);
  let json: any = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data: json,
  };
}

function extractCookies(headers: Headers): string {
  const getSetCookie = (headers as any).getSetCookie;
  let rawCookies: string[] = [];
  if (typeof getSetCookie === 'function') {
    rawCookies = getSetCookie.call(headers);
  } else {
    const raw = headers.get('set-cookie');
    if (raw) rawCookies = [raw];
  }
  return rawCookies.map((c: string) => c.split(';')[0]).join('; ');
}

function getJakartaDate(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

async function run() {
  console.log('========================================================');
  console.log('🚀 COMPREHENSIVE LEAVE REQUEST VALIDATION & RBAC TEST');
  console.log('========================================================\n');

  const todayStr = getJakartaDate(0);
  const tomorrowStr = getJakartaDate(1);
  const futureStart = getJakartaDate(5);
  const futureEnd = getJakartaDate(7);
  const pastDateStr = getJakartaDate(-2);

  console.log(`Reference Jakarta dates:`);
  console.log(`- Hari ini: ${todayStr}`);
  console.log(`- Besok: ${tomorrowStr}`);
  console.log(`- Masa depan: ${futureStart} s/d ${futureEnd}`);
  console.log(`- Masa lalu: ${pastDateStr}\n`);

  // 1. Login as Jesen (EMPLOYEE)
  console.log('--- Step 1: Login as Employee Jesen (jesen2307@gmail.com) ---');
  const loginJesen = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jesen2307@gmail.com', password: 'password123' }),
  });
  if (!loginJesen.ok) throw new Error(`Login Jesen failed: ${JSON.stringify(loginJesen.data)}`);
  const jesenCookies = extractCookies(loginJesen.headers);
  console.log('✅ Jesen logged in successfully.');

  // Fetch leave types
  const typesRes = await request(`${FRONTEND_URL}/api/leave/types`, {
    headers: { Cookie: jesenCookies },
  });
  const types = typesRes.data;
  if (!Array.isArray(types) || types.length === 0) {
    throw new Error('No leave types found!');
  }
  const sickLeaveType = types.find((t: any) => t.name.toLowerCase().includes('sick')) || types[0];
  const annualLeaveType = types.find((t: any) => t.name.toLowerCase().includes('annual')) || types[0];
  console.log(`Using Leave Type: ${sickLeaveType.name} (id: ${sickLeaveType.id})\n`);

  // CLEANUP previous test leaves for today if any (Idempotency)
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const jesenUser = await prisma.user.findUnique({
    where: { email: 'jesen2307@gmail.com' },
    include: { employee: true },
  });
  if (jesenUser?.employee?.id) {
    await prisma.leaveRequest.deleteMany({
      where: { employeeId: jesenUser.employee.id },
    });
  }
  await prisma.$disconnect();

  // 2. TEST: Tolak tanggal kosong
  console.log('--- Step 2: Test Tolak Tanggal Kosong ---');
  const emptyStartRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: sickLeaveType.id,
      startDate: '',
      endDate: todayStr,
      reason: 'Sakit flu mendadak',
    }),
  });
  if (emptyStartRes.status === 400) {
    console.log('✅ PASS: Tanggal mulai kosong ditolak (400 Bad Request):', emptyStartRes.data.message || emptyStartRes.data);
  } else {
    console.error('❌ FAIL: Tanggal mulai kosong tidak ditolak 400! Status:', emptyStartRes.status);
    process.exit(1);
  }

  const emptyEndRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: sickLeaveType.id,
      startDate: todayStr,
      endDate: '',
      reason: 'Sakit flu mendadak',
    }),
  });
  if (emptyEndRes.status === 400) {
    console.log('✅ PASS: Tanggal selesai kosong ditolak (400 Bad Request):', emptyEndRes.data.message || emptyEndRes.data);
  } else {
    console.error('❌ FAIL: Tanggal selesai kosong tidak ditolak 400! Status:', emptyEndRes.status);
    process.exit(1);
  }

  // 3. TEST: Tolak format salah
  console.log('\n--- Step 3: Test Tolak Format Tanggal Salah ---');
  const invalidFormatRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: sickLeaveType.id,
      startDate: '23/09/2026',
      endDate: todayStr,
      reason: 'Sakit',
    }),
  });
  if (invalidFormatRes.status === 400) {
    console.log('✅ PASS: Format salah (23/09/2026) ditolak (400 Bad Request):', invalidFormatRes.data.message || invalidFormatRes.data);
  } else {
    console.error('❌ FAIL: Format salah tidak ditolak 400! Status:', invalidFormatRes.status);
    process.exit(1);
  }

  const invalidCalendarRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: sickLeaveType.id,
      startDate: '2026-02-31',
      endDate: '2026-02-31',
      reason: 'Sakit',
    }),
  });
  if (invalidCalendarRes.status === 400) {
    console.log('✅ PASS: Tanggal kalender invalid (2026-02-31) ditolak (400 Bad Request)');
  } else {
    console.error('❌ FAIL: Tanggal kalender invalid tidak ditolak 400! Status:', invalidCalendarRes.status);
    process.exit(1);
  }

  // 4. TEST: Tolak tanggal selesai sebelum mulai
  console.log('\n--- Step 4: Test Tolak Tanggal Selesai Sebelum Mulai ---');
  const endBeforeStartRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: sickLeaveType.id,
      startDate: futureEnd,
      endDate: futureStart,
      reason: 'Liburan',
    }),
  });
  if (endBeforeStartRes.status === 400) {
    console.log('✅ PASS: Tanggal selesai sebelum mulai ditolak (400 Bad Request):', endBeforeStartRes.data.message || endBeforeStartRes.data);
  } else {
    console.error('❌ FAIL: End date before start date tidak ditolak 400! Status:', endBeforeStartRes.status);
    process.exit(1);
  }

  // 5. TEST: Tolak tanggal masa lalu
  console.log('\n--- Step 5: Test Tolak Tanggal Masa Lalu ---');
  const pastDateRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: sickLeaveType.id,
      startDate: pastDateStr,
      endDate: pastDateStr,
      reason: 'Izin masa lalu',
    }),
  });
  if (pastDateRes.status === 400) {
    console.log('✅ PASS: Tanggal masa lalu ditolak (400 Bad Request):', pastDateRes.data.message || pastDateRes.data);
  } else {
    console.error('❌ FAIL: Tanggal masa lalu tidak ditolak 400! Status:', pastDateRes.status);
    process.exit(1);
  }

  // 6. TEST MANDATORI: Employee membuat izin HARI INI harus berhasil!
  console.log('\n--- Step 6: TEST MANDATORI: Employee membuat izin HARI INI ---');
  const createTodayRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: sickLeaveType.id,
      startDate: todayStr,
      endDate: todayStr,
      reason: 'Izin sakit demam dan flu hari ini',
    }),
  });

  if (createTodayRes.status === 201 || createTodayRes.status === 200) {
    console.log('🎉 SUCCESS: Employee BERHASIL membuat izin untuk HARI INI!');
    console.log('Detail pengajuan:', {
      id: createTodayRes.data.id,
      startDate: createTodayRes.data.startDate?.split('T')[0],
      endDate: createTodayRes.data.endDate?.split('T')[0],
      duration: createTodayRes.data.duration,
      status: createTodayRes.data.status,
    });
  } else {
    console.error('❌ FAIL: Gagal membuat izin hari ini! Status:', createTodayRes.status, createTodayRes.data);
    process.exit(1);
  }
  const todayLeaveId = createTodayRes.data.id;

  // 7. TEST: Employee melihat pengajuan sendiri
  console.log('\n--- Step 7: Employee melihat pengajuan sendiri ---');
  const jesenLeaves = await request(`${FRONTEND_URL}/api/leave`, {
    headers: { Cookie: jesenCookies },
  });
  const foundToday = jesenLeaves.data.find((l: any) => l.id === todayLeaveId);
  if (foundToday) {
    console.log('✅ PASS: Employee dapat melihat pengajuan miliknya sendiri.');
  } else {
    console.error('❌ FAIL: Employee tidak dapat melihat pengajuan miliknya!');
    process.exit(1);
  }

  // 8. TEST RBAC: Employee lain (Budi) TIDAK BOLEH melihat pengajuan Jesen
  console.log('\n--- Step 8: Employee lain (Budi) tidak melihat pengajuan Jesen ---');
  const loginBudi = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'budi.santoso@example.com', password: 'password123' }),
  });
  const budiCookies = extractCookies(loginBudi.headers);
  const budiLeaves = await request(`${FRONTEND_URL}/api/leave`, {
    headers: { Cookie: budiCookies },
  });
  const budiSeesJesen = (budiLeaves.data || []).find((l: any) => l.id === todayLeaveId);
  if (!budiSeesJesen) {
    console.log('✅ PASS: Employee lain (Budi) TIDAK melihat pengajuan Jesen.');
  } else {
    console.error('❌ FAIL: Data leakage! Employee lain dapat melihat pengajuan Jesen!');
    process.exit(1);
  }

  // 9. TEST RBAC: Employee DILARANG Approve/Reject
  console.log('\n--- Step 9: Employee dilarang Approve pengajuan ---');
  const empApproveRes = await request(`${FRONTEND_URL}/api/leave/${todayLeaveId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: jesenCookies },
  });
  if (empApproveRes.status === 403) {
    console.log('✅ PASS: Employee ditolak menyetujui pengajuan (403 Forbidden).');
  } else {
    console.error('❌ FAIL: Employee tidak diblokir saat approve! Status:', empApproveRes.status);
    process.exit(1);
  }

  // 10. TEST: Admin melihat semua pengajuan dan APPROVE
  console.log('\n--- Step 10: Admin melihat semua pengajuan dan Approve ---');
  const loginAdmin = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
  });
  const adminCookies = extractCookies(loginAdmin.headers);

  const adminLeaves = await request(`${FRONTEND_URL}/api/leave`, {
    headers: { Cookie: adminCookies },
  });
  const adminSeesToday = (adminLeaves.data || []).find((l: any) => l.id === todayLeaveId);
  if (adminSeesToday) {
    console.log('✅ PASS: Admin dapat melihat seluruh pengajuan termasuk milik Jesen.');
  } else {
    console.error('❌ FAIL: Admin tidak dapat melihat pengajuan Jesen!');
    process.exit(1);
  }

  const approveRes = await request(`${FRONTEND_URL}/api/leave/${todayLeaveId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: adminCookies },
  });
  if (approveRes.ok && (approveRes.data.status === 'APPROVED' || approveRes.status === 200)) {
    console.log('✅ PASS: Admin berhasil APPROVE pengajuan izin Jesen.');
  } else {
    console.error('❌ FAIL: Admin gagal approve pengajuan! Status:', approveRes.status, approveRes.data);
    process.exit(1);
  }

  // 11. TEST: HR melihat dan REJECT pengajuan (buat pengajuan masa depan)
  console.log('\n--- Step 11: HR melihat dan Reject pengajuan masa depan ---');
  const futureLeaveRes = await request(`${FRONTEND_URL}/api/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jesenCookies },
    body: JSON.stringify({
      leaveTypeId: annualLeaveType.id,
      startDate: futureStart,
      endDate: futureEnd,
      reason: 'Liburan ke Bali',
    }),
  });
  if (!futureLeaveRes.ok) {
    throw new Error(`Failed to create future leave: ${JSON.stringify(futureLeaveRes.data)}`);
  }
  const futureLeaveId = futureLeaveRes.data.id;
  console.log(`✅ Jesen berhasil membuat cuti masa depan: ${futureStart} s/d ${futureEnd} (ID: ${futureLeaveId})`);

  const loginHR = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emily.zhao@company.com', password: 'password123' }),
  });
  const hrCookies = extractCookies(loginHR.headers);

  const rejectRes = await request(`${FRONTEND_URL}/api/leave/${futureLeaveId}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: hrCookies },
    body: JSON.stringify({ reason: 'Jadwal kerja padat pada minggu tersebut' }),
  });
  if (rejectRes.ok && (rejectRes.data.status === 'REJECTED' || rejectRes.status === 200)) {
    console.log('✅ PASS: HR berhasil REJECT pengajuan cuti masa depan.');
  } else {
    console.error('❌ FAIL: HR gagal reject pengajuan! Status:', rejectRes.status, rejectRes.data);
    process.exit(1);
  }

  console.log('\n========================================================');
  console.log('🎉 ALL LEAVE VALIDATION & RBAC RULES FULLY VERIFIED!');
  console.log('========================================================\n');
}

run().catch((e) => {
  console.error('Error running test:', e);
  process.exit(1);
});
