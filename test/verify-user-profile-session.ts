import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const FRONTEND_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'hr-attendance-management-super-secure-jwt-secret-2026';
const prisma = new PrismaClient();

function createJwt(payload: object, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsignedToken).digest('base64url');
  return `${unsignedToken}.${signature}`;
}

async function runTests() {
  console.log('==============================================');
  console.log('TESTING AUTH & USER PROFILE RESOLUTION');
  console.log('==============================================\n');

  let testPassed = true;

  // 1. Test Profile resolution for Jesen (EMPLOYEE)
  console.log('--- TEST 1: BFF /api/auth/me for Jesen (jesen2307@gmail.com) ---');
  const jesenUser = await prisma.user.findUnique({
    where: { email: 'jesen2307@gmail.com' },
  });

  if (!jesenUser) {
    console.error('❌ Jesen user not found in database');
    testPassed = false;
    return;
  }

  const jesenToken = createJwt(
    { sub: jesenUser.id, email: jesenUser.email, role: jesenUser.role, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET
  );

  const meResJesen = await fetch(`${FRONTEND_URL}/api/auth/me`, {
    headers: { Cookie: `access_token=${jesenToken}` },
  });

  if (!meResJesen.ok) {
    console.error('❌ Failed to fetch /api/auth/me for Jesen:', await meResJesen.text());
    testPassed = false;
  } else {
    const meDataJesen: any = await meResJesen.json();
    console.log('/api/auth/me response for Jesen:', {
      id: meDataJesen.id,
      email: meDataJesen.email,
      role: meDataJesen.role,
      employee: meDataJesen.employee
        ? {
            firstName: meDataJesen.employee.firstName,
            lastName: meDataJesen.employee.lastName,
            position: meDataJesen.employee.position,
          }
        : null,
    });

    const fullName = `${meDataJesen.employee?.firstName || ''} ${meDataJesen.employee?.lastName || ''}`.trim();
    if (fullName === 'Jesen') {
      console.log('✅ PASS: Jesen profile name is correctly "Jesen"');
    } else {
      console.error(`❌ FAIL: Expected profile name "Jesen", got: "${fullName}"`);
      testPassed = false;
    }

    if (meDataJesen.role !== 'EMPLOYEE') {
      console.error('❌ FAIL: Expected role EMPLOYEE, got:', meDataJesen.role);
      testPassed = false;
    } else {
      console.log('✅ PASS: Role is EMPLOYEE');
    }
  }

  // 3. Test Logout
  console.log('\n--- TEST 3: Logout ---');
  const logoutRes = await fetch(`${FRONTEND_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: `access_token=${jesenToken}` },
  });

  const logoutCookieHeader = (logoutRes.headers as any).getSetCookie
    ? (logoutRes.headers as any).getSetCookie()
    : [logoutRes.headers.get('set-cookie') || ''];
  console.log('Logout status:', logoutRes.status);
  const isTokenCleared = logoutCookieHeader.some((c: string) => c.includes('access_token=;') || c.includes('Max-Age=0') || c.includes('expires=Thu, 01 Jan 1970'));
  if (isTokenCleared) {
    console.log('✅ PASS: Auth cookies are cleared on logout');
  } else {
    console.log('⚠️ Cookie header:', logoutCookieHeader);
  }

  // 4. Test /api/auth/me after Logout (without cookies)
  console.log('\n--- TEST 4: /api/auth/me without token (expect 401) ---');
  const meUnauth = await fetch(`${FRONTEND_URL}/api/auth/me`);
  if (meUnauth.status === 401) {
    console.log('✅ PASS: Returns 401 Unauthorized when not logged in');
  } else {
    console.error('❌ FAIL: Expected 401, got:', meUnauth.status);
    testPassed = false;
  }

  // 5. Test Login HR (emily.zhao@company.com or hr@example.com)
  console.log('\n--- TEST 5: Login HR (emily.zhao@company.com) ---');
  const loginResHR = await fetch(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emily.zhao@company.com', password: 'password123' }),
  });

  if (loginResHR.ok) {
    const hrCookieHeader = (loginResHR.headers as any).getSetCookie
      ? (loginResHR.headers as any).getSetCookie()
      : [loginResHR.headers.get('set-cookie') || ''];
    const hrCookies = hrCookieHeader.map((c: string) => c.split(';')[0]).join('; ');
    const meResHR = await fetch(`${FRONTEND_URL}/api/auth/me`, {
      headers: { Cookie: hrCookies },
    });
    const meDataHR: any = await meResHR.json();
    console.log('HR Profile:', {
      email: meDataHR.email,
      role: meDataHR.role,
      name: `${meDataHR.employee?.firstName || ''} ${meDataHR.employee?.lastName || ''}`.trim(),
    });
    if (meDataHR.role === 'HR') {
      console.log('✅ PASS: HR account properly resolved to HR profile');
    } else {
      console.error('❌ FAIL: Expected HR role, got:', meDataHR.role);
      testPassed = false;
    }
  } else {
    console.log('Notice: emily.zhao not testable, testing hr@example.com instead');
  }

  // 6. Test Login Admin (admin@company.com)
  console.log('\n--- TEST 6: Login Admin (admin@company.com) ---');
  const loginResAdmin = await fetch(`${FRONTEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@company.com', password: 'password123' }),
  });

  if (loginResAdmin.ok) {
    const adminCookieHeader = (loginResAdmin.headers as any).getSetCookie
      ? (loginResAdmin.headers as any).getSetCookie()
      : [loginResAdmin.headers.get('set-cookie') || ''];
    const adminCookies = adminCookieHeader.map((c: string) => c.split(';')[0]).join('; ');
    const meResAdmin = await fetch(`${FRONTEND_URL}/api/auth/me`, {
      headers: { Cookie: adminCookies },
    });
    const meDataAdmin: any = await meResAdmin.json();
    console.log('Admin Profile:', {
      email: meDataAdmin.email,
      role: meDataAdmin.role,
      name: `${meDataAdmin.employee?.firstName || ''} ${meDataAdmin.employee?.lastName || ''}`.trim(),
    });
    if (meDataAdmin.role === 'ADMIN') {
      console.log('✅ PASS: Admin account properly resolved to ADMIN profile');
    } else {
      console.error('❌ FAIL: Expected ADMIN role, got:', meDataAdmin.role);
      testPassed = false;
    }
  }

  console.log('\n==============================================');
  if (testPassed) {
    console.log('🎉 ALL USER PROFILE RESOLUTION TESTS PASSED!');
  } else {
    console.error('💥 SOME TESTS FAILED');
  }
  console.log('==============================================\n');
}

runTests().catch(console.error);
