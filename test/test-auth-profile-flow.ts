import * as http from 'http';

const FRONTEND_URL = 'http://localhost:3000';

async function request(url: string, options: any = {}) {
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
  return rawCookies.map(c => c.split(';')[0]).join('; ');
}

async function run() {
  console.log('=== STARTING COMPLETE AUTH & PROFILE FLOW VERIFICATION ===\n');

  // STEP 1: LOGIN JESEN
  console.log('1. Attempting login as Jesen (jesen2307@gmail.com)...');
  const loginJesen = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jesen2307@gmail.com', password: 'password123' }),
  });

  if (!loginJesen.ok) {
    console.error('❌ Failed to login as Jesen:', loginJesen.data);
    process.exit(1);
  }
  console.log('✅ Login Jesen success status:', loginJesen.status);
  const jesenCookies = extractCookies(loginJesen.headers);
  console.log('🔑 Received session cookies for Jesen');

  // STEP 2: VERIFY /api/auth/me for Jesen
  console.log('\n2. Fetching /api/auth/me for Jesen...');
  const meJesen = await request(`${FRONTEND_URL}/api/auth/me`, {
    headers: { Cookie: jesenCookies },
  });

  if (!meJesen.ok) {
    console.error('❌ Failed to fetch /api/auth/me:', meJesen.data);
    process.exit(1);
  }

  const jesenUser = meJesen.data;
  console.log('Profile data for Jesen:', {
    email: jesenUser.email,
    role: jesenUser.role,
    employeeName: `${jesenUser.employee?.firstName || ''} ${jesenUser.employee?.lastName || ''}`.trim(),
  });

  const jesenName = `${jesenUser.employee?.firstName || ''} ${jesenUser.employee?.lastName || ''}`.trim();
  if (jesenName !== 'Jesen') {
    console.error(`❌ Expected name "Jesen", got "${jesenName}"`);
    process.exit(1);
  }
  if (jesenUser.role !== 'EMPLOYEE') {
    console.error(`❌ Expected role "EMPLOYEE", got "${jesenUser.role}"`);
    process.exit(1);
  }
  console.log('✅ PASS: Display Name = Jesen, Role = EMPLOYEE');

  // STEP 3: SIMULATE REFRESH (same cookies)
  console.log('\n3. Simulating page refresh for Jesen...');
  const refreshJesen = await request(`${FRONTEND_URL}/api/auth/me`, {
    headers: { Cookie: jesenCookies, 'Cache-Control': 'no-cache' },
  });
  const refreshedUser = refreshJesen.data;
  const refreshedName = `${refreshedUser.employee?.firstName || ''} ${refreshedUser.employee?.lastName || ''}`.trim();
  if (refreshedName === 'Jesen' && refreshedUser.role === 'EMPLOYEE') {
    console.log('✅ PASS: Refresh retains Jesen / EMPLOYEE correctly');
  } else {
    console.error('❌ Refresh failed to retain Jesen profile:', refreshedUser);
    process.exit(1);
  }

  // STEP 4: LOGOUT JESEN
  console.log('\n4. Logging out Jesen...');
  const logoutRes = await request(`${FRONTEND_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: jesenCookies },
  });
  console.log('✅ Logout status:', logoutRes.status);

  // STEP 5: VERIFY UNAUTHENTICATED AFTER LOGOUT
  console.log('\n5. Verifying unauthenticated access (no cookies)...');
  const meUnauth = await request(`${FRONTEND_URL}/api/auth/me`);
  if (meUnauth.status === 401) {
    console.log('✅ PASS: /api/auth/me returns 401 Unauthorized');
  } else {
    console.error('❌ Expected 401, got:', meUnauth.status);
    process.exit(1);
  }

  // STEP 6: LOGIN ANOTHER USER (Budi Santoso)
  console.log('\n6. Logging in as another user: Budi Santoso (budi.santoso@example.com)...');
  const loginBudi = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'budi.santoso@example.com', password: 'password123' }),
  });

  if (!loginBudi.ok) {
    console.error('❌ Failed to login as Budi:', loginBudi.data);
    process.exit(1);
  }
  const budiCookies = extractCookies(loginBudi.headers);
  const meBudi = await request(`${FRONTEND_URL}/api/auth/me`, {
    headers: { Cookie: budiCookies },
  });
  const budiUser = meBudi.data;
  const budiName = `${budiUser.employee?.firstName || ''} ${budiUser.employee?.lastName || ''}`.trim();
  console.log('Profile data for Budi:', {
    email: budiUser.email,
    role: budiUser.role,
    employeeName: budiName,
  });

  if (budiName !== 'Budi Santoso' || budiUser.role !== 'EMPLOYEE') {
    console.error('❌ Failed profile check for Budi Santoso:', budiUser);
    process.exit(1);
  }
  console.log('✅ PASS: Profile switched cleanly to Budi Santoso / EMPLOYEE');

  // STEP 7: LOGIN ADMIN USER
  console.log('\n7. Logging in as Admin (admin@example.com)...');
  const loginAdmin = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
  });
  if (!loginAdmin.ok) {
    console.error('❌ Failed to login as Admin:', loginAdmin.data);
    process.exit(1);
  }
  const adminCookies = extractCookies(loginAdmin.headers);
  const meAdmin = await request(`${FRONTEND_URL}/api/auth/me`, {
    headers: { Cookie: adminCookies },
  });
  const adminUser = meAdmin.data;
  const adminName = `${adminUser.employee?.firstName || ''} ${adminUser.employee?.lastName || ''}`.trim();
  console.log('Profile data for Admin:', {
    email: adminUser.email,
    role: adminUser.role,
    employeeName: adminName,
  });
  if (adminName !== 'Administrator' || adminUser.role !== 'ADMIN') {
    console.error('❌ Failed profile check for Admin:', adminUser);
    process.exit(1);
  }
  console.log('✅ PASS: Profile switched cleanly to Administrator / ADMIN');

  // STEP 8: LOGIN HR USER
  console.log('\n8. Logging in as HR (emily.zhao@company.com)...');
  const loginHR = await request(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emily.zhao@company.com', password: 'password123' }),
  });
  if (!loginHR.ok) {
    console.error('❌ Failed to login as HR:', loginHR.data);
    process.exit(1);
  }
  const hrCookies = extractCookies(loginHR.headers);
  const meHR = await request(`${FRONTEND_URL}/api/auth/me`, {
    headers: { Cookie: hrCookies },
  });
  const hrUser = meHR.data;
  const hrName = `${hrUser.employee?.firstName || ''} ${hrUser.employee?.lastName || ''}`.trim();
  console.log('Profile data for HR:', {
    email: hrUser.email,
    role: hrUser.role,
    employeeName: hrName,
  });
  if (hrName !== 'Emily Zhao' || hrUser.role !== 'HR') {
    console.error('❌ Failed profile check for HR:', hrUser);
    process.exit(1);
  }
  console.log('✅ PASS: Profile switched cleanly to Emily Zhao / HR');

  console.log('\n======================================================');
  console.log('🎉 ALL AUTH PROFILE & SESSION RESOLUTION TESTS PASSED!');
  console.log('======================================================\n');
}

run().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
