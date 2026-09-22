import { PrismaClient, UserRole, EmploymentStatus, OvertimeStatus, LeaveRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BACKEND_URL = 'http://localhost:5001/api';
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error('     Details:', JSON.stringify(detail, null, 2));
    failed++;
  }
}

async function runPayrollV2TestSuite() {
  console.log('================================================================');
  console.log('💰 RUNNING V2: PAYROLL MANAGEMENT COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // 0. SETUP: Ensure Users, Profiles, and Auth Tokens
    // -------------------------------------------------------------
    console.log('--- 0. Setup Test Users & Tokens ---');
    const passwordHash = await bcrypt.hash('password123', 10);

    // Admin
    let adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: { email: 'admin@example.com', passwordHash, role: UserRole.ADMIN },
      });
    }

    // HR
    let hrUser = await prisma.user.findUnique({ where: { email: 'hr@example.com' } });
    if (!hrUser) {
      hrUser = await prisma.user.create({
        data: { email: 'hr@example.com', passwordHash, role: UserRole.HR },
      });
    }

    // Ensure Department
    let dept = await prisma.department.findFirst();
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: 'Finance', code: 'FIN' },
      });
    }

    // Employee 1
    let empUser1: any = await prisma.user.findUnique({
      where: { email: 'employee@example.com' },
      include: { employee: true },
    });
    if (!empUser1) {
      empUser1 = await prisma.user.create({
        data: {
          email: 'employee@example.com',
          passwordHash,
          role: UserRole.EMPLOYEE,
          employee: {
            create: {
              employeeId: 'EMP-PAY-001',
              firstName: 'Andi',
              lastName: 'Pratama',
              email: 'employee@example.com',
              position: 'Staff Keuangan',
              departmentId: dept.id,
              employmentStatus: EmploymentStatus.ACTIVE,
              joinDate: new Date('2024-01-01'),
            },
          },
        },
        include: { employee: true },
      });
    }

    // Employee 2
    let empUser2: any = await prisma.user.findUnique({
      where: { email: 'employee2@example.com' },
      include: { employee: true },
    });
    if (!empUser2) {
      empUser2 = await prisma.user.create({
        data: {
          email: 'employee2@example.com',
          passwordHash,
          role: UserRole.EMPLOYEE,
          employee: {
            create: {
              employeeId: 'EMP-PAY-002',
              firstName: 'Budi',
              lastName: 'Santoso',
              email: 'employee2@example.com',
              position: 'Senior Developer',
              departmentId: dept.id,
              employmentStatus: EmploymentStatus.ACTIVE,
              joinDate: new Date('2024-01-01'),
            },
          },
        },
        include: { employee: true },
      });
    }

    // Login for tokens
    const login = async (email: string) => {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const data = (await res.json()) as any;
      return data.access_token;
    };

    const adminToken = await login('admin@example.com');
    const hrToken = await login('hr@example.com');
    const emp1Token = await login('employee@example.com');
    const emp2Token = await login('employee2@example.com');

    assert(!!adminToken && !!hrToken && !!emp1Token && !!emp2Token, 'All auth tokens acquired successfully');

    const emp1Id = empUser1.employee!.id;
    const emp2Id = empUser2.employee!.id;

    // -------------------------------------------------------------
    // 1. MASTER GAJI KARYAWAN (SALARY SETTINGS)
    // -------------------------------------------------------------
    console.log('\n--- 1. Master Gaji Karyawan (Salary Settings) ---');

    // Admin sets master salary for Employee 1 (default standard overtime formula: 6jt / 173)
    const emp1SalaryRes = await fetch(`${BACKEND_URL}/payroll/salaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: emp1Id,
        basicSalary: 6000000,
        allowances: 500000,
        deductions: 100000,
        bankName: 'BCA',
        bankAccountNumber: '1234567890',
        bankAccountHolder: 'Andi Pratama',
      }),
    });
    const emp1SalaryJson = await emp1SalaryRes.json();
    assert(emp1SalaryRes.status === 201, 'Admin can upsert employee master salary', emp1SalaryJson);
    assert(
      Number(emp1SalaryJson.basicSalary) === 6000000 && Number(emp1SalaryJson.allowances) === 500000,
      'Employee 1 basic salary and allowances saved correctly'
    );

    // Admin sets master salary for Employee 2 (custom overtime rate: 60,000/hr)
    const emp2SalaryRes = await fetch(`${BACKEND_URL}/payroll/salaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: emp2Id,
        basicSalary: 8000000,
        allowances: 1000000,
        deductions: 200000,
        overtimeRatePerHour: 60000,
        bankName: 'Bank Mandiri',
        bankAccountNumber: '9876543210',
        bankAccountHolder: 'Budi Santoso',
      }),
    });
    const emp2SalaryJson = await emp2SalaryRes.json();
    assert(emp2SalaryRes.status === 201, 'Admin can set custom overtime rate per hour', emp2SalaryJson);
    assert(
      Number(emp2SalaryJson.overtimeRatePerHour) === 60000,
      'Employee 2 custom overtime rate is exactly 60,000/hr'
    );

    // Employee cannot set salary (Forbidden)
    const empForbiddenSalaryRes = await fetch(`${BACKEND_URL}/payroll/salaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: emp1Id,
        basicSalary: 99999999,
      }),
    });
    assert(empForbiddenSalaryRes.status === 403, 'EMPLOYEE role forbidden from modifying salary settings');

    // -------------------------------------------------------------
    // 2. PERIODE PAYROLL BULANAN
    // -------------------------------------------------------------
    console.log('\n--- 2. Periode Payroll Bulanan ---');

    // Clean up any existing test period for month 9, year 2026
    const existingPeriod = await prisma.payrollPeriod.findFirst({
      where: { month: 9, year: 2026 },
    });
    if (existingPeriod) {
      await prisma.payrollRecord.deleteMany({ where: { payrollPeriodId: existingPeriod.id } });
      await prisma.payrollPeriod.delete({ where: { id: existingPeriod.id } });
    }

    // HR creates a new payroll period
    const createPeriodRes = await fetch(`${BACKEND_URL}/payroll/periods`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Gaji September 2026 - Test',
        month: 9,
        year: 2026,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        notes: 'Periode uji coba V2 Payroll',
      }),
    });
    const periodJson = await createPeriodRes.json();
    assert(createPeriodRes.status === 201, 'HR can create monthly payroll period', periodJson);
    assert(periodJson.status === 'DRAFT', 'Newly created period status is DRAFT');

    const periodId = periodJson.id;

    // Employee cannot create period
    const empPeriodRes = await fetch(`${BACKEND_URL}/payroll/periods`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Hacked Period',
        month: 10,
        year: 2026,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      }),
    });
    assert(empPeriodRes.status === 403, 'EMPLOYEE role forbidden from creating payroll period');

    // -------------------------------------------------------------
    // 3. INTEGRASI ATTENDANCE, LEAVE, & OVERTIME
    // -------------------------------------------------------------
    console.log('\n--- 3. Integrasi Data Presensi, Cuti, dan Lembur ---');

    // Clean up previous test attendance, leaves, and overtimes for test dates
    await prisma.attendance.deleteMany({
      where: {
        employeeId: { in: [emp1Id, emp2Id] },
        attendanceDate: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T23:59:59.999Z'),
        },
      },
    });

    await prisma.leaveRequest.deleteMany({
      where: {
        employeeId: { in: [emp1Id, emp2Id] },
        startDate: { gte: new Date('2026-09-01T00:00:00.000Z') },
        endDate: { lte: new Date('2026-09-30T23:59:59.999Z') },
      },
    });

    await prisma.overtimeRequest.deleteMany({
      where: {
        employeeId: { in: [emp1Id, emp2Id] },
        date: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T23:59:59.999Z'),
        },
      },
    });

    // Seed 20 attendance records for Emp 1 in Sept 2026 (including 2 late)
    for (let day = 1; day <= 20; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateObj = new Date(`2026-09-${dayStr}T00:00:00.000Z`);
      await prisma.attendance.upsert({
        where: {
          uq_employee_attendance_date: {
            employeeId: emp1Id,
            attendanceDate: dateObj,
          },
        },
        update: {
          status: day <= 2 ? 'LATE' : 'PRESENT',
          checkIn: new Date(`2026-09-${dayStr}T01:${day <= 2 ? '30' : '00'}:00.000Z`),
          checkOut: new Date(`2026-09-${dayStr}T09:00:00.000Z`),
        },
        create: {
          employeeId: emp1Id,
          attendanceDate: dateObj,
          status: day <= 2 ? 'LATE' : 'PRESENT',
          checkIn: new Date(`2026-09-${dayStr}T01:${day <= 2 ? '30' : '00'}:00.000Z`),
          checkOut: new Date(`2026-09-${dayStr}T09:00:00.000Z`),
        },
      });
    }

    // Seed approved Leave Request (2 days)
    let leaveType = await prisma.leaveType.findFirst();
    if (!leaveType) {
      leaveType = await prisma.leaveType.create({
        data: { code: 'ANNUAL', name: 'Cuti Tahunan', defaultDays: 12, isPaid: true },
      });
    }
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp1Id,
        leaveTypeId: leaveType.id,
        startDate: new Date('2026-09-22T00:00:00.000Z'),
        endDate: new Date('2026-09-23T00:00:00.000Z'),
        duration: 2,
        reason: 'Cuti keperluan keluarga',
        status: LeaveRequestStatus.APPROVED,
      },
    });

    // Seed approved Overtime Request for Emp 1: 3 hours = 180 min (not yet payrollProcessed)
    const otEmp1 = await prisma.overtimeRequest.create({
      data: {
        employeeId: emp1Id,
        date: new Date('2026-09-15T00:00:00.000Z'),
        plannedStartTime: '18:00',
        plannedEndTime: '21:00',
        requestedMinutes: 180,
        approvedMinutes: 180,
        status: OvertimeStatus.APPROVED,
        reason: 'Pekerjaan akhir bulan',
        payrollProcessed: false,
      },
    });

    // Seed approved Overtime Request for Emp 2: 2 hours = 120 min (not yet payrollProcessed)
    const otEmp2 = await prisma.overtimeRequest.create({
      data: {
        employeeId: emp2Id,
        date: new Date('2026-09-16T00:00:00.000Z'),
        plannedStartTime: '18:00',
        plannedEndTime: '20:00',
        requestedMinutes: 120,
        approvedMinutes: 120,
        status: OvertimeStatus.APPROVED,
        reason: 'Deploy hotfix v2',
        payrollProcessed: false,
      },
    });

    assert(
      !otEmp1.payrollProcessed && !otEmp2.payrollProcessed,
      'Approved overtimes seeded with payrollProcessed = false'
    );

    // -------------------------------------------------------------
    // 4. AUTOMATED PAYROLL GENERATION & FORMULA VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- 4. Automated Payroll Generation & Formula Validation ---');

    // HR triggers automated generation
    const generateRes = await fetch(`${BACKEND_URL}/payroll/periods/${periodId}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': 'application/json',
      },
    });
    const generateJson = await generateRes.json();
    assert(generateRes.status === 201, 'Automated payroll generation executes successfully', generateJson);
    assert(generateJson.generatedCount >= 2, 'At least 2 employee records generated');

    // Retrieve records
    const recordsRes = await fetch(`${BACKEND_URL}/payroll/records?payrollPeriodId=${periodId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const recordsJson = await recordsRes.json();
    const records: any[] = recordsJson.data || [];

    const rec1 = records.find((r) => r.employeeId === emp1Id);
    const rec2 = records.find((r) => r.employeeId === emp2Id);

    assert(!!rec1 && !!rec2, 'Both employee records generated');

    // Verify Employee 1 calculations:
    // basicSalary = 6,000,000
    // allowances = 500,000
    // deductions = 100,000
    // overtimeHours = 3 (180 mins / 60)
    // hourlyRate = round(6,000,000 / 173) = 34,682
    // overtimePay = 3 * 34,682 = 104,046
    // netSalary = 6,000,000 + 500,000 + 104,046 - 100,000 = 6,504,046
    const hourlyRate1 = Math.round(6000000 / 173);
    const expectedOtPay1 = 3 * hourlyRate1;
    const expectedNet1 = 6000000 + 500000 + expectedOtPay1 - 100000;

    assert(Number(rec1.basicSalary) === 6000000, 'Emp 1 basicSalary is 6,000,000');
    assert(Number(rec1.overtimeHours) === 3, 'Emp 1 overtimeHours is 3.0');
    assert(Number(rec1.overtimePay) === expectedOtPay1, `Emp 1 overtimePay is exactly ${expectedOtPay1}`);
    assert(rec1.presentDays === 20, 'Emp 1 presentDays matches 20 attendance records', { presentDays: rec1.presentDays });
    assert(rec1.lateDays === 2, 'Emp 1 lateDays matches 2 late records', { lateDays: rec1.lateDays });
    assert(rec1.leaveDays === 2, 'Emp 1 leaveDays matches 2 approved leave days');
    assert(Number(rec1.netSalary) === expectedNet1, `Emp 1 netSalary is ${expectedNet1}`);

    // Verify Employee 2 calculations with custom rate:
    // basicSalary = 8,000,000
    // allowances = 1,000,000
    // deductions = 200,000
    // overtimeHours = 2
    // custom rate = 60,000/hr => overtimePay = 2 * 60,000 = 120,000
    // netSalary = 8,000,000 + 1,000,000 + 120,000 - 200,000 = 8,920,000
    assert(Number(rec2.overtimePay) === 120000, 'Emp 2 custom overtime rate of 60,000/hr correctly calculated to 120,000');
    assert(Number(rec2.netSalary) === 8920000, 'Emp 2 netSalary correctly calculated to 8,920,000');

    // -------------------------------------------------------------
    // 5. MANUAL ADJUSTMENT (AUDIT & RE-CALCULATION)
    // -------------------------------------------------------------
    console.log('\n--- 5. Manual Adjustment of Payroll Record ---');

    // Admin adjusts Employee 1's allowances from 500,000 to 750,000
    const adjustRes = await fetch(`${BACKEND_URL}/payroll/records/${rec1.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allowances: 750000,
        notes: 'Penambahan bonus lembur proyek akhir kuartal',
      }),
    });
    const adjustJson = await adjustRes.json();
    assert(adjustRes.status === 200, 'Admin can adjust record allowances/deductions', adjustJson);

    const updatedNet1 = 6000000 + 750000 + expectedOtPay1 - 100000;
    assert(
      Number(adjustJson.netSalary) === updatedNet1,
      `Net salary recalculated accurately after adjustment: ${updatedNet1}`
    );

    // -------------------------------------------------------------
    // 6. WORKFLOW LIFECYCLE: DRAFT -> PROCESSED -> PAID
    // -------------------------------------------------------------
    console.log('\n--- 6. Workflow Lifecycle: DRAFT -> PROCESSED -> PAID ---');

    // 6a. Process Period
    const processRes = await fetch(`${BACKEND_URL}/payroll/periods/${periodId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const processJson = await processRes.json();
    assert(processRes.status === 201, 'Period transitioned to PROCESSED', processJson);

    // Period dates cannot be modified when PROCESSED
    const illegalEditRes = await fetch(`${BACKEND_URL}/payroll/periods/${periodId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Should Fail' }),
    });
    assert(illegalEditRes.status === 400, 'Cannot edit period dates/name once PROCESSED');

    // 6b. Pay Period (PAID)
    const payRes = await fetch(`${BACKEND_URL}/payroll/periods/${periodId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const payJson = await payRes.json();
    assert(payRes.status === 201, 'Period transitioned to PAID (Paid out)', payJson);

    // Verify overtimes are now flagged as payrollProcessed = true
    const checkOt1 = await prisma.overtimeRequest.findUnique({ where: { id: otEmp1.id } });
    const checkOt2 = await prisma.overtimeRequest.findUnique({ where: { id: otEmp2.id } });
    assert(
      checkOt1?.payrollProcessed === true && checkOt2?.payrollProcessed === true,
      'Approved overtimes marked as payrollProcessed = true upon PAID status'
    );

    // Verify notification was sent to Employee 1
    const notif = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'PAYROLL_PAID',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!notif, 'Employee 1 received PAYROLL_PAID notification');

    // Cannot adjust record once period/record is PAID
    const illegalRecordAdjustRes = await fetch(`${BACKEND_URL}/payroll/records/${rec1.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ allowances: 9999999 }),
    });
    assert(illegalRecordAdjustRes.status === 400, 'Record adjustment blocked when status is PAID');

    // -------------------------------------------------------------
    // 7. RBAC & IDOR SECURITY TEST
    // -------------------------------------------------------------
    console.log('\n--- 7. RBAC & IDOR Security ---');

    // Emp 1 views own record: SUCCESS
    const emp1ViewOwnRes = await fetch(`${BACKEND_URL}/payroll/records/${rec1.id}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(emp1ViewOwnRes.status === 200, 'EMPLOYEE can view their own payroll slip record');

    // Emp 1 attempts to view Emp 2 record by ID: 403 FORBIDDEN (IDOR prevented!)
    const emp1ViewEmp2Res = await fetch(`${BACKEND_URL}/payroll/records/${rec2.id}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(
      emp1ViewEmp2Res.status === 403,
      'IDOR Attack Blocked: Employee 1 cannot access Employee 2 payslip by ID (403 Forbidden)'
    );

    // Emp 1 queries list: ONLY receives their own records
    const emp1ListRes = await fetch(`${BACKEND_URL}/payroll/records`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const emp1ListJson = await emp1ListRes.json();
    const emp1Records: any[] = emp1ListJson.data || [];
    const containsOther = emp1Records.some((r) => r.employeeId !== emp1Id);
    assert(!containsOther, 'Scoped Query: Employee 1 record list never includes records of other employees');

    // Emp 1 cannot process or pay
    const empPayRes = await fetch(`${BACKEND_URL}/payroll/periods/${periodId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(empPayRes.status === 403, 'EMPLOYEE role forbidden from paying payroll periods');

    // -------------------------------------------------------------
    // 8. AUDIT LOG VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- 8. Audit Log Validation ---');

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'SALARY_MASTER_UPSERTED',
            'PAYROLL_PERIOD_CREATED',
            'PAYROLL_GENERATED',
            'PAYROLL_RECORD_UPDATED',
            'PAYROLL_PROCESSED',
            'PAYROLL_PAID',
          ],
        },
      },
    });

    const recordedActions = new Set(auditLogs.map((a) => a.action));
    assert(recordedActions.has('SALARY_MASTER_UPSERTED'), 'Audit log records SALARY_MASTER_UPSERTED');
    assert(recordedActions.has('PAYROLL_PERIOD_CREATED'), 'Audit log records PAYROLL_PERIOD_CREATED');
    assert(recordedActions.has('PAYROLL_GENERATED'), 'Audit log records PAYROLL_GENERATED');
    assert(recordedActions.has('PAYROLL_PROCESSED'), 'Audit log records PAYROLL_PROCESSED');
    assert(recordedActions.has('PAYROLL_PAID'), 'Audit log records PAYROLL_PAID');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 TEST SUITE COMPLETE: Passed: ${passed} | Failed: ${failed}`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPayrollV2TestSuite();
