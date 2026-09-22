/**
 * Test script for Payroll Calculation Engine V1
 * Verifies:
 * 1. Master Gaji (Basic: 5.000.000, Allowance: 500.000)
 * 2. Attendance within payroll period
 * 3. Approved Overtime within payroll period
 * 4. Automatic calculation execution (Gross = Basic + Allowance + Overtime, Deduction = Late + Alpha + Other, TakeHomePay = Gross - Deduction)
 * 5. RBAC & IDOR Ownership Check (Employee can only see own payslip, forbidden on others)
 */

export {};

const API_BASE = 'http://localhost:5001/api';

async function request(url: string, options: any = {}) {
  const { headers, ...restOptions } = options;
  const res = await fetch(url, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(email: string, password = 'password123') {
  const res = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = res.data?.access_token || res.data?.accessToken;
  if (res.status !== 200 || !token) {
    throw new Error(`Failed to login as ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token, user: res.data.user };
}

async function run() {
  console.log('=== STARTING PAYROLL CALCULATION ENGINE V1 TEST ===\n');

  // 1. Authenticate users
  console.log('1. Authenticating test users...');
  const admin = await login('admin@example.com');
  const hr = await login('hr@example.com');
  const employeeBudi = await login('budi.santoso@example.com');
  const employeeSiti = await login('siti.rahma@example.com');
  console.log('✅ Admin, HR, Employee Budi, Employee Siti logged in successfully.');

  const budiEmployeeId = employeeBudi.user.employee.id;
  const sitiEmployeeId = employeeSiti.user.employee.id;

  // 2. Set Master Gaji for Budi Santoso
  // Basic: 5.000.000, Allowance: 500.000 (Tunjangan Tetap 300.000, Transport 200.000), Deductions: 0
  console.log('\n2. Setting Master Gaji for Budi Santoso...');
  const salaryPayload = {
    employeeId: budiEmployeeId,
    basicSalary: 5000000,
    allowances: 500000,
    fixedAllowance: 300000,
    transportAllowance: 200000,
    mealAllowance: 0,
    deductions: 0,
    fixedDeduction: 0,
    bpjsDeduction: 0,
    taxDeduction: 0,
    bankName: 'BCA',
    bankAccount: '123-456-789',
    bankAccountHolder: 'Budi Santoso',
  };

  const setSalaryRes = await request(`${API_BASE}/payroll/salaries/${budiEmployeeId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${admin.token}` },
    body: JSON.stringify(salaryPayload),
  });

  if (setSalaryRes.status !== 200 && setSalaryRes.status !== 201) {
    throw new Error(`Failed to set salary: ${JSON.stringify(setSalaryRes.data)}`);
  }
  console.log('✅ Master Gaji saved: Basic Rp 5.000.000, Allowance Rp 500.000, Deductions Rp 0.');

  // 3. Create or fetch Payroll Period for September 2026
  console.log('\n3. Ensuring Payroll Period September 2026 exists...');
  const periodsRes = await request(`${API_BASE}/payroll/periods`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });

  let period = periodsRes.data.find((p: any) => p.month === 9 && p.year === 2026);
  if (!period) {
    const createPeriodRes = await request(`${API_BASE}/payroll/periods`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        name: 'September 2026',
        month: 9,
        year: 2026,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        notes: 'Periode uji engine payroll V1',
      }),
    });
    if (createPeriodRes.status !== 201) {
      throw new Error(`Failed to create period: ${JSON.stringify(createPeriodRes.data)}`);
    }
    period = createPeriodRes.data;
  }
  console.log(`✅ Payroll Period ready: '${period.name}' (ID: ${period.id}), Status: ${period.status}`);

  // 4. Create Attendance records for Budi in September 2026
  console.log('\n4. Creating attendance records for Budi Santoso in September 2026...');
  // Using direct Prisma via backend node client to seed clean test attendance & overtime
  const { PrismaClient } = require('../backend/node_modules/@prisma/client');
  const prisma = new PrismaClient();

  try {
    if (period.status !== 'DRAFT') {
      await prisma.payrollPeriod.update({
        where: { id: period.id },
        data: { status: 'DRAFT' },
      });
      period.status = 'DRAFT';
      console.log('🔄 Period status reset to DRAFT for test execution.');
    }

    // Clean up any previous test attendance and overtime for Budi in September 2026
    await prisma.attendance.deleteMany({
      where: {
        employeeId: budiEmployeeId,
        attendanceDate: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T00:00:00.000Z'),
        },
      },
    });

    await prisma.overtimeRequest.deleteMany({
      where: {
        employeeId: budiEmployeeId,
        date: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T00:00:00.000Z'),
        },
      },
    });

    // Upsert attendance for 2026-09-02 (PRESENT)
    await prisma.attendance.create({
      data: {
        employeeId: budiEmployeeId,
        attendanceDate: new Date('2026-09-02T00:00:00.000Z'),
        checkIn: new Date('2026-09-02T08:00:00.000Z'),
        checkOut: new Date('2026-09-02T17:00:00.000Z'),
        status: 'PRESENT',
        workingMinutes: 540,
      },
    });

    // Upsert attendance for 2026-09-03 (PRESENT)
    await prisma.attendance.create({
      data: {
        employeeId: budiEmployeeId,
        attendanceDate: new Date('2026-09-03T00:00:00.000Z'),
        checkIn: new Date('2026-09-03T08:00:00.000Z'),
        checkOut: new Date('2026-09-03T17:00:00.000Z'),
        status: 'PRESENT',
        workingMinutes: 540,
      },
    });
    console.log('✅ 2 Present attendance records registered for Budi.');

    // 5. Add Overtime for Budi in September 2026
    console.log('\n5. Creating approved Overtime request for Budi Santoso (120 minutes = 2.0 hours)...');
    // Clear previous test overtime for that date
    await prisma.overtimeRequest.deleteMany({
      where: {
        employeeId: budiEmployeeId,
        date: new Date('2026-09-04T00:00:00.000Z'),
      },
    });

    const overtime = await prisma.overtimeRequest.create({
      data: {
        employeeId: budiEmployeeId,
        date: new Date('2026-09-04T00:00:00.000Z'),
        plannedStartTime: '17:00',
        plannedEndTime: '19:00',
        requestedMinutes: 120,
        approvedMinutes: 120,
        status: 'APPROVED',
        reason: 'Penyelesaian deployment sistem absensi',
        approvedBy: hr.user.id,
        approvedAt: new Date(),
      },
    });
    console.log(`✅ Approved Overtime request created: ID ${overtime.id}, 120 minutes approved.`);
  } finally {
    await prisma.$disconnect();
  }

  // 6. Execute calculatePayroll via API
  console.log('\n6. Executing calculatePayroll via POST /api/payroll/periods/:id/calculate...');
  const calcRes = await request(`${API_BASE}/payroll/periods/${period.id}/calculate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hr.token}` },
  });

  if (calcRes.status !== 200 && calcRes.status !== 201) {
    throw new Error(`calculatePayroll failed: ${JSON.stringify(calcRes.data)}`);
  }
  console.log('✅ calculatePayroll output:', calcRes.data);

  // 7. Fetch and verify Budi's payslip
  console.log('\n7. Verifying Budi Santoso payslip formula...');
  const recordsRes = await request(
    `${API_BASE}/payroll/records?payrollPeriodId=${period.id}&employeeId=${budiEmployeeId}`,
    { headers: { Authorization: `Bearer ${admin.token}` } },
  );

  const budiRecord = recordsRes.data.data.find((r: any) => r.employeeId === budiEmployeeId);
  if (!budiRecord) {
    throw new Error('Budi payslip record not found!');
  }

  console.log('--- PAYSLIP BREAKDOWN FOR BUDI SANTOSO ---');
  console.log('Basic Salary     :', Number(budiRecord.basicSalary));
  console.log('Allowances       :', Number(budiRecord.allowances));
  console.log('  - Fixed        :', Number(budiRecord.fixedAllowance));
  console.log('  - Transport    :', Number(budiRecord.transportAllowance));
  console.log('Overtime Hours   :', Number(budiRecord.overtimeHours), 'hours');
  console.log('Overtime Pay     :', Number(budiRecord.overtimePay));
  console.log('Gross Salary     :', Number(budiRecord.grossSalary));
  console.log('Total Deductions :', Number(budiRecord.totalDeductions));
  console.log('Net / TakeHomePay:', Number(budiRecord.netSalary));

  const expectedHourly = Math.round(5000000 / 173);
  const expectedOvertimePay = Math.round(2.0 * expectedHourly); // 2 * 28902 = 57804
  const expectedGross = 5000000 + 500000 + expectedOvertimePay;
  const expectedDeductions = 0;
  const expectedNet = expectedGross - expectedDeductions;

  if (Number(budiRecord.basicSalary) !== 5000000) {
    throw new Error(`Expected Basic 5000000, got ${budiRecord.basicSalary}`);
  }
  if (Number(budiRecord.allowances) !== 500000) {
    throw new Error(`Expected Allowances 500000, got ${budiRecord.allowances}`);
  }
  if (Number(budiRecord.overtimePay) !== expectedOvertimePay) {
    throw new Error(`Expected OvertimePay ${expectedOvertimePay}, got ${budiRecord.overtimePay}`);
  }
  if (Number(budiRecord.grossSalary) !== expectedGross) {
    throw new Error(`Expected Gross ${expectedGross}, got ${budiRecord.grossSalary}`);
  }
  if (Number(budiRecord.netSalary) !== expectedNet) {
    throw new Error(`Expected TakeHomePay ${expectedNet}, got ${budiRecord.netSalary}`);
  }
  console.log('✅ FORMULA MATCHES: Take Home Pay = Basic + Allowance + Overtime - Deduction');

  // 8. SECURITY & IDOR CHECK
  console.log('\n8. Running Security & IDOR Verification...');

  // Test 8A: Budi accesses his own payslip
  const budiOwnRes = await request(`${API_BASE}/payroll/records/${budiRecord.id}`, {
    headers: { Authorization: `Bearer ${employeeBudi.token}` },
  });
  console.log(`8A. Budi accesses his own payslip -> Status: ${budiOwnRes.status} (Expected: 200)`);
  if (budiOwnRes.status !== 200) throw new Error('Budi should be allowed to view his own payslip');

  // Test 8B: Siti attempts to access Budi's payslip
  const sitiAccessBudiRes = await request(`${API_BASE}/payroll/records/${budiRecord.id}`, {
    headers: { Authorization: `Bearer ${employeeSiti.token}` },
  });
  console.log(`8B. Siti attempts to access Budi's payslip -> Status: ${sitiAccessBudiRes.status} (Expected: 403 Forbidden)`);
  if (sitiAccessBudiRes.status !== 403) {
    throw new Error(`IDOR Vulnerability! Siti was not blocked with 403, got: ${sitiAccessBudiRes.status}`);
  }

  // Test 8C: Employee attempts to execute calculatePayroll
  const employeeCalcRes = await request(`${API_BASE}/payroll/periods/${period.id}/calculate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employeeBudi.token}` },
  });
  console.log(`8C. Employee attempts to trigger calculatePayroll -> Status: ${employeeCalcRes.status} (Expected: 403 Forbidden)`);
  if (employeeCalcRes.status !== 403) {
    throw new Error(`RBAC Vulnerability! Employee could trigger calculation, got: ${employeeCalcRes.status}`);
  }

  // Test 8D: Employee attempts to modify Master Gaji
  const employeeEditSalaryRes = await request(`${API_BASE}/payroll/salaries/${budiEmployeeId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${employeeBudi.token}` },
    body: JSON.stringify({ basicSalary: 10000000 }),
  });
  console.log(`8D. Employee attempts to modify Master Gaji -> Status: ${employeeEditSalaryRes.status} (Expected: 403 Forbidden)`);
  if (employeeEditSalaryRes.status !== 403) {
    throw new Error(`RBAC Vulnerability! Employee could modify salary, got: ${employeeEditSalaryRes.status}`);
  }

  // Test 8E: Employee querying records is scoped to only their own records
  const employeeRecordsListRes = await request(`${API_BASE}/payroll/records`, {
    headers: { Authorization: `Bearer ${employeeBudi.token}` },
  });
  const allReturnedRecordsBelongToBudi = employeeRecordsListRes.data.data.every(
    (r: any) => r.employeeId === budiEmployeeId,
  );
  console.log(`8E. Employee query /records strictly scoped to self -> ${allReturnedRecordsBelongToBudi ? 'PASSED ✅' : 'FAILED ❌'}`);
  if (!allReturnedRecordsBelongToBudi) {
    throw new Error('Employee query returned records belonging to other employees!');
  }

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
