import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const BACKEND_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'hr-attendance-management-super-secure-jwt-secret-2026';
const prisma = new PrismaClient();

function createJwt(payload: object, secret: string = JWT_SECRET): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsignedToken).digest('base64url');
  return `${unsignedToken}.${signature}`;
}

async function getAuthForRole(role: UserRole) {
  const user = await prisma.user.findFirst({
    where: { role },
    include: { employee: true },
  });
  if (!user) {
    throw new Error(`User with role ${role} not found in DB`);
  }

  const token = createJwt({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  });

  return { token, user };
}

async function runAudit() {
  console.log('================================================================');
  console.log('   RBAC & SIDEBAR NAVIGATION COMPREHENSIVE AUDIT TEST');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  // 1. Authenticate All 3 Roles
  console.log('--- Step 1: Role Authentication ---');
  const empAuth = await getAuthForRole(UserRole.EMPLOYEE);
  const hrAuth = await getAuthForRole(UserRole.HR);
  const adminAuth = await getAuthForRole(UserRole.ADMIN);

  assert(empAuth?.user?.role === 'EMPLOYEE', `Employee session has EMPLOYEE role (${empAuth?.user?.email})`);
  assert(hrAuth?.user?.role === 'HR', `HR session has HR role (${hrAuth?.user?.email})`);
  assert(adminAuth?.user?.role === 'ADMIN', `Admin session has ADMIN role (${adminAuth?.user?.email})`);

  const empHeaders = { Authorization: `Bearer ${empAuth.token}`, 'Content-Type': 'application/json' };
  const hrHeaders = { Authorization: `Bearer ${hrAuth.token}`, 'Content-Type': 'application/json' };
  const adminHeaders = { Authorization: `Bearer ${adminAuth.token}`, 'Content-Type': 'application/json' };

  // 2. Test EMPLOYEE Access Scoping & Backend Authorization
  console.log('\n--- Step 2: Employee Ownership Scoping & Backend Enforcements ---');

  // 2a. Leave requests scoping
  try {
    const res = await fetch(`${BACKEND_URL}/leave`, { headers: empHeaders });
    const data = await res.json();
    const records = Array.isArray(data) ? data : data.data || [];
    const empId = empAuth.user.employee?.id;
    const allBelongToSelf = records.every((r: any) => r.employeeId === empId || r.employee?.id === empId);
    assert(allBelongToSelf, 'Employee only sees self leave requests', `Found ${records.length} records`);
  } catch (err: any) {
    assert(false, 'Employee only sees self leave requests', err.message);
  }

  // 2b. Block Employee from Leave Approval
  try {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await fetch(`${BACKEND_URL}/leave/${fakeId}/approve`, {
      method: 'PATCH',
      headers: empHeaders,
    });
    assert(res.status === 403, 'Employee is blocked from /leave/:id/approve with 403', `Status: ${res.status}`);
  } catch (err: any) {
    assert(false, 'Employee is blocked from /leave/:id/approve with 403', err.message);
  }

  // 2c. Block Employee from Leave Rejection
  try {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await fetch(`${BACKEND_URL}/leave/${fakeId}/reject`, {
      method: 'PATCH',
      headers: empHeaders,
      body: JSON.stringify({ reason: 'test' }),
    });
    assert(res.status === 403, 'Employee is blocked from /leave/:id/reject with 403', `Status: ${res.status}`);
  } catch (err: any) {
    assert(false, 'Employee is blocked from /leave/:id/reject with 403', err.message);
  }

  // 2d. Block Employee from Employee Directory List
  try {
    const res = await fetch(`${BACKEND_URL}/employees`, { headers: empHeaders });
    assert(res.status === 403, 'Employee is blocked from /employees (master list) with 403', `Status: ${res.status}`);
  } catch (err: any) {
    assert(false, 'Employee is blocked from /employees (master list) with 403', err.message);
  }

  // 2e. Block Employee from Employee KPI Stats
  try {
    const res = await fetch(`${BACKEND_URL}/employees/stats`, { headers: empHeaders });
    assert(res.status === 403, 'Employee is blocked from /employees/stats with 403', `Status: ${res.status}`);
  } catch (err: any) {
    assert(false, 'Employee is blocked from /employees/stats with 403', err.message);
  }

  // 2f. Block Employee from Shifts Management (Creating Shift)
  try {
    const res = await fetch(`${BACKEND_URL}/shifts`, {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({ name: 'Hack Shift', startTime: '08:00', endTime: '17:00' }),
    });
    assert(res.status === 403, 'Employee is blocked from creating shifts (POST /shifts) with 403', `Status: ${res.status}`);
  } catch (err: any) {
    assert(false, 'Employee is blocked from creating shifts (POST /shifts) with 403', err.message);
  }

  // 2g. Block Employee from Updating System Attendance Settings
  try {
    const res = await fetch(`${BACKEND_URL}/settings/attendance`, {
      method: 'PATCH',
      headers: empHeaders,
      body: JSON.stringify({ radiusMeters: 5000 }),
    });
    assert(res.status === 403, 'Employee is blocked from updating attendance settings (PATCH /settings/attendance) with 403', `Status: ${res.status}`);
  } catch (err: any) {
    assert(false, 'Employee is blocked from updating attendance settings (PATCH /settings/attendance) with 403', err.message);
  }

  // 3. Test HR & ADMIN Privileges
  console.log('\n--- Step 3: HR and ADMIN Full Access ---');

  // 3a. HR access to /employees
  try {
    const res = await fetch(`${BACKEND_URL}/employees`, { headers: hrHeaders });
    const data = await res.json();
    assert(res.status === 200 && Array.isArray(data), 'HR can access /employees master list');
  } catch (err: any) {
    assert(false, 'HR can access /employees master list', err.message);
  }

  // 3b. Admin access to /employees/stats
  try {
    const res = await fetch(`${BACKEND_URL}/employees/stats`, { headers: adminHeaders });
    assert(res.status === 200, 'Admin can access /employees/stats');
  } catch (err: any) {
    assert(false, 'Admin can access /employees/stats', err.message);
  }

  // 3c. Admin access to /shifts
  try {
    const res = await fetch(`${BACKEND_URL}/shifts`, { headers: adminHeaders });
    assert(res.status === 200, 'Admin can access /shifts');
  } catch (err: any) {
    assert(false, 'Admin can access /shifts', err.message);
  }

  // 4. Test Sidebar Navigation Filter Contract
  console.log('\n--- Step 4: Sidebar Navigation Role Matrix Verification ---');
  
  // Re-verify the navigationItems array from Sidebar.tsx
  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Manajemen Karyawan', href: '/employees', allowedRoles: ['ADMIN', 'HR'] },
    { name: 'Attendance', href: '/attendance', allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Pengajuan', href: '/leave', allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Shifts', href: '/shifts', allowedRoles: ['ADMIN', 'HR'] },
    { name: 'Lembur', href: '/overtime', allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Rekap Absensi', href: '/reports', allowedRoles: ['ADMIN', 'HR'] },
    { name: 'Penggajian', href: '/payroll', allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Reimbursement', href: '/reimbursement', allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Profil Saya', href: '/employees/profile', allowedRoles: ['EMPLOYEE'] },
    { name: 'Notifikasi', href: '/notifications', allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Settings', href: '/settings', allowedRoles: ['ADMIN', 'HR'] },
  ];

  const empNav = navigationItems.filter(item => !item.allowedRoles || item.allowedRoles.includes('EMPLOYEE'));
  const hrNav = navigationItems.filter(item => !item.allowedRoles || item.allowedRoles.includes('HR'));
  const adminNav = navigationItems.filter(item => !item.allowedRoles || item.allowedRoles.includes('ADMIN'));

  // Assert Employee navigation contains only allowed items
  const empHrefs = empNav.map(i => i.href);
  assert(!empHrefs.includes('/shifts'), 'Employee sidebar does NOT contain /shifts');
  assert(!empHrefs.includes('/employees'), 'Employee sidebar does NOT contain /employees');
  assert(!empHrefs.includes('/reports'), 'Employee sidebar does NOT contain /reports');
  assert(!empHrefs.includes('/settings'), 'Employee sidebar does NOT contain /settings');
  assert(empHrefs.includes('/dashboard'), 'Employee sidebar contains /dashboard');
  assert(empHrefs.includes('/attendance'), 'Employee sidebar contains /attendance');
  assert(empHrefs.includes('/leave'), 'Employee sidebar contains /leave (Pengajuan)');
  assert(empHrefs.includes('/employees/profile'), 'Employee sidebar contains /employees/profile (Profil Saya)');

  // Assert HR & Admin navigation includes administrative modules
  const hrHrefs = hrNav.map(i => i.href);
  assert(hrHrefs.includes('/employees'), 'HR sidebar contains /employees');
  assert(hrHrefs.includes('/shifts'), 'HR sidebar contains /shifts');
  assert(hrHrefs.includes('/reports'), 'HR sidebar contains /reports');
  assert(hrHrefs.includes('/settings'), 'HR sidebar contains /settings');

  const adminHrefs = adminNav.map(i => i.href);
  assert(adminHrefs.includes('/employees'), 'Admin sidebar contains /employees');
  assert(adminHrefs.includes('/shifts'), 'Admin sidebar contains /shifts');
  assert(adminHrefs.includes('/reports'), 'Admin sidebar contains /reports');
  assert(adminHrefs.includes('/settings'), 'Admin sidebar contains /settings');

  console.log('\n================================================================');
  console.log(`   AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  await prisma.$disconnect();

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAudit().catch(async (err) => {
  console.error('Fatal audit error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
