export {};

const API_BASE = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000';

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
  return { status: res.status, ok: res.ok, data };
}

async function login(email: string, password = 'password123') {
  const res = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = res.data?.access_token || res.data?.accessToken;
  if (!res.ok || !token) {
    throw new Error(`Failed to login as ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token, user: res.data.user };
}

async function run() {
  console.log('========================================================');
  console.log('🚀 TESTING PAYROLL CALCULATION ENGINE V1');
  console.log('========================================================\n');

  // 1. Authenticate Admin and Employee
  console.log('1. Authenticating Admin and Employee Jesen...');
  const admin = await login('admin@example.com');
  const employeeJesen = await login('jesen2307@gmail.com');
  const employeeBudi = await login('budi.santoso@example.com');
  console.log('✅ Authenticated: Admin, Employee Jesen, Employee Budi.');

  const jesenEmpId = employeeJesen.user.employee.id;
  const budiEmpId = employeeBudi.user.employee.id;

  // 2. Set Master Gaji for Employee Jesen
  // Basic Salary: 5.000.000, Allowance: 500.000
  console.log('\n2. Setting Master Gaji for Employee Jesen:');
  console.log('   - Basic Salary: Rp 5.000.000');
  console.log('   - Allowance   : Rp 500.000');
  const setSalaryRes = await request(`${API_BASE}/payroll/salaries/${jesenEmpId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${admin.token}` },
    body: JSON.stringify({
      employeeId: jesenEmpId,
      basicSalary: 5000000,
      allowances: 500000,
      fixedAllowance: 300000,
      transportAllowance: 200000,
      mealAllowance: 0,
      overtimeRatePerHour: 150000, // 2 hours overtime = Rp 300.000
      deductions: 0,
      fixedDeduction: 0,
      bpjsDeduction: 0,
      taxDeduction: 0,
    }),
  });

  if (!setSalaryRes.ok) {
    throw new Error(`Failed to set salary: ${JSON.stringify(setSalaryRes.data)}`);
  }
  console.log('✅ Master Gaji successfully saved.');

  // 3. Ensure a test payroll period exists
  console.log('\n3. Creating / Ensuring Payroll Period October 2026...');
  const periodsRes = await request(`${API_BASE}/payroll/periods`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });

  let period = (periodsRes.data || []).find((p: any) => p.month === 10 && p.year === 2026);
  if (!period) {
    const createRes = await request(`${API_BASE}/payroll/periods`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        name: 'Oktober 2026',
        month: 10,
        year: 2026,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        notes: 'Uji Payroll Engine V1',
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create period: ${JSON.stringify(createRes.data)}`);
    }
    period = createRes.data;
  }
  console.log(`✅ Payroll Period: ${period.name} (ID: ${period.id})`);

  // 4. Setup Prisma data for Overtime = Rp 300.000 and Attendance
  console.log('\n4. Setting up Attendance & Approved Overtime in Period...');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Reset period status to DRAFT if needed
    if (period.status !== 'DRAFT') {
      await prisma.payrollPeriod.update({
        where: { id: period.id },
        data: { status: 'DRAFT' },
      });
      period.status = 'DRAFT';
    }

    // Clean up any existing attendance and overtime for Jesen in that period
    await prisma.attendance.deleteMany({
      where: {
        employeeId: jesenEmpId,
        attendanceDate: {
          gte: new Date('2026-10-01T00:00:00.000Z'),
          lte: new Date('2026-10-31T00:00:00.000Z'),
        },
      },
    });

    await prisma.overtimeRequest.deleteMany({
      where: {
        employeeId: jesenEmpId,
        date: {
          gte: new Date('2026-10-01T00:00:00.000Z'),
          lte: new Date('2026-10-31T00:00:00.000Z'),
        },
      },
    });

    // Create 1 attendance record (PRESENT, 0 late, 0 absent)
    await prisma.attendance.create({
      data: {
        employeeId: jesenEmpId,
        attendanceDate: new Date('2026-10-02T00:00:00.000Z'),
        checkIn: new Date('2026-10-02T08:00:00.000Z'),
        checkOut: new Date('2026-10-02T17:00:00.000Z'),
        status: 'PRESENT',
        workingMinutes: 540,
      },
    });

    // Create Approved Overtime for Jesen: 120 minutes (2.0 hours) * 150.000/hr = 300.000
    // Also include note "amount: 300000" for double robustness
    const ot = await prisma.overtimeRequest.create({
      data: {
        employeeId: jesenEmpId,
        date: new Date('2026-10-05T00:00:00.000Z'),
        plannedStartTime: '17:00',
        plannedEndTime: '19:00',
        requestedMinutes: 120,
        approvedMinutes: 120,
        status: 'APPROVED',
        reason: 'Maintenance server database bulanan',
        notes: 'Lembur disetujui amount: 300000',
        approvedBy: admin.user.id,
        approvedAt: new Date(),
      },
    });
    console.log(`✅ Approved Overtime created (120 mins @ Rp 150.000 / amount: 300000) -> Overtime: Rp 300.000.`);
  } finally {
    await prisma.$disconnect();
  }

  // 5. Generate Payroll via POST /api/payroll/periods/:id/generate
  console.log('\n5. Executing Generate Payroll (POST /api/payroll/periods/:id/generate)...');
  const genRes = await request(`${API_BASE}/payroll/periods/${period.id}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}` },
  });

  if (!genRes.ok) {
    throw new Error(`Generate payroll failed: ${JSON.stringify(genRes.data)}`);
  }
  console.log('✅ Generate Payroll execution output:', genRes.data);

  // 6. Verify Calculated Payslip Record for Jesen
  console.log('\n6. Verifying calculated Payslip for Jesen:');
  const recordRes = await request(
    `${API_BASE}/payroll/records?payrollPeriodId=${period.id}&employeeId=${jesenEmpId}`,
    { headers: { Authorization: `Bearer ${admin.token}` } },
  );

  const jesenSlip = (recordRes.data?.data || []).find((r: any) => r.employeeId === jesenEmpId);
  if (!jesenSlip) {
    throw new Error('Payslip record for Jesen not found!');
  }

  const basicSalary = Number(jesenSlip.basicSalary);
  const allowances = Number(jesenSlip.allowances);
  const overtime = Number(jesenSlip.overtimePay);
  const grossSalary = Number(jesenSlip.grossSalary);
  const deductions = Number(jesenSlip.totalDeductions);
  const takeHomePay = Number(jesenSlip.takeHomePay);

  console.log('--------------------------------------------------');
  console.log(`Basic Salary  : Rp ${basicSalary.toLocaleString('id-ID')}`);
  console.log(`Allowance     : Rp ${allowances.toLocaleString('id-ID')}`);
  console.log(`Overtime      : Rp ${overtime.toLocaleString('id-ID')}`);
  console.log(`-------------------------------------------------- (+)`);
  console.log(`Gross Salary  : Rp ${grossSalary.toLocaleString('id-ID')}`);
  console.log(`Deduction     : Rp ${deductions.toLocaleString('id-ID')}`);
  console.log(`-------------------------------------------------- (-)`);
  console.log(`Take Home Pay : Rp ${takeHomePay.toLocaleString('id-ID')}`);
  console.log('--------------------------------------------------');

  // Verify exact math
  // Gross = Basic (5000000) + Allowance (500000) + Overtime (300000) = 5800000
  if (basicSalary !== 5000000) throw new Error(`Expected Basic 5000000, got ${basicSalary}`);
  if (allowances !== 500000) throw new Error(`Expected Allowance 500000, got ${allowances}`);
  if (overtime !== 300000) throw new Error(`Expected Overtime 300000, got ${overtime}`);
  if (grossSalary !== 5800000) throw new Error(`Expected Gross 5800000, got ${grossSalary}`);
  if (deductions !== 0) throw new Error(`Expected Deduction 0, got ${deductions}`);
  if (takeHomePay !== 5800000) throw new Error(`Expected TakeHomePay 5800000, got ${takeHomePay}`);
  console.log('✅ PASS: Take Home Pay dihitung otomatis: Rp 5.800.000!');

  // 7. Verify RBAC & Ownership
  console.log('\n7. Verifying RBAC & IDOR Rules:');

  // 7a. Employee can see own payslip
  const empGetRes = await request(`${API_BASE}/payroll/records`, {
    headers: { Authorization: `Bearer ${employeeJesen.token}` },
  });
  const empSeesOwn = (empGetRes.data?.data || []).some((r: any) => r.id === jesenSlip.id);
  if (empSeesOwn) {
    console.log('✅ PASS: Employee dapat melihat slip gajinya sendiri.');
  } else {
    throw new Error('Employee cannot view their own payslip!');
  }

  // 7b. Another employee (Budi) CANNOT see Jesen's payslip
  const budiGetRes = await request(`${API_BASE}/payroll/records`, {
    headers: { Authorization: `Bearer ${employeeBudi.token}` },
  });
  const budiSeesJesen = (budiGetRes.data?.data || []).some((r: any) => r.id === jesenSlip.id);
  if (!budiSeesJesen) {
    console.log('✅ PASS: Employee lain (Budi) TIDAK DAPAT melihat slip gaji Jesen.');
  } else {
    throw new Error('Data breach: Employee Budi can see Jesen payslip!');
  }

  // 7c. Direct IDOR attempt: Budi attempts GET /api/payroll/records/:jesenSlipId
  const idorRes = await request(`${API_BASE}/payroll/records/${jesenSlip.id}`, {
    headers: { Authorization: `Bearer ${employeeBudi.token}` },
  });
  if (idorRes.status === 403) {
    console.log('✅ PASS: Percobaan IDOR ditolak dengan 403 Forbidden.');
  } else {
    throw new Error(`IDOR protection failed! Status: ${idorRes.status}`);
  }

  // 7d. Employee attempts to generate payroll -> 403 Forbidden
  const empGenRes = await request(`${API_BASE}/payroll/periods/${period.id}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employeeJesen.token}` },
  });
  if (empGenRes.status === 403) {
    console.log('✅ PASS: Employee dilarang menjalankan generate payroll (403 Forbidden).');
  } else {
    throw new Error(`Employee generate protection failed! Status: ${empGenRes.status}`);
  }

  console.log('\n========================================================');
  console.log('🎉 ALL PAYROLL CALCULATION ENGINE V1 TESTS PASSED!');
  console.log('========================================================\n');
}

run().catch((e) => {
  console.error('Error running test:', e);
  process.exit(1);
});
