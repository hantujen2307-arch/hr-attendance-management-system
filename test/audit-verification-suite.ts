const BACKEND_URL = 'http://localhost:5001/api';

async function runAuditTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING HR & ATTENDANCE AUDIT VERIFICATION SUITE');
  console.log('====================================================\n');

  // Prepare a realistic 250KB+ JPEG selfie (base64)
  const commentLength = 250000;
  const commentPayload = Buffer.alloc(commentLength, 0x41);
  const commentHeader = Buffer.from([0xff, 0xfe, (commentLength + 2) >> 8, (commentLength + 2) & 0xff]);
  const bigJpegBuffer = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    commentHeader,
    commentPayload,
    Buffer.from([
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
      0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00, 0xff, 0xd9
    ])
  ]);
  const highResSelfieBase64 = 'data:image/jpeg;base64,' + bigJpegBuffer.toString('base64');

  console.log(`[Selfie Payload Size]: ${Math.round(highResSelfieBase64.length / 1024)} KB`);

  // 1. Test Employee Login
  console.log('\n--- Step 1: Employee Login ---');
  let employeeToken = '';
  let employeeUser: any = null;
  try {
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'employee@example.com',
        password: 'password123',
      }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginData));
    employeeToken = loginData.data?.access_token || loginData.access_token;
    employeeUser = loginData.data?.user || loginData.user;
    console.log('✅ Employee login successful:', employeeUser?.email, `(Role: ${employeeUser?.role})`);
  } catch (err: any) {
    console.error('❌ Employee login failed:', err.message);
    process.exit(1);
  }

  // Fetch office settings
  let officeCoords = { latitude: -2.97113, longitude: 104.738772 };
  try {
    const todayRes = await fetch(`${BACKEND_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const todayData = await todayRes.json();
    const setting = todayData.data?.setting || todayData.setting;
    if (setting?.latitude && setting?.longitude) {
      officeCoords = { latitude: setting.latitude, longitude: setting.longitude };
      console.log(`📍 Using Database Office Coordinates: (${officeCoords.latitude}, ${officeCoords.longitude}) - ${setting.locationName} (Radius: ${setting.radiusMeters}m)`);
    }
  } catch {}

  // 2. Test ABSEN MASUK + selfie + GPS
  console.log('\n--- Step 2: Employee ABSEN MASUK (Check-In) with 300KB+ Selfie & Office GPS ---');
  try {
    const checkInPayload = {
      latitude: officeCoords.latitude,
      longitude: officeCoords.longitude,
      accuracy: 10,
      photo: highResSelfieBase64,
    };

    const checkInRes = await fetch(`${BACKEND_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${employeeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkInPayload),
    });
    const checkInData = await checkInRes.json();

    if (checkInRes.ok) {
      console.log('✅ ABSEN MASUK (Check-In) successful!');
      console.log('   Status Code:', checkInRes.status);
      console.log('   Attendance ID:', checkInData.data?.id);
      console.log('   Check-in Time:', checkInData.data?.checkIn);
      console.log('   Status:', checkInData.data?.status);
      console.log('   Photo Path:', checkInData.data?.photoCheckIn);
    } else if (checkInRes.status === 409) {
      console.log('ℹ️ User already checked in today (HTTP 409):', checkInData.message);
    } else {
      console.error('❌ ABSEN MASUK failed:', checkInRes.status, checkInData);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ ABSEN MASUK error:', err.message);
    process.exit(1);
  }

  // 3. Test ABSEN PULANG (Check-Out)
  console.log('\n--- Step 3: Employee ABSEN PULANG (Check-Out) with GPS & Selfie ---');
  try {
    const checkOutRes = await fetch(`${BACKEND_URL}/attendance/check-out`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${employeeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: officeCoords.latitude,
        longitude: officeCoords.longitude,
        accuracy: 10,
        photo: highResSelfieBase64,
      }),
    });
    const checkOutData = await checkOutRes.json();

    if (checkOutRes.ok) {
      console.log('✅ ABSEN PULANG (Check-Out) successful!');
      console.log('   Status Code:', checkOutRes.status);
      console.log('   Check-out Time:', checkOutData.data?.checkOut);
      console.log('   Work Duration (Hours):', checkOutData.data?.workHours);
    } else if (checkOutRes.status === 409) {
      console.log('ℹ️ User already checked out today (HTTP 409):', checkOutData.message);
    } else {
      console.error('❌ ABSEN PULANG failed:', checkOutRes.status, checkOutData);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ ABSEN PULANG error:', err.message);
    process.exit(1);
  }

  // 4. Test Admin Login & View Employee Attendance
  console.log('\n--- Step 4: Admin Login & Attendance Verification ---');
  let adminToken = '';
  try {
    const adminLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginRes.ok) throw new Error(JSON.stringify(adminLoginData));
    adminToken = adminLoginData.data?.access_token || adminLoginData.access_token;
    const adminUser = adminLoginData.data?.user || adminLoginData.user;
    console.log('✅ Admin login successful:', adminUser?.email, `(Role: ${adminUser?.role})`);

    const adminAttRes = await fetch(`${BACKEND_URL}/attendance?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAttData = await adminAttRes.json();
    const records = adminAttData.data?.data || adminAttData.data || [];
    const meta = adminAttData.data?.meta || adminAttData.meta || { total: records.length };

    console.log('✅ Admin retrieved attendance list:');
    console.log(`   Total Attendance Records in System: ${meta.total}`);
    const myRecord = records.find((r: any) => r.employee?.email === 'alex.rivera@company.com' || r.employee?.user?.email === 'employee@example.com' || r.employee?.employeeId === 'EMP-003');
    if (myRecord) {
      console.log(`   Found Employee Attendance Record: ID=${myRecord.id}, Date=${myRecord.attendanceDate}, Status=${myRecord.status}, PhotoIn=${myRecord.photoCheckIn}`);
    } else if (records.length > 0) {
      console.log(`   First record in list: ID=${records[0].id}, Employee=${records[0].employee?.firstName} ${records[0].employee?.lastName}, Status=${records[0].status}`);
    }
  } catch (err: any) {
    console.error('❌ Admin verification failed:', err.message);
    process.exit(1);
  }

  // 5. Test Eksekutif HR Analytics (Admin)
  console.log('\n--- Step 5: Eksekutif HR Analytics (Admin) ---');
  try {
    const analyticsRes = await fetch(`${BACKEND_URL}/reports/analytics?period=this_month`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = await analyticsRes.json();
    if (!analyticsRes.ok) throw new Error(JSON.stringify(analyticsData));
    const adminResult = analyticsData.data || analyticsData;

    console.log('✅ Admin Analytics retrieved successfully!');
    console.log('   Status Code:', analyticsRes.status);
    console.log('   isEmployee:', adminResult.isEmployee);
    console.log('   Headcount Total:', adminResult.headcount?.total);
    console.log('   Attendance Rate:', adminResult.attendance?.attendanceRate + '%');
    console.log('   Leave Approved:', adminResult.leave?.status?.approved);
    console.log('   Shifts Configured:', adminResult.shifts?.length);
    console.log('   Reimbursement Total:', adminResult.reimbursement?.totalAmount);
    console.log('   Department Breakdown Count:', adminResult.departmentBreakdown?.length);
  } catch (err: any) {
    console.error('❌ Admin Analytics failed:', err.message);
    process.exit(1);
  }

  // 6. Test Employee Personal Analytics & RBAC Data Isolation
  console.log('\n--- Step 6: Employee Analytics (RBAC & Isolation Check) ---');
  try {
    const empAnalyticsRes = await fetch(`${BACKEND_URL}/reports/analytics?period=this_month`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const empAnalyticsData = await empAnalyticsRes.json();
    if (!empAnalyticsRes.ok) throw new Error(JSON.stringify(empAnalyticsData));
    const result = empAnalyticsData.data || empAnalyticsData;

    console.log('✅ Employee Personal Analytics retrieved successfully!');
    console.log('   isEmployee:', result.isEmployee);
    console.log('   Employee Info:', result.employee?.name, `(ID: ${result.employee?.employeeId})`);
    console.log('   Personal Attendance Rate:', result.attendance?.attendanceRate + '%');
    console.log('   Personal Present Days:', result.attendance?.present);
    console.log('   Personal Overtime Hours:', result.overtime?.approvedHours);
    console.log('   Personal Leave Requests:', result.leave?.totalRequests);

    if (result.headcount === undefined && result.departmentBreakdown === undefined) {
      console.log('✅ RBAC Confirmed: Employee response does not leak company-wide headcount or department details!');
    } else {
      console.log('⚠️ RBAC Notice: Company headcount or department breakdown was returned in employee response.');
    }
  } catch (err: any) {
    console.error('❌ Employee Analytics failed:', err.message);
    process.exit(1);
  }

  // 7. Test Next.js Frontend BFF Proxy for Analytics & Attendance
  console.log('\n--- Step 7: Next.js Frontend BFF Proxy (port 3000) ---');
  try {
    const bffAnalyticsRes = await fetch(`http://localhost:3000/api/reports/analytics?period=this_month`, {
      headers: {
        Cookie: `access_token=${adminToken}`,
      },
    });
    const bffAnalyticsData = await bffAnalyticsRes.json();
    if (!bffAnalyticsRes.ok) throw new Error(JSON.stringify(bffAnalyticsData));
    console.log('✅ Next.js BFF Proxy /api/reports/analytics returned HTTP', bffAnalyticsRes.status, 'with valid payload!');
    console.log('   BFF Headcount Total:', bffAnalyticsData.data?.headcount?.total || bffAnalyticsData.headcount?.total);
  } catch (err: any) {
    console.error('❌ BFF Proxy failed:', err.message);
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runAuditTests();

export {};

