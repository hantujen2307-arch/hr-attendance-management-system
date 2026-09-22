import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://localhost:5001/api';
const prisma = new PrismaClient();

// Valid 1x1 JPEG base64
const VALID_PHOTO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function run() {
  console.log('===========================================================');
  console.log('🧪 EMPLOYEE ATTENDANCE END-TO-END VERIFICATION TEST');
  console.log('===========================================================');

  // 1. Fetch current office setting from DB
  const setting = await prisma.attendanceSetting.findFirst();
  if (!setting) throw new Error('No attendance setting found in DB');

  console.log(`📍 Office Setting: ${setting.locationName} (${setting.latitude}, ${setting.longitude}), Radius: ${setting.radiusMeters}m`);

  // 2. Clean today attendance records for test employees so we have a clean slate
  const alexUser = await prisma.user.findUnique({
    where: { email: 'alex.rivera@company.com' },
    include: { employee: true },
  });
  const marcusUser = await prisma.user.findUnique({
    where: { email: 'marcus.vance@company.com' },
    include: { employee: true },
  });

  if (!alexUser?.employee || !marcusUser?.employee) {
    throw new Error('Alex or Marcus user is missing linked employee profile!');
  }

  console.log(`👤 Alex Rivera Employee ID: ${alexUser.employee.employeeId} (ID: ${alexUser.employee.id})`);
  console.log(`👤 Marcus Vance Employee ID: ${marcusUser.employee.employeeId} (ID: ${marcusUser.employee.id})`);

  // Delete today's attendances for these employees to allow fresh test
  await prisma.attendance.deleteMany({
    where: {
      employeeId: { in: [alexUser.employee.id, marcusUser.employee.id] },
    },
  });
  console.log('🧹 Cleaned existing attendances for test employees.');

  // 3. Test Login for Marcus Vance
  console.log('\n--- Step 1: Login as Employee Marcus Vance ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'marcus.vance@company.com',
      password: 'password123',
    }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData.access_token || loginData.data?.access_token;
  const loggedInUser = loginData.user || loginData.data?.user;

  console.log('✅ Login SUCCESS!');
  console.log(`   User Email: ${loggedInUser.email}`);
  console.log(`   User Role: ${loggedInUser.role}`);
  console.log(`   Linked Employee: ${loggedInUser.employee?.firstName} ${loggedInUser.employee?.lastName} (${loggedInUser.employee?.employeeId})`);
  if (!loggedInUser.employee?.id) {
    throw new Error('FAILED: Login response missing linked employee profile!');
  }

  // 4. Test GPS Location Simulation within radius (52m away from office)
  // Office: -2.97113, 104.738772 -> 52m away offset roughly ~0.0003 deg
  const testLat = setting.latitude + 0.0003;
  const testLon = setting.longitude + 0.0003;

  console.log('\n--- Step 2: Employee Check-In (ABSEN MASUK) ---');
  console.log(`   Simulated GPS: ${testLat}, ${testLon}`);
  const checkInRes = await fetch(`${API_BASE}/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      latitude: testLat,
      longitude: testLon,
      accuracy: 15,
      photo: VALID_PHOTO,
    }),
  });

  const checkInPayload: any = await checkInRes.json();
  if (!checkInRes.ok) {
    throw new Error(`Check-in failed with status ${checkInRes.status}: ${JSON.stringify(checkInPayload)}`);
  }
  const checkInData = checkInPayload.data || checkInPayload;
  console.log('✅ Check-In SUCCESS (HTTP 201)!');
  console.log(`   Attendance ID : ${checkInData.id}`);
  console.log(`   Status        : ${checkInData.status}`);
  console.log(`   Check-In Time : ${checkInData.checkIn}`);
  console.log(`   Distance      : ${checkInData.distanceCheckIn}m (Allowed: ${setting.radiusMeters}m)`);
  console.log(`   Photo Saved   : ${checkInData.photoCheckIn}`);

  // 5. Test Check-In Duplicate Rejection
  console.log('\n--- Step 3: Verify Duplicate Check-In is Prevented ---');
  const dupRes = await fetch(`${API_BASE}/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      latitude: testLat,
      longitude: testLon,
      photo: VALID_PHOTO,
    }),
  });
  const dupPayload: any = await dupRes.json();
  if (dupRes.status === 409) {
    console.log(`✅ Duplicate check-in correctly rejected (HTTP 409): "${dupPayload.message}"`);
  } else {
    throw new Error(`FAILED: Duplicate check-in expected HTTP 409, got ${dupRes.status}`);
  }

  // 6. Test Check-Out (ABSEN PULANG)
  console.log('\n--- Step 4: Employee Check-Out (ABSEN PULANG) ---');
  const checkOutRes = await fetch(`${API_BASE}/attendance/check-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      latitude: testLat,
      longitude: testLon,
      accuracy: 12,
      photo: VALID_PHOTO,
    }),
  });

  const checkOutPayload: any = await checkOutRes.json();
  if (!checkOutRes.ok) {
    throw new Error(`Check-out failed with status ${checkOutRes.status}: ${JSON.stringify(checkOutPayload)}`);
  }
  const checkOutData = checkOutPayload.data || checkOutPayload;
  console.log('✅ Check-Out SUCCESS (HTTP 200/201)!');
  console.log(`   Check-Out Time: ${checkOutData.checkOut}`);
  console.log(`   Work Duration : ${checkOutData.workingMinutes} minutes`);
  console.log(`   Check-Out Photo: ${checkOutData.photoCheckOut}`);

  // 7. Verify Database Persistence directly
  console.log('\n--- Step 5: Verify Database Record directly via Prisma ---');
  const dbRecord = await prisma.attendance.findUnique({
    where: { id: checkInData.id },
    include: { employee: true },
  });
  if (!dbRecord) throw new Error('Database record not found!');
  console.log('✅ Database Record Verified:');
  console.log(`   Employee: ${dbRecord.employee.firstName} ${dbRecord.employee.lastName} (${dbRecord.employee.employeeId})`);
  console.log(`   Status: ${dbRecord.status}`);
  console.log(`   Check-In: ${dbRecord.checkIn?.toISOString()}`);
  console.log(`   Check-Out: ${dbRecord.checkOut?.toISOString()}`);
  console.log(`   Distance: ${dbRecord.distanceCheckIn}m`);

  // 8. Test Admin Visibility
  console.log('\n--- Step 6: Admin Login & Attendance Visibility ---');
  const adminLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@company.com',
      password: 'password123',
    }),
  });
  const adminLoginData: any = await adminLogin.json();
  const adminToken = adminLoginData.access_token || adminLoginData.data?.access_token;

  const adminAttendanceList = await fetch(`${API_BASE}/attendance?employeeId=${marcusUser.employee.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminListPayload: any = await adminAttendanceList.json();
  const adminData = adminListPayload.data || adminListPayload;
  const list = Array.isArray(adminData) ? adminData : adminData.data;
  const found = list.find((item: any) => item.id === checkInData.id);

  if (!found) {
    throw new Error('FAILED: Admin cannot see employee attendance record!');
  }
  console.log('✅ Admin Successfully Retrieved Employee Attendance Record:');
  console.log(`   Found Record ID : ${found.id}`);
  console.log(`   Employee Name   : ${found.employee?.firstName} ${found.employee?.lastName}`);
  console.log(`   Attendance Date : ${found.attendanceDate}`);
  console.log(`   Check-In        : ${found.checkIn}`);
  console.log(`   Check-Out       : ${found.checkOut}`);

  // 9. Test Alex Rivera Login & Check-in as well
  console.log('\n--- Step 7: Test Alex Rivera (Second Employee) ---');
  const alexLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alex.rivera@company.com',
      password: 'password123',
    }),
  });
  const alexLoginData: any = await alexLogin.json();
  const alexToken = alexLoginData.access_token || alexLoginData.data?.access_token;

  const alexCheckIn = await fetch(`${API_BASE}/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alexToken}`,
    },
    body: JSON.stringify({
      latitude: setting.latitude,
      longitude: setting.longitude,
      photo: VALID_PHOTO,
    }),
  });
  const alexCheckInPayload: any = await alexCheckIn.json();
  if (!alexCheckIn.ok) {
    throw new Error(`Alex check-in failed: ${JSON.stringify(alexCheckInPayload)}`);
  }
  console.log(`✅ Alex Rivera Check-In SUCCESS! Status: ${(alexCheckInPayload.data || alexCheckInPayload).status}`);

  console.log('\n===========================================================');
  console.log('🎉 ALL 9 REQUIREMENTS & VERIFICATION CHECKS PASSED!');
  console.log('===========================================================');
}

run()
  .catch((err) => {
    console.error('❌ Test failed with error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

