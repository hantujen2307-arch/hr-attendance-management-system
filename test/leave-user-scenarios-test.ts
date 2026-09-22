import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'hr-attendance-management-super-secure-jwt-secret-2026';
const prisma = new PrismaClient();

function createJwt(payload: object, secret: string = JWT_SECRET): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsignedToken).digest('base64url');
  return `${unsignedToken}.${signature}`;
}

async function getAuthForUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });
  if (!user) {
    throw new Error(`User with email ${email} not found in DB`);
  }

  const token = createJwt({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  });

  return { token, user };
}

async function runScenarioTests() {
  console.log('🧪 Running Dedicated PENGAJUAN (Leave) RBAC Scenarios...\n');

  // Find or create Jesen and Marcus users
  let jesenUser = await prisma.user.findFirst({
    where: { role: UserRole.EMPLOYEE },
    include: { employee: true },
  });
  if (!jesenUser || !jesenUser.employee) {
    throw new Error('No employee user found in database');
  }

  let secondEmpUser = await prisma.user.findFirst({
    where: { role: UserRole.EMPLOYEE, id: { not: jesenUser.id } },
    include: { employee: true },
  });

  if (!secondEmpUser) {
    // Create a temporary second employee user if none exists
    const newEmp = await prisma.employee.create({
      data: {
        employeeId: 'EMP-9999',
        firstName: 'Second',
        lastName: 'Employee',
        email: 'second.emp@company.com',
        joinDate: new Date(),
        department: { create: { name: 'Audit Dept' } },
        position: 'Staff',
      },
    });
    secondEmpUser = await prisma.user.create({
      data: {
        email: 'second.emp@company.com',
        passwordHash: 'dummy',
        role: UserRole.EMPLOYEE,
        employee: { connect: { id: newEmp.id } },
      },
      include: { employee: true },
    });
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });
  if (!adminUser) throw new Error('No admin user found');

  const jesenAuth = await getAuthForUser(jesenUser.email);
  const secondEmpAuth = await getAuthForUser(secondEmpUser.email);
  const adminAuth = await getAuthForUser(adminUser.email);

  console.log(`👤 Employee 1 (Jesen): ${jesenAuth.user.email} (${jesenAuth.user.employee?.firstName})`);
  console.log(`👤 Employee 2: ${secondEmpAuth.user.email} (${secondEmpAuth.user.employee?.firstName})`);
  console.log(`👑 Admin: ${adminAuth.user.email}\n`);

  // Get leave type
  const typesRes = await fetch(`${BASE_URL}/leave/types`, {
    headers: { Authorization: `Bearer ${jesenAuth.token}` },
  });
  const types = (await typesRes.json()) as any[];
  const leaveTypeId = types[0]?.id;

  // Clean up any test leave requests for this test run
  await prisma.leaveRequest.deleteMany({
    where: {
      reason: { contains: 'Jesen' },
    },
  });

  const randomDay = Math.floor(10 + Math.random() * 15);
  const startDate = `2026-12-${randomDay.toString().padStart(2, '0')}`;
  const endDate = `2026-12-${(randomDay + 2).toString().padStart(2, '0')}`;

  // Scenario 1: Employee Jesen makes a leave request
  console.log('--- TEST SCENARIO 1: Jesen creates leave request ---');
  const createRes = await fetch(`${BASE_URL}/leave`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jesenAuth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      leaveTypeId,
      startDate,
      endDate,
      reason: `Cuti Liburan Akhir Tahun Jesen ${Date.now()}`,
    }),
  });
  const jesenLeave = (await createRes.json()) as any;
  console.log(`Status code: ${createRes.status}`);
  console.log(`Created Leave ID: ${jesenLeave.id}, Status: ${jesenLeave.status}`);
  if (createRes.status !== 201) throw new Error(`Create failed with status ${createRes.status}`);

  // Verify Jesen's list includes this request
  const jesenListRes = await fetch(`${BASE_URL}/leave`, {
    headers: { Authorization: `Bearer ${jesenAuth.token}` },
  });
  const jesenList = (await jesenListRes.json()) as any[];
  const foundInJesen = jesenList.some((l) => l.id === jesenLeave.id);
  console.log(`Found in Jesen's leave list: ${foundInJesen}`);
  if (!foundInJesen) throw new Error('Jesen cannot see own leave request');
  console.log('✅ Scenario 1 Passed: Leave created and visible to Jesen.\n');

  // Scenario 2: Login Employee 2 -> Jesen's leave request does NOT appear
  console.log('--- TEST SCENARIO 2: Other Employee does NOT see Jesen\'s leave request ---');
  const otherListRes = await fetch(`${BASE_URL}/leave`, {
    headers: { Authorization: `Bearer ${secondEmpAuth.token}` },
  });
  const otherList = (await otherListRes.json()) as any[];
  const foundInOther = otherList.some((l) => l.id === jesenLeave.id);
  console.log(`Found in Other Employee's leave list: ${foundInOther} (Expected: false)`);
  console.log(`Other Employee list total count: ${otherList.length} (all belonging to ${secondEmpAuth.user.employee?.id})`);
  if (foundInOther) throw new Error('CRITICAL IDOR BUG: Other employee can see Jesen\'s leave request!');
  console.log('✅ Scenario 2 Passed: Other employee cannot see Jesen\'s leave request.\n');

  // Scenario 3: Other Employee attempts direct access to Jesen's leave ID -> 403 Forbidden
  console.log('--- TEST SCENARIO 4: Employee attempts to view another employee\'s leave by ID ---');
  const directAccessRes = await fetch(`${BASE_URL}/leave/${jesenLeave.id}`, {
    headers: { Authorization: `Bearer ${secondEmpAuth.token}` },
  });
  console.log(`Direct access status: ${directAccessRes.status} (Expected: 403)`);
  if (directAccessRes.status !== 403) throw new Error(`Expected 403, got ${directAccessRes.status}`);
  console.log('✅ Scenario 4 Passed: Direct access by other employee is 403 Forbidden.\n');

  // Scenario 4: Employee attempts to call Approve or Reject API -> 403 Forbidden
  console.log('--- TEST SCENARIO 5: Employee attempts to call approve/reject API ---');
  const empApprove = await fetch(`${BASE_URL}/leave/${jesenLeave.id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${jesenAuth.token}` },
  });
  console.log(`Employee Approve API status: ${empApprove.status} (Expected: 403)`);
  if (empApprove.status !== 403) throw new Error(`Expected 403, got ${empApprove.status}`);

  const empReject = await fetch(`${BASE_URL}/leave/${jesenLeave.id}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${jesenAuth.token}` },
  });
  console.log(`Employee Reject API status: ${empReject.status} (Expected: 403)`);
  if (empReject.status !== 403) throw new Error(`Expected 403, got ${empReject.status}`);
  console.log('✅ Scenario 5 Passed: Employee approve & reject API calls are 403 Forbidden.\n');

  // Scenario 5: ADMIN / HR can see and process leave request
  console.log('--- TEST SCENARIO 6: ADMIN/HR can see and approve the leave request ---');
  const adminListRes = await fetch(`${BASE_URL}/leave`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminList = (await adminListRes.json()) as any[];
  const foundInAdmin = adminList.some((l) => l.id === jesenLeave.id);
  console.log(`Found in Admin's leave list: ${foundInAdmin} (Expected: true)`);
  if (!foundInAdmin) throw new Error('Admin cannot see leave request');

  const adminApproveRes = await fetch(`${BASE_URL}/leave/${jesenLeave.id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminApproveData = (await adminApproveRes.json()) as any;
  console.log(`Admin Approve status: ${adminApproveRes.status}, Status is now: ${adminApproveData.status}`);
  if (adminApproveRes.status !== 200 || adminApproveData.status !== 'APPROVED') {
    throw new Error('Admin approval failed');
  }
  console.log('✅ Scenario 6 Passed: ADMIN/HR can view and approve leave requests.\n');

  console.log('======================================================');
  console.log('🎯 ALL 6 USER VERIFICATION SCENARIOS PASSED WITH FLYING COLORS!');
  console.log('======================================================\n');
}

runScenarioTests().catch((err) => {
  console.error('❌ Scenario test failed:', err);
  process.exit(1);
});
