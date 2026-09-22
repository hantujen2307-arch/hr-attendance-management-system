import { PrismaClient, UserRole, AttendanceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  determinePunctualityStatus,
  calculateWorkingMinutes,
  getJakartaDateInfo,
} from '../src/attendance/attendance.time.util';

const BASE_URL = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000/api';

const prisma = new PrismaClient();

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING STEP 6 ATTENDANCE MANAGEMENT TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error('   Details:', detail);
      failedCount++;
    }
  }

  try {
    // 0. Setup test users and tokens
    console.log('--- Step 0: Authenticating Roles ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.access_token;
    assert(!!adminToken, 'Admin authentication returns valid JWT');

    const hrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@example.com', password: 'password123' }),
    });
    const hrLoginData = await hrLoginRes.json();
    const hrToken = hrLoginData.access_token;
    assert(!!hrToken, 'HR authentication returns valid JWT');

    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@example.com', password: 'password123' }),
    });
    const empLoginData = await empLoginRes.json();
    const empToken = empLoginData.access_token;
    assert(!!empToken, 'Employee authentication returns valid JWT');

    // Create a dedicated clean test worker for check-in / check-out tests
    const testWorkerEmail = 'test.checkin.worker@company.com';
    let testUser = await prisma.user.findUnique({ where: { email: testWorkerEmail } });
    if (!testUser) {
      const passwordHash = await bcrypt.hash('password123', 10);
      testUser = await prisma.user.create({
        data: {
          email: testWorkerEmail,
          passwordHash,
          role: UserRole.EMPLOYEE,
        },
      });
    }

    const itDept = await prisma.department.findFirst();
    let testEmployee = await prisma.employee.findFirst({ where: { userId: testUser.id } });
    if (!testEmployee) {
      testEmployee = await prisma.employee.create({
        data: {
          userId: testUser.id,
          employeeId: 'TEST-EMP-999',
          firstName: 'Checkin',
          lastName: 'Tester',
          email: testWorkerEmail,
          departmentId: itDept!.id,
          position: 'QA Engineer',
          joinDate: new Date(),
        },
      });
    }

    // Clean any today attendance record for this test employee to ensure clean slate
    const { attendanceDate } = getJakartaDateInfo();
    await prisma.attendance.deleteMany({
      where: {
        employeeId: testEmployee.id,
        attendanceDate,
      },
    });

    // Login as test employee
    const testEmpLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testWorkerEmail, password: 'password123' }),
    });
    const testEmpLoginData = await testEmpLoginRes.json();
    const testWorkerToken = testEmpLoginData.access_token;
    assert(!!testWorkerToken, 'Test employee logged in successfully');

    const VALID_SELFIE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    console.log('\n--- Running Attendance Validation Test Cases ---');

    // TEST 7: Employee cannot check-out without prior check-in
    const earlyCheckOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${testWorkerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        photo: VALID_SELFIE,
      }),
    });
    assert(
      earlyCheckOutRes.status === 404,
      'Test 7: Employee cannot check-out without prior check-in (returns 404)',
      await earlyCheckOutRes.json()
    );

    // TEST 1: Employee dapat check-in
    const checkInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testWorkerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5,
        photo: VALID_SELFIE,
      }),
    });
    const checkInData = await checkInRes.json();
    assert(
      checkInRes.status === 201 && !!checkInData.checkIn,
      'Test 1: Employee can check-in successfully (returns 201)',
      checkInData
    );

    // TEST 2: Employee tidak bisa check-in dua kali di hari yang sama
    const duplicateCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testWorkerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5,
        photo: VALID_SELFIE,
      }),
    });
    assert(
      duplicateCheckInRes.status === 409,
      'Test 2: Employee cannot check-in twice on same day (returns 409 Conflict)',
      await duplicateCheckInRes.json()
    );

    // TEST 3 & 4: Punctuality check logic (Office 08:00 with 15 min tolerance = 08:15 cutoff)
    const beforeCutoff = new Date('2026-09-17T08:10:00+07:00');
    const exactCutoff = new Date('2026-09-17T08:15:00+07:00');
    const afterCutoff = new Date('2026-09-17T08:16:00+07:00');
    const lateMorning = new Date('2026-09-17T09:30:00+07:00');

    const statusBefore = determinePunctualityStatus(beforeCutoff);
    const statusExact = determinePunctualityStatus(exactCutoff);
    const statusAfter = determinePunctualityStatus(afterCutoff);
    const statusLate = determinePunctualityStatus(lateMorning);

    assert(
      statusBefore === AttendanceStatus.PRESENT && statusExact === AttendanceStatus.PRESENT,
      'Test 3: Check-in before or at tolerance cutoff (08:15 WIB) evaluates to PRESENT',
      { statusBefore, statusExact }
    );

    assert(
      statusAfter === AttendanceStatus.LATE && statusLate === AttendanceStatus.LATE,
      'Test 4: Check-in after tolerance cutoff evaluates to LATE',
      { statusAfter, statusLate }
    );

    // TEST 5 & 6: Employee dapat check-out dan menghitung working_minutes
    const checkOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${testWorkerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5,
        photo: VALID_SELFIE,
      }),
    });
    const checkOutData = await checkOutRes.json();
    assert(
      checkOutRes.status === 200 &&
        !!checkOutData.checkOut &&
        typeof checkOutData.workingMinutes === 'number' &&
        checkOutData.workingMinutes >= 0,
      'Test 5 & 6: Employee can check-out and working_minutes is calculated',
      checkOutData
    );

    // TEST 8: Employee tidak bisa check-out dua kali
    const duplicateCheckOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${testWorkerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5,
        photo: VALID_SELFIE,
      }),
    });
    assert(
      duplicateCheckOutRes.status === 409,
      'Test 8: Employee cannot check-out twice (returns 409 Conflict)',
      await duplicateCheckOutRes.json()
    );

    // TEST 9: ADMIN dapat melihat semua attendance
    const adminListRes = await fetch(`${BASE_URL}/attendance?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminListRes.json();
    assert(
      adminListRes.status === 200 &&
        Array.isArray(adminListData.data) &&
        adminListData.data.length > 1 &&
        !!adminListData.meta,
      'Test 9: ADMIN can view all employees attendance with pagination',
      adminListData.meta
    );

    // TEST 10: HR dapat melihat semua attendance
    const hrListRes = await fetch(`${BASE_URL}/attendance?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const hrListData = await hrListRes.json();
    assert(
      hrListRes.status === 200 &&
        Array.isArray(hrListData.data) &&
        hrListData.data.length > 1 &&
        !!hrListData.meta,
      'Test 10: HR can view all employees attendance with pagination',
      hrListData.meta
    );

    // TEST 11: EMPLOYEE hanya dapat melihat attendance miliknya
    const empListRes = await fetch(`${BASE_URL}/attendance?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${testWorkerToken}` },
    });
    const empListData = await empListRes.json();
    const allBelongToSelf = empListData.data.every(
      (item: any) => item.employeeId === testEmployee!.id
    );
    assert(
      empListRes.status === 200 &&
        Array.isArray(empListData.data) &&
        empListData.data.length >= 1 &&
        allBelongToSelf,
      'Test 11: EMPLOYEE can only view their own attendance records',
      { totalReturned: empListData.data.length, allBelongToSelf }
    );

    // TEST 12: ADMIN dapat membuat attendance manual
    const manualDate = '2026-08-10';
    // Clean manual test record if existing
    await prisma.attendance.deleteMany({
      where: {
        employeeId: testEmployee.id,
        attendanceDate: new Date(`${manualDate}T00:00:00.000Z`),
      },
    });

    const adminManualRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: testEmployee.id,
        attendanceDate: manualDate,
        checkIn: `${manualDate}T08:30:00+07:00`,
        checkOut: `${manualDate}T17:00:00+07:00`,
        status: 'PRESENT',
        notes: 'Admin manual approval log',
      }),
    });
    const adminManualData = await adminManualRes.json();
    assert(
      adminManualRes.status === 201 && adminManualData.workingMinutes === 510,
      'Test 12: ADMIN can create manual attendance (calculated workingMinutes=510)',
      adminManualData
    );

    // TEST 13: HR can create manual attendance
    const hrManualDate = '2026-08-11';
    await prisma.attendance.deleteMany({
      where: {
        employeeId: testEmployee.id,
        attendanceDate: new Date(`${hrManualDate}T00:00:00.000Z`),
      },
    });

    const hrManualRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: testEmployee.id,
        attendanceDate: hrManualDate,
        checkIn: `${hrManualDate}T09:15:00+07:00`,
        checkOut: `${hrManualDate}T17:30:00+07:00`,
        status: 'LATE',
        notes: 'HR manual adjustment log',
      }),
    });
    const hrManualData = await hrManualRes.json();
    assert(
      hrManualRes.status === 201 && hrManualData.status === 'LATE',
      'Test 13: HR can create manual attendance',
      hrManualData
    );

    // TEST: GET attendance detail and PATCH attendance
    const getDetailRes = await fetch(`${BASE_URL}/attendance/${hrManualData.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getDetailRes.status === 200, 'GET /api/attendance/:id returns 200 for Admin');

    const patchRes = await fetch(`${BASE_URL}/attendance/${hrManualData.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notes: 'Updated notes by HR',
      }),
    });
    const patchData = await patchRes.json();
    assert(
      patchRes.status === 200 && patchData.notes === 'Updated notes by HR',
      'PATCH /api/attendance/:id updates record successfully'
    );

    // TEST: EMPLOYEE viewing other employee detail returns 403 Forbidden
    const forbiddenDetailRes = await fetch(`${BASE_URL}/attendance/${hrManualData.id}`, {
      headers: { Authorization: `Bearer ${empToken}` }, // employee Alex Rivera viewing test worker's attendance
    });
    assert(
      forbiddenDetailRes.status === 403,
      'EMPLOYEE viewing other employee record returns 403 Forbidden'
    );

    // TEST 14: Duplicate employee/date ditolak
    const duplicateManualRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: testEmployee.id,
        attendanceDate: manualDate,
        status: 'PRESENT',
      }),
    });
    assert(
      duplicateManualRes.status === 409,
      'Test 14: Duplicate employee/date rejected (returns 409 Conflict)',
      await duplicateManualRes.json()
    );

    // TEST 15: Check-out sebelum check-in ditolak
    const invalidTimesRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: testEmployee.id,
        attendanceDate: '2026-08-12',
        checkIn: '2026-08-12T17:00:00+07:00',
        checkOut: '2026-08-12T09:00:00+07:00', // earlier!
        status: 'PRESENT',
      }),
    });
    assert(
      invalidTimesRes.status === 400,
      'Test 15: Check-out earlier than check-in rejected (returns 400 Bad Request)',
      await invalidTimesRes.json()
    );

    // TEST 16: GET /api/attendance/today bekerja
    const todayRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const todayData = await todayRes.json();
    assert(
      todayRes.status === 200 &&
        todayData.summary &&
        typeof todayData.summary.totalEmployees === 'number' &&
        typeof todayData.summary.present === 'number' &&
        typeof todayData.summary.late === 'number' &&
        typeof todayData.summary.absent === 'number' &&
        typeof todayData.summary.leave === 'number',
      'Test 16: GET /api/attendance/today returns actual database summary metrics',
      todayData.summary
    );

    // TEST 17: Frontend attendance page / BFF reading API data
    const bffTodayRes = await fetch(`${FRONTEND_URL}/attendance/today`, {
      headers: {
        Cookie: `access_token=${adminToken}`,
      },
    });
    const bffTodayData = await bffTodayRes.json();
    assert(
      bffTodayRes.status === 200 && !!bffTodayData.summary,
      'Test 17: Frontend BFF route /api/attendance/today proxies live backend data',
      bffTodayData.summary
    );

    // TEST 18 & 19: Frontend BFF Check-in and Check-out
    // Clean a new date for test employee to test through BFF
    const bffWorkerEmail = 'test.bff.worker@company.com';
    let bffUser = await prisma.user.findUnique({ where: { email: bffWorkerEmail } });
    if (!bffUser) {
      const passwordHash = await bcrypt.hash('password123', 10);
      bffUser = await prisma.user.create({
        data: {
          email: bffWorkerEmail,
          passwordHash,
          role: UserRole.EMPLOYEE,
        },
      });
    }

    let bffEmployee = await prisma.employee.findFirst({ where: { userId: bffUser.id } });
    if (!bffEmployee) {
      bffEmployee = await prisma.employee.create({
        data: {
          userId: bffUser.id,
          employeeId: 'BFF-EMP-001',
          firstName: 'BFF',
          lastName: 'Tester',
          email: bffWorkerEmail,
          departmentId: itDept!.id,
          position: 'Frontend QA',
          joinDate: new Date(),
        },
      });
    }

    await prisma.attendance.deleteMany({
      where: {
        employeeId: bffEmployee.id,
        attendanceDate,
      },
    });

    const bffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: bffWorkerEmail, password: 'password123' }),
    });
    const bffLoginData = await bffLoginRes.json();
    const bffToken = bffLoginData.access_token;

    // Test 18: Check-in button works through frontend BFF route
    const bffCheckInRes = await fetch(`${FRONTEND_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${bffToken}`,
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5,
        photo: VALID_SELFIE,
      }),
    });
    const bffCheckInData = await bffCheckInRes.json();
    assert(
      bffCheckInRes.status === 201 && !!bffCheckInData.checkIn,
      'Test 18: Check-in button works from frontend BFF endpoint',
      bffCheckInData
    );

    // Test 19: Check-out button works through frontend BFF route
    const bffCheckOutRes = await fetch(`${FRONTEND_URL}/attendance/check-out`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${bffToken}`,
      },
      body: JSON.stringify({
        latitude: -6.2088,
        longitude: 106.8456,
        accuracy: 5,
        photo: VALID_SELFIE,
      }),
    });
    const bffCheckOutData = await bffCheckOutRes.json();
    assert(
      bffCheckOutRes.status === 200 && !!bffCheckOutData.checkOut,
      'Test 19: Check-out button works from frontend BFF endpoint',
      bffCheckOutData
    );

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during test suite execution:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
