import { PrismaClient, UserRole } from '@prisma/client';

const BASE_URL = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000/api';

const prisma = new PrismaClient();

async function runStep9Tests() {
  console.log('======================================================');
  console.log('🧪 RUNNING STEP 9 DASHBOARD & REPORTS TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error('   Details:', detail);
      failed++;
    }
  }

  try {
    // 0. Test 15: Protected endpoint without JWT is rejected
    console.log('--- Test 15: Security & JWT Guards ---');
    const unauthDashboardRes = await fetch(`${BASE_URL}/dashboard/summary`);
    assert(
      unauthDashboardRes.status === 401,
      'Test 15a: GET /api/dashboard/summary without JWT rejected (401 Unauthorized)'
    );

    const unauthReportsRes = await fetch(`${BASE_URL}/reports/attendance`);
    assert(
      unauthReportsRes.status === 401,
      'Test 15b: GET /api/reports/attendance without JWT rejected (401 Unauthorized)'
    );

    // Authenticate Admin, HR, Employee
    console.log('\n--- Authenticating Roles ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    });
    const adminToken = (await adminLoginRes.json()).access_token;
    assert(!!adminToken, 'Admin authenticated with valid JWT');

    const hrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@example.com', password: 'password123' }),
    });
    const hrToken = (await hrLoginRes.json()).access_token;
    assert(!!hrToken, 'HR authenticated with valid JWT');

    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@example.com', password: 'password123' }),
    });
    const empData = await empLoginRes.json();
    const empToken = empData.access_token;
    const employeeProfile = empData.user.employee;
    assert(!!empToken && !!employeeProfile, 'Employee authenticated with valid JWT and profile');

    console.log('\n--- Running Dashboard Tests ---');

    // Test 1: ADMIN dapat dashboard summary
    const adminSummaryRes = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminSummary = await adminSummaryRes.json();
    assert(
      adminSummaryRes.status === 200 &&
        typeof adminSummary.totalEmployees === 'number' &&
        typeof adminSummary.presentToday === 'number' &&
        typeof adminSummary.lateToday === 'number' &&
        typeof adminSummary.absentToday === 'number' &&
        typeof adminSummary.onLeaveToday === 'number',
      'Test 1: ADMIN gets company-wide dashboard summary metrics',
      adminSummary
    );

    // Test 2: HR dapat dashboard summary
    const hrSummaryRes = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const hrSummary = await hrSummaryRes.json();
    assert(
      hrSummaryRes.status === 200 &&
        typeof hrSummary.totalEmployees === 'number' &&
        hrSummary.totalEmployees === adminSummary.totalEmployees,
      'Test 2: HR gets company-wide dashboard summary metrics',
      hrSummary
    );

    // Test 3: EMPLOYEE hanya mendapat summary miliknya
    const empSummaryRes = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const empSummary = await empSummaryRes.json();
    assert(
      empSummaryRes.status === 200 &&
        empSummary.isEmployee === true &&
        typeof empSummary.attendanceThisMonth === 'number' &&
        typeof empSummary.lateThisMonth === 'number' &&
        typeof empSummary.leaveThisMonth === 'number' &&
        typeof empSummary.workingMinutesThisMonth === 'number' &&
        empSummary.totalEmployees === undefined,
      'Test 3: EMPLOYEE receives personal monthly metrics (no company stats)',
      empSummary
    );

    // Test 4: Attendance overview bekerja
    const overviewRes = await fetch(`${BASE_URL}/dashboard/attendance-overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overviewData = await overviewRes.json();
    assert(
      overviewRes.status === 200 &&
        Array.isArray(overviewData.data) &&
        overviewData.data.length > 0 &&
        typeof overviewData.data[0].present === 'number' &&
        typeof overviewData.data[0].late === 'number' &&
        typeof overviewData.data[0].absent === 'number' &&
        typeof overviewData.data[0].leave === 'number',
      'Test 4: Attendance overview returns daily trend counts',
      { totalDays: overviewData.data.length, sample: overviewData.data[0] }
    );

    // Test 5: Recent attendance bekerja
    const recentRes = await fetch(`${BASE_URL}/dashboard/recent-attendance?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const recentData = await recentRes.json();
    assert(
      recentRes.status === 200 &&
        Array.isArray(recentData) &&
        recentData.length > 0 &&
        !!recentData[0].employee &&
        !!recentData[0].date &&
        !!recentData[0].status,
      'Test 5: Recent attendance feed returns latest logs with employee and status',
      { count: recentData.length, sample: recentData[0] }
    );

    console.log('\n--- Running Reports & Analytics Tests ---');

    // Test 6: Attendance report bekerja
    const reportRes = await fetch(`${BASE_URL}/reports/attendance?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reportData = await reportRes.json();
    assert(
      reportRes.status === 200 &&
        Array.isArray(reportData.data) &&
        reportData.meta &&
        typeof reportData.meta.total === 'number' &&
        reportData.summary &&
        typeof reportData.summary.present === 'number',
      'Test 6: Attendance report returns paginated data, meta, and summary totals',
      { meta: reportData.meta, summary: reportData.summary }
    );

    // Test 7: Date filter bekerja
    const dateFilterRes = await fetch(
      `${BASE_URL}/reports/attendance?startDate=2026-09-01&endDate=2026-09-30`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const dateFilterData = await dateFilterRes.json();
    const allWithinDateRange = dateFilterData.data.every(
      (r: any) => r.date >= '2026-09-01' && r.date <= '2026-09-30'
    );
    assert(
      dateFilterRes.status === 200 && allWithinDateRange,
      'Test 7: Date range filter strictly filters records',
      { returned: dateFilterData.data.length }
    );

    // Test 8: Department filter bekerja
    const firstDept = await prisma.department.findFirst();
    const deptFilterRes = await fetch(
      `${BASE_URL}/reports/attendance?departmentId=${firstDept!.id}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const deptFilterData = await deptFilterRes.json();
    const allInDept = deptFilterData.data.every(
      (r: any) => r.department === firstDept!.name
    );
    assert(
      deptFilterRes.status === 200 && allInDept,
      'Test 8: Department filter filters records correctly',
      { department: firstDept!.name, count: deptFilterData.data.length }
    );

    // Test 9: Employee filter bekerja
    const targetEmpId = employeeProfile.id;
    const empFilterRes = await fetch(
      `${BASE_URL}/reports/attendance?employeeId=${targetEmpId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const empFilterData = await empFilterRes.json();
    const allMatchEmp = empFilterData.data.every(
      (r: any) => r.employeeId === employeeProfile.employeeId
    );
    assert(
      empFilterRes.status === 200 && (empFilterData.data.length === 0 || allMatchEmp),
      'Test 9: Employee filter filters records correctly',
      { employeeId: employeeProfile.employeeId, count: empFilterData.data.length }
    );

    // Test 10: Status filter bekerja
    const statusFilterRes = await fetch(
      `${BASE_URL}/reports/attendance?status=PRESENT`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const statusFilterData = await statusFilterRes.json();
    const allPresent = statusFilterData.data.every((r: any) => r.status === 'PRESENT');
    assert(
      statusFilterRes.status === 200 && allPresent,
      'Test 10: Status filter filters records correctly',
      { count: statusFilterData.data.length }
    );

    // Test 11: Pagination bekerja
    const paginatedRes = await fetch(
      `${BASE_URL}/reports/attendance?page=1&limit=2`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const paginatedData = await paginatedRes.json();
    assert(
      paginatedRes.status === 200 &&
        paginatedData.data.length <= 2 &&
        paginatedData.meta.limit === 2 &&
        paginatedData.meta.page === 1,
      'Test 11: Pagination works with customized page and limit',
      paginatedData.meta
    );

    // Test 12: Employee report bekerja
    const empReportRes = await fetch(
      `${BASE_URL}/reports/employee/${employeeProfile.id}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const empReportData = await empReportRes.json();
    assert(
      empReportRes.status === 200 &&
        empReportData.employee &&
        empReportData.attendance &&
        typeof empReportData.workingMinutes === 'number',
      'Test 12: Employee individual analytics report returns accurate metrics',
      empReportData
    );

    // Test 13: EMPLOYEE tidak dapat melihat report employee lain
    const adminEmp = await prisma.employee.findFirst({
      where: { email: 'admin@example.com' },
    });
    const forbiddenReportRes = await fetch(
      `${BASE_URL}/reports/employee/${adminEmp!.id}`,
      { headers: { Authorization: `Bearer ${empToken}` } }
    );
    assert(
      forbiddenReportRes.status === 403,
      'Test 13: EMPLOYEE forbidden from viewing other employee report (403 Forbidden)'
    );

    // Test 14: CSV export bekerja
    const csvExportRes = await fetch(`${BASE_URL}/reports/attendance/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csvContent = await csvExportRes.text();
    const contentType = csvExportRes.headers.get('content-type');
    const contentDisp = csvExportRes.headers.get('content-disposition');
    assert(
      Boolean(
        csvExportRes.status === 200 &&
          contentType?.includes('text/csv') &&
          contentDisp?.includes('attachment') &&
          (csvContent.includes('Nama Karyawan') || csvContent.includes('Employee Name'))
      ),
      'Test 14: CSV export endpoint returns valid CSV file stream with headers',
      { contentType, contentDisp, firstLine: csvContent.split('\n')[0] }
    );

    // Test 16: Role authorization & employee self-scoping in reports
    const empSelfReportRes = await fetch(`${BASE_URL}/reports/attendance`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const empSelfReportData = await empSelfReportRes.json();
    const allSelfLogs = empSelfReportData.data.every(
      (r: any) => r.employeeId === employeeProfile.employeeId
    );
    assert(
      empSelfReportRes.status === 200 && allSelfLogs,
      'Test 16: EMPLOYEE report query strictly auto-scoped to self records',
      { count: empSelfReportData.data.length, allSelfLogs }
    );

    console.log('\n--- Testing Frontend BFF Proxies ---');

    // Frontend BFF Dashboard Summary
    const bffSummaryRes = await fetch(`${FRONTEND_URL}/dashboard/summary`, {
      headers: { Cookie: `access_token=${adminToken}` },
    });
    const bffSummaryData = await bffSummaryRes.json();
    assert(
      bffSummaryRes.status === 200 && typeof bffSummaryData.totalEmployees === 'number',
      'Frontend BFF /api/dashboard/summary proxies live data'
    );

    // Frontend BFF Attendance Overview
    const bffOverviewRes = await fetch(`${FRONTEND_URL}/dashboard/attendance-overview`, {
      headers: { Cookie: `access_token=${adminToken}` },
    });
    const bffOverviewData = await bffOverviewRes.json();
    assert(
      bffOverviewRes.status === 200 && Array.isArray(bffOverviewData.data),
      'Frontend BFF /api/dashboard/attendance-overview proxies live data'
    );

    // Frontend BFF Recent Attendance
    const bffRecentRes = await fetch(`${FRONTEND_URL}/dashboard/recent-attendance`, {
      headers: { Cookie: `access_token=${adminToken}` },
    });
    const bffRecentData = await bffRecentRes.json();
    assert(
      bffRecentRes.status === 200 && Array.isArray(bffRecentData),
      'Frontend BFF /api/dashboard/recent-attendance proxies live data'
    );

    // Frontend BFF Attendance Report
    const bffReportRes = await fetch(`${FRONTEND_URL}/reports/attendance`, {
      headers: { Cookie: `access_token=${adminToken}` },
    });
    const bffReportData = await bffReportRes.json();
    assert(
      bffReportRes.status === 200 && !!bffReportData.summary,
      'Frontend BFF /api/reports/attendance proxies live data'
    );

    // Frontend BFF CSV Export
    const bffExportRes = await fetch(`${FRONTEND_URL}/reports/attendance/export`, {
      headers: { Cookie: `access_token=${adminToken}` },
    });
    const bffExportText = await bffExportRes.text();
    assert(
      Boolean(
        bffExportRes.status === 200 &&
          bffExportRes.headers.get('content-type')?.includes('text/csv') &&
          (bffExportText.includes('Nama Karyawan') || bffExportText.includes('Employee Name'))
      ),
      'Frontend BFF /api/reports/attendance/export streams downloadable CSV'
    );

    console.log('\n======================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStep9Tests();
