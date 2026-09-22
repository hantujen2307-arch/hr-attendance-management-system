import { PrismaClient, UserRole } from '@prisma/client';

const BACKEND_URL = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000/api';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error('   Details:', JSON.stringify(detail, null, 2));
    failed++;
  }
}

async function runSecuritySuite() {
  console.log('================================================================');
  console.log('🔒 RUNNING TAHAP 9: AUDIT & SECURITY HARDENING TEST SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATION & LOGIN HARDENING
    // -------------------------------------------------------------
    console.log('--- 1. Authentication & Audit Logging ---');

    // 1.1 Invalid credentials
    const invalidLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'WrongPassword999!' }),
    });
    assert(invalidLoginRes.status === 401, 'Wrong password returns 401 Unauthorized');

    // Verify LOGIN_FAILED audit log exists
    const failedLog = await prisma.auditLog.findFirst({
      where: {
        action: 'LOGIN_FAILED',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      !!failedLog &&
        (failedLog.metadata as any)?.email === 'admin@example.com' &&
        !(failedLog.metadata as any)?.password,
      'Audit log captures LOGIN_FAILED with sanitized metadata (no password exposed)'
    );

    // 1.2 Valid Admin Login
    const adminLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    });
    const adminLoginData = (await adminLoginRes.json()) as any;
    const adminToken = adminLoginData.access_token;
    assert(
      adminLoginRes.status === 200 &&
        !!adminToken &&
        !adminLoginData.user?.password &&
        !adminLoginData.user?.passwordHash,
      'Admin login succeeds with sanitized response (no password or hash returned)'
    );

    // Verify LOGIN_SUCCESS audit log
    const successLog = await prisma.auditLog.findFirst({
      where: {
        action: 'LOGIN_SUCCESS',
        userId: adminLoginData.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      !!successLog && !(successLog.metadata as any)?.token,
      'Audit log captures LOGIN_SUCCESS with sanitized metadata (no token exposed)'
    );

    // 1.3 Valid Employee Login
    const empLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@example.com', password: 'password123' }),
    });
    const empLoginData = (await empLoginRes.json()) as any;
    const empToken = empLoginData.access_token;
    const empUser = empLoginData.user;
    assert(
      empLoginRes.status === 200 && !!empToken && !!empUser?.employee?.id,
      'Employee login succeeds with linked employee profile'
    );

    // Fetch another employee ID for IDOR tests
    const otherEmployee = await prisma.employee.findFirst({
      where: {
        id: { not: empUser.employee.id },
      },
    });
    assert(!!otherEmployee, 'Another employee profile found for IDOR test');

    // -------------------------------------------------------------
    // 2. IDOR PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- 2. IDOR & Authorization Protection ---');

    // 2.1 Employee accessing own profile via GET /api/employees/:id
    const empSelfRes = await fetch(`${BACKEND_URL}/employees/${empUser.employee.id}`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(empSelfRes.status === 200, 'Employee can view their own profile (200 OK)');

    // 2.2 Employee accessing another employee's profile via GET /api/employees/:id
    const empIdorRes = await fetch(`${BACKEND_URL}/employees/${otherEmployee!.id}`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(
      empIdorRes.status === 403,
      'Employee is forbidden from accessing another employee profile (IDOR blocked with 403)'
    );

    // 2.3 Admin can view other employee profile
    const adminViewOtherRes = await fetch(`${BACKEND_URL}/employees/${otherEmployee!.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminViewOtherRes.status === 200, 'Admin can view any employee profile (200 OK)');

    // 2.4 Leave IDOR: Find or create leave for other employee
    let otherLeave = await prisma.leaveRequest.findFirst({
      where: { employeeId: otherEmployee!.id },
    });
    if (!otherLeave) {
      const leaveType = await prisma.leaveType.findFirst();
      otherLeave = await prisma.leaveRequest.create({
        data: {
          employeeId: otherEmployee!.id,
          leaveTypeId: leaveType!.id,
          startDate: new Date('2026-11-01'),
          endDate: new Date('2026-11-03'),
          duration: 3,
          reason: 'Other employee leave',
        },
      });
    }

    // Employee trying to access other employee's leave request
    const empLeaveIdorRes = await fetch(`${BACKEND_URL}/leave/${otherLeave.id}`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(
      empLeaveIdorRes.status === 403,
      'Employee forbidden from viewing other employee leave request (IDOR blocked with 403)'
    );

    // Admin viewing other employee leave request
    const adminLeaveRes = await fetch(`${BACKEND_URL}/leave/${otherLeave.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminLeaveRes.status === 200, 'Admin can view any leave request (200 OK)');

    // 2.5 Reports IDOR: Employee accessing department recap
    const empDeptReportRes = await fetch(`${BACKEND_URL}/reports/departments`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(
      empDeptReportRes.status === 403,
      'Employee forbidden from viewing organization department recap (403 Forbidden)'
    );

    // Admin accessing department recap
    const adminDeptReportRes = await fetch(`${BACKEND_URL}/reports/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDeptReportRes.status === 200, 'Admin can view department recap (200 OK)');

    // -------------------------------------------------------------
    // 3. INPUT BOUNDARIES & VALIDATION (DTO HARDENING)
    // -------------------------------------------------------------
    console.log('\n--- 3. Input Validation & Boundary Limits ---');

    // 3.1 Attendance limit bound (> 100)
    const overLimitRes = await fetch(`${BACKEND_URL}/attendance?limit=500`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      overLimitRes.status === 400,
      'Attendance limit > 100 is rejected by validation pipe (400 Bad Request)'
    );

    // 3.2 Attendance search bound (> 100 chars)
    const longSearch = 'A'.repeat(150);
    const overSearchRes = await fetch(`${BACKEND_URL}/attendance?search=${longSearch}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      overSearchRes.status === 400,
      'Attendance search > 100 characters is rejected (400 Bad Request)'
    );

    // 3.3 Reports limit bound (> 100)
    const reportsOverLimitRes = await fetch(`${BACKEND_URL}/reports/attendance?limit=250`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      reportsOverLimitRes.status === 400,
      'Reports limit > 100 is rejected by validation pipe (400 Bad Request)'
    );

    // 3.4 Notifications limit bound (> 100)
    const notifOverLimitRes = await fetch(`${BACKEND_URL}/notifications?limit=200`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      notifOverLimitRes.status === 400,
      'Notifications limit > 100 is rejected (400 Bad Request)'
    );

    // 3.5 Shifts query limit bound (> 100)
    const shiftsOverLimitRes = await fetch(`${BACKEND_URL}/shifts/assignments?limit=150`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      shiftsOverLimitRes.status === 400,
      'Schedule assignments limit > 100 is rejected (400 Bad Request)'
    );

    // 3.6 Shift assignment update validation
    const fakeScheduleId = '00000000-0000-0000-0000-000000000000';
    const invalidScheduleRes = await fetch(
      `${BACKEND_URL}/shifts/assignments/${fakeScheduleId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate: 'not-a-date' }),
      }
    );
    assert(
      invalidScheduleRes.status === 400,
      'PATCH /shifts/assignments/:id with invalid date format rejected (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // 4. FILE UPLOAD & SELFIE SECURITY
    // -------------------------------------------------------------
    console.log('\n--- 4. File Upload & Magic Byte Security ---');

    // 4.1 Non-image payload in check-in selfie (malicious text disguised as image)
    await prisma.attendance.deleteMany({
      where: {
        employeeId: empUser.employee.id,
        attendanceDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const maliciousPhotoPayload = 'data:image/jpeg;base64,' + Buffer.from('<script>alert("xss")</script>').toString('base64');
    const malformedCheckInRes = await fetch(`${BACKEND_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${empToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5,
        photo: maliciousPhotoPayload,
      }),
    });
    const malformedData = (await malformedCheckInRes.json()) as any;
    assert(
      malformedCheckInRes.status === 400 &&
        (malformedData.message?.includes('Format file tidak valid') ||
          malformedData.message?.includes('Hanya file JPEG, PNG, atau WebP') ||
          malformedData.message?.includes('tidak valid')),
      'Check-in selfie with non-image magic bytes is rejected (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // 5. ERROR SANITIZATION
    // -------------------------------------------------------------
    console.log('\n--- 5. Error Sanitization & Information Leakage ---');

    const notFoundRes = await fetch(`${BACKEND_URL}/employees/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const notFoundData = (await notFoundRes.json()) as any;
    const bodyStr = JSON.stringify(notFoundData);
    assert(
      notFoundRes.status === 404 &&
        !bodyStr.includes('prisma') &&
        !bodyStr.includes('SELECT') &&
        !bodyStr.includes('stack'),
      '404 Not Found error is sanitized (no prisma, SQL query, or stack trace in response)'
    );

    // -------------------------------------------------------------
    // 6. FRONTEND BFF DUAL COOKIES & SECURITY HEADERS
    // -------------------------------------------------------------
    console.log('\n--- 6. Frontend BFF & Cookie Security ---');

    // 6.1 BFF Login sets both access_token and auth_token
    const bffLoginRes = await fetch(`${FRONTEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    });
    const setCookieHeader = bffLoginRes.headers.get('set-cookie') || '';
    assert(
      bffLoginRes.status === 200 &&
        setCookieHeader.includes('access_token=') &&
        setCookieHeader.includes('auth_token=') &&
        setCookieHeader.includes('HttpOnly'),
      'BFF Login sets both access_token and auth_token HTTP-only cookies'
    );

    // 6.2 BFF Logout clears both cookies
    const bffLogoutRes = await fetch(`${FRONTEND_URL}/auth/logout`, {
      method: 'POST',
    });
    const logoutCookieHeader = bffLogoutRes.headers.get('set-cookie') || '';
    assert(
      bffLogoutRes.status === 200 &&
        logoutCookieHeader.includes('access_token=') &&
        logoutCookieHeader.includes('auth_token=') &&
        (logoutCookieHeader.includes('Max-Age=0') || logoutCookieHeader.includes('max-age=0')),
      'BFF Logout clears both access_token and auth_token cookies (Max-Age=0)'
    );

    // -------------------------------------------------------------
    // 7. RATE LIMITING (THROTTLER)
    // -------------------------------------------------------------
    console.log('\n--- 7. Rate Limiting (Throttler) ---');

    let hit429 = false;
    for (let i = 0; i < 35; i++) {
      const throttledRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.77',
        },
        body: JSON.stringify({ email: 'test.rate.limit@company.com', password: 'wrong' }),
      });
      if (throttledRes.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert(
      hit429,
      'Rapid login requests trigger 429 Too Many Requests (Rate Limiting active)'
    );

    // -------------------------------------------------------------
    // 8. ATTENDANCE IDOR & GPS BOUNDARY SECURITY
    // -------------------------------------------------------------
    console.log('\n--- 8. Attendance IDOR & GPS Boundary Security ---');

    // 8.1 Create attendance record for other employee to test IDOR
    let otherAttendance = await prisma.attendance.findFirst({
      where: { employeeId: otherEmployee!.id },
    });
    if (!otherAttendance) {
      otherAttendance = await prisma.attendance.create({
        data: {
          employeeId: otherEmployee!.id,
          attendanceDate: new Date('2026-10-01'),
          checkIn: new Date('2026-10-01T08:00:00Z'),
          status: 'PRESENT',
          checkInLatitude: -6.2088,
          checkInLongitude: 106.8456,
        },
      });
    }

    // Employee trying to access other employee's attendance record
    const empAttIdorRes = await fetch(`${BACKEND_URL}/attendance/${otherAttendance.id}`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(
      empAttIdorRes.status === 403,
      'Employee forbidden from accessing another employee attendance record (IDOR blocked with 403)'
    );

    // Admin can access the attendance record
    const adminAttRes = await fetch(`${BACKEND_URL}/attendance/${otherAttendance.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAttRes.status === 200, 'Admin can view any employee attendance record (200 OK)');

    // 8.2 GPS boundary rejection: Attempt check-in from Surabaya (-7.2504, 112.7688) while office is in Jakarta
    const remoteGpsCheckInRes = await fetch(`${BACKEND_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${empToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: -7.2504,
        longitude: 112.7688,
        accuracy: 10,
        photo: 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64'),
      }),
    });
    const remoteGpsData = (await remoteGpsCheckInRes.json()) as any;
    assert(
      remoteGpsCheckInRes.status === 400 &&
        remoteGpsData.message?.toLowerCase().includes('luar area'),
      'Server-side GPS check rejects check-in outside allowed radius (400 Bad Request: Di luar area)'
    );

    // -------------------------------------------------------------
    // 9. PRIVILEGE ESCALATION & IDOR ON LEAVE, OVERTIME, NOTIFICATIONS, SETTINGS
    // -------------------------------------------------------------
    console.log('\n--- 9. Privilege Escalation & IDOR Coverage ---');

    // 9.1 Leave Approval: Employee cannot approve/reject leave requests
    const empLeaveApproveRes = await fetch(`${BACKEND_URL}/leave/${otherLeave.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${empToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    assert(
      empLeaveApproveRes.status === 403,
      'Employee cannot approve leave requests (403 Forbidden)'
    );

    // 9.2 Overtime IDOR & Privilege
    let otherOvertime = await prisma.overtimeRequest.findFirst({
      where: { employeeId: otherEmployee!.id },
    });
    if (!otherOvertime) {
      otherOvertime = await prisma.overtimeRequest.create({
        data: {
          employeeId: otherEmployee!.id,
          date: new Date('2026-11-05'),
          plannedStartTime: '18:00',
          plannedEndTime: '20:00',
          requestedMinutes: 120,
          reason: 'Other employee overtime',
          status: 'PENDING',
        },
      });
    }

    // Employee accessing other employee overtime details
    const empOvertimeIdorRes = await fetch(`${BACKEND_URL}/overtime/${otherOvertime.id}`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(
      empOvertimeIdorRes.status === 403,
      'Employee forbidden from viewing other employee overtime request (IDOR blocked with 403)'
    );

    // Employee attempting to update other employee overtime request
    const empOvertimeUpdateRes = await fetch(`${BACKEND_URL}/overtime/${otherOvertime.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${empToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Hacked reason' }),
    });
    assert(
      empOvertimeUpdateRes.status === 403,
      'Employee forbidden from modifying other employee overtime request (403 Forbidden)'
    );

    // Employee attempting to approve overtime request
    const empOvertimeApproveRes = await fetch(`${BACKEND_URL}/overtime/${otherOvertime.id}/approve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${empToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert(
      empOvertimeApproveRes.status === 403,
      'Employee cannot approve overtime requests (403 Forbidden)'
    );

    // 9.3 Notification IDOR: Employee cannot mark another user notification as read
    let adminNotif = await prisma.notification.findFirst({
      where: { userId: adminLoginData.user.id },
    });
    if (!adminNotif) {
      adminNotif = await prisma.notification.create({
        data: {
          userId: adminLoginData.user.id,
          type: 'SYSTEM',
          title: 'Admin notification',
          message: 'Confidential admin notification',
        },
      });
    }

    const empNotifIdorRes = await fetch(`${BACKEND_URL}/notifications/${adminNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(
      empNotifIdorRes.status === 404,
      'Employee cannot read or mark other user notifications (returns 404 Not Found, no existence leak)'
    );

    // 9.4 Settings Privilege: Employee cannot update attendance settings
    const empSettingPatchRes = await fetch(`${BACKEND_URL}/settings/attendance`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${empToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ radiusMeters: 99999 }),
    });
    assert(
      empSettingPatchRes.status === 403,
      'Employee cannot modify attendance settings (403 Forbidden)'
    );

    // -------------------------------------------------------------
    // 10. ERROR SANITIZATION & LEAKAGE DEFENSE
    // -------------------------------------------------------------
    console.log('\n--- 10. Database Error Masking & Leakage Defense ---');

    const testErrorRes = await fetch(`${BACKEND_URL}/employees/99999999-9999-9999-9999-999999999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const errorBody = await testErrorRes.text();
    assert(
      !errorBody.includes('PrismaClient') &&
        !errorBody.includes('SELECT') &&
        !errorBody.includes('at ') &&
        !errorBody.includes('node_modules'),
      'Backend error responses never leak Prisma client, SQL queries, or server stack traces'
    );

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 SECURITY SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL SECURITY AUDIT & HARDENING CRITERIA PASSED!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSecuritySuite();
