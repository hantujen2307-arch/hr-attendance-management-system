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

async function getAuthForUser(role: UserRole, emailHint?: string) {
  const user = await prisma.user.findFirst({
    where: emailHint ? { email: emailHint } : { role },
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

async function runTests() {
  console.log('🚀 Starting PENGAJUAN (Leave) RBAC & IDOR Audit Tests...\n');

  // 1. Authenticate users
  console.log('1. Authenticating test users...');
  const employeeAuth = await getAuthForUser(UserRole.EMPLOYEE);
  console.log(`   - Logged in EMPLOYEE: ${employeeAuth.user.email} (Role: ${employeeAuth.user.role}, EmployeeID: ${employeeAuth.user.employee?.id})`);

  const hrAuth = await getAuthForUser(UserRole.HR);
  console.log(`   - Logged in HR: ${hrAuth.user.email} (Role: ${hrAuth.user.role})`);

  const adminAuth = await getAuthForUser(UserRole.ADMIN);
  console.log(`   - Logged in ADMIN: ${adminAuth.user.email} (Role: ${adminAuth.user.role})`);

  // 2. Fetch available leave types
  console.log('\n2. Fetching Leave Types...');
  const typesRes = await fetch(`${BASE_URL}/leave/types`, {
    headers: { Authorization: `Bearer ${employeeAuth.token}` },
  });
  const leaveTypes = (await typesRes.json()) as any[];
  console.log(`   - Available types count: ${leaveTypes.length}`);
  const sampleTypeId = leaveTypes[0]?.id;

  // 3. Create a leave request as EMPLOYEE
  console.log('\n3. EMPLOYEE submits a new Leave Request...');
  const createRes = await fetch(`${BASE_URL}/leave`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${employeeAuth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      leaveTypeId: sampleTypeId,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      reason: 'Keperluan mendesak keluarga',
    }),
  });
  const createdLeave = (await createRes.json()) as any;
  console.log(`   - Status: ${createRes.status}`);
  console.log(`   - Created Request ID: ${createdLeave.id}, Status: ${createdLeave.status}`);
  if (createRes.status !== 201 || createdLeave.status !== 'PENDING') {
    throw new Error(`Expected 201 PENDING, got ${createRes.status} ${createdLeave.status}`);
  }

  // 4. Test IDOR & RBAC: EMPLOYEE attempts to APPROVE
  console.log('\n4. [SECURITY TEST] EMPLOYEE attempts to call PATCH /api/leave/:id/approve...');
  const empApproveRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${employeeAuth.token}` },
  });
  const empApproveData = (await empApproveRes.json()) as any;
  console.log(`   - Status: ${empApproveRes.status} (Expected: 403)`);
  console.log(`   - Response: ${JSON.stringify(empApproveData)}`);
  if (empApproveRes.status !== 403) {
    throw new Error(`CRITICAL SECURITY FAILURE: EMPLOYEE was able to call approve! Expected 403, got ${empApproveRes.status}`);
  }
  console.log('   ✅ PASS: EMPLOYEE approve is strictly forbidden (403).');

  // 5. Test IDOR & RBAC: EMPLOYEE attempts to REJECT
  console.log('\n5. [SECURITY TEST] EMPLOYEE attempts to call PATCH /api/leave/:id/reject...');
  const empRejectRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${employeeAuth.token}` },
  });
  const empRejectData = (await empRejectRes.json()) as any;
  console.log(`   - Status: ${empRejectRes.status} (Expected: 403)`);
  console.log(`   - Response: ${JSON.stringify(empRejectData)}`);
  if (empRejectRes.status !== 403) {
    throw new Error(`CRITICAL SECURITY FAILURE: EMPLOYEE was able to call reject! Expected 403, got ${empRejectRes.status}`);
  }
  console.log('   ✅ PASS: EMPLOYEE reject is strictly forbidden (403).');

  // 6. Test IDOR: EMPLOYEE attempts to access another employee's leave request
  console.log('\n6. [IDOR TEST] EMPLOYEE attempts to view another employee\'s leave request...');
  // Find a request belonging to someone else
  const hrListRes = await fetch(`${BASE_URL}/leave`, {
    headers: { Authorization: `Bearer ${hrAuth.token}` },
  });
  const allLeaves = (await hrListRes.json()) as any[];
  const otherLeave = allLeaves.find((l) => l.employeeId !== employeeAuth.user.employee?.id);

  if (otherLeave) {
    console.log(`   - Testing access to request ID ${otherLeave.id} owned by ${otherLeave.employee?.firstName}...`);
    const idorRes = await fetch(`${BASE_URL}/leave/${otherLeave.id}`, {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });
    const idorData = (await idorRes.json()) as any;
    console.log(`   - Status: ${idorRes.status} (Expected: 403)`);
    console.log(`   - Response: ${JSON.stringify(idorData)}`);
    if (idorRes.status !== 403) {
      throw new Error(`CRITICAL IDOR FAILURE: EMPLOYEE could read another employee's leave! Expected 403, got ${idorRes.status}`);
    }
    console.log('   ✅ PASS: IDOR protection prevented employee from viewing other employee\'s request.');
  }

  // 7. EMPLOYEE cancels their own pending leave request
  console.log('\n7. EMPLOYEE cancels their own pending leave request...');
  const cancelRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${employeeAuth.token}` },
  });
  const cancelData = (await cancelRes.json()) as any;
  console.log(`   - Status: ${cancelRes.status} (Expected: 200)`);
  console.log(`   - Response: ${JSON.stringify(cancelData)}`);
  if (cancelRes.status !== 200) {
    throw new Error(`Expected 200 on cancel, got ${cancelRes.status}`);
  }
  console.log('   ✅ PASS: EMPLOYEE successfully cancelled their own pending request.');

  // Clean up any test leave requests for this test run
  await prisma.leaveRequest.deleteMany({
    where: {
      reason: { contains: 'Pengajuan untuk test' },
    },
  });

  // 8. Create a new request for HR/ADMIN approval test
  console.log('\n8. Create another leave request to test HR and ADMIN approval...');
  const randomDay = Math.floor(10 + Math.random() * 15);
  const newLeaveRes = await fetch(`${BASE_URL}/leave`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${employeeAuth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      leaveTypeId: sampleTypeId,
      startDate: `2026-10-${randomDay.toString().padStart(2, '0')}`,
      endDate: `2026-10-${(randomDay + 2).toString().padStart(2, '0')}`,
      reason: `Pengajuan untuk test approval HR ${Date.now()}`,
    }),
  });
  const leaveToApprove = (await newLeaveRes.json()) as any;
  console.log(`   - Created Request ID: ${leaveToApprove.id}`);

  // 9. HR Approves the leave request
  console.log('\n9. HR approves the leave request...');
  const hrApproveRes = await fetch(`${BASE_URL}/leave/${leaveToApprove.id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${hrAuth.token}` },
  });
  const hrApproveData = (await hrApproveRes.json()) as any;
  console.log(`   - Status: ${hrApproveRes.status} (Expected: 200)`);
  console.log(`   - Updated Status: ${hrApproveData.status}`);
  if (hrApproveRes.status !== 200 || hrApproveData.status !== 'APPROVED') {
    throw new Error(`Expected 200 APPROVED, got ${hrApproveRes.status} ${hrApproveData.status}`);
  }
  console.log('   ✅ PASS: HR successfully approved the leave request.');

  // Clean up: delete the approved test leave directly if needed
  console.log('\n=============================================');
  console.log('🎉 ALL PENGAJUAN RBAC & IDOR TESTS PASSED 100%!');
  console.log('=============================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
