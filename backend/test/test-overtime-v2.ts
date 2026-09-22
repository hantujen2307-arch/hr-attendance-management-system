import { PrismaClient, UserRole, EmploymentStatus, OvertimeStatus, LeaveRequestStatus, ShiftStatus } from '@prisma/client';
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

async function runOvertimeV2TestSuite() {
  console.log('================================================================');
  console.log('⏱️  RUNNING V2: OVERTIME MANAGEMENT COMPREHENSIVE TEST SUITE');
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

    // Ensure Department exists
    let dept = await prisma.department.findFirst();
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: 'Engineering', code: 'ENG' },
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
              employeeId: 'EMP-V2-001',
              firstName: 'Overtime',
              lastName: 'Employee One',
              email: 'employee@example.com',
              position: 'Software Engineer',
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
              employeeId: 'EMP-V2-002',
              firstName: 'Overtime',
              lastName: 'Employee Two',
              email: 'employee2@example.com',
              position: 'Software Engineer',
              departmentId: dept.id,
              employmentStatus: EmploymentStatus.ACTIVE,
              joinDate: new Date('2024-01-01'),
            },
          },
        },
        include: { employee: true },
      });
    }

    // Ensure LeaveType exists for conflict testing
    let leaveType = await prisma.leaveType.findFirst();
    if (!leaveType) {
      leaveType = await prisma.leaveType.create({
        data: {
          code: 'ANNUAL',
          name: 'Cuti Tahunan',
          defaultDays: 12,
          isPaid: true,
        },
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
    // 1. OVERTIME SUBMISSION & DURATION CALCULATION
    // -------------------------------------------------------------
    console.log('\n--- 1. Overtime Submission & Duration Calculations ---');

    // 1.1 Regular daytime overtime submission (17:00 to 19:30 = 150 minutes)
    const testDate1 = '2026-11-10';
    // Clean up any existing records on test dates
    await prisma.overtimeRequest.deleteMany({
      where: {
        date: {
          in: [
            new Date(`${testDate1}T00:00:00.000Z`),
            new Date('2026-11-11T00:00:00.000Z'),
            new Date('2026-11-12T00:00:00.000Z'),
            new Date('2026-11-13T00:00:00.000Z'),
            new Date('2026-11-14T00:00:00.000Z'),
          ],
        },
      },
    });

    const createDaytimeRes = await fetch(`${BACKEND_URL}/overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        date: testDate1,
        plannedStartTime: '17:00',
        plannedEndTime: '19:30',
        reason: 'Deploying Q4 System Release',
        notes: 'Coordinating with server admin',
      }),
    });
    const daytimeData = (await createDaytimeRes.json()) as any;
    assert(createDaytimeRes.status === 201, 'Employee 1 submits regular overtime (201 Created)', daytimeData);
    assert(
      daytimeData.status === OvertimeStatus.PENDING && daytimeData.requestedMinutes === 150,
      'Regular overtime calculated duration accurately: 150 minutes (17:00 to 19:30)'
    );

    const overtime1Id = daytimeData.id;

    // 1.2 Overnight overtime submission crossing midnight (21:00 to 02:30 = 330 minutes)
    const testDate2 = '2026-11-11';
    const createOvernightRes = await fetch(`${BACKEND_URL}/overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        date: testDate2,
        plannedStartTime: '21:00',
        plannedEndTime: '02:30',
        reason: 'Emergency server database migration',
        notes: 'Crossing midnight task',
      }),
    });
    const overnightData = (await createOvernightRes.json()) as any;
    assert(createOvernightRes.status === 201, 'Employee 1 submits overnight overtime crossing midnight (201 Created)', overnightData);
    assert(
      overnightData.requestedMinutes === 330,
      'Overnight overtime calculates midnight transition duration correctly: 330 minutes (21:00 to 02:30)'
    );

    const overtimeOvernightId = overnightData.id;

    // -------------------------------------------------------------
    // 2. VALIDATION & CONFLICT PREVENTION
    // -------------------------------------------------------------
    console.log('\n--- 2. Validation & Conflict Prevention ---');

    // 2.1 Identical start and end time (duration 0)
    const testDate3 = '2026-11-12';
    const zeroDurationRes = await fetch(`${BACKEND_URL}/overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        date: testDate3,
        plannedStartTime: '18:00',
        plannedEndTime: '18:00',
        reason: 'Zero duration test',
      }),
    });
    assert(
      zeroDurationRes.status === 400,
      'Rejects overtime with zero duration (400 Bad Request)'
    );

    // 2.2 Overlapping overtime request for the same employee on the same date
    const overlapRes = await fetch(`${BACKEND_URL}/overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        date: testDate1,
        plannedStartTime: '18:00',
        plannedEndTime: '20:00',
        reason: 'Overlapping overtime test',
      }),
    });
    assert(
      overlapRes.status === 409,
      'Rejects overlapping overtime request on same date (409 Conflict)'
    );

    // 2.3 Conflicting approved leave request on same date
    const leaveDate = '2026-11-13';
    await prisma.leaveRequest.deleteMany({
      where: { employeeId: emp1Id, startDate: new Date(`${leaveDate}T00:00:00.000Z`) },
    });
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp1Id,
        leaveTypeId: leaveType.id,
        startDate: new Date(`${leaveDate}T00:00:00.000Z`),
        endDate: new Date(`${leaveDate}T00:00:00.000Z`),
        reason: 'Scheduled vacation',
        status: LeaveRequestStatus.APPROVED,
      },
    });

    const leaveConflictRes = await fetch(`${BACKEND_URL}/overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        date: leaveDate,
        plannedStartTime: '17:00',
        plannedEndTime: '19:00',
        reason: 'Attempting overtime on approved leave',
      }),
    });
    assert(
      leaveConflictRes.status === 400,
      'Rejects overtime request on date with approved leave (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // 3. EMPLOYEE MODIFICATION & EDITING (PENDING ONLY)
    // -------------------------------------------------------------
    console.log('\n--- 3. Employee Overtime Modification ---');

    // 3.1 Employee 1 updates their pending request
    const updateRes = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        plannedStartTime: '17:00',
        plannedEndTime: '20:00',
        reason: 'Updated: Deploying Q4 System Release & Hotfixes',
      }),
    });
    const updatedData = (await updateRes.json()) as any;
    assert(updateRes.status === 200, 'Employee 1 successfully updates pending overtime (200 OK)', updatedData);
    assert(
      updatedData.requestedMinutes === 180 && updatedData.reason.includes('Hotfixes'),
      'Updated overtime reflects new times (17:00-20:00 = 180m) and updated reason'
    );

    // -------------------------------------------------------------
    // 4. AUTHORIZATION & IDOR PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- 4. Authorization & IDOR Protection ---');

    // 4.1 Employee 2 cannot view Employee 1's overtime
    const emp2ViewEmp1Res = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    assert(
      emp2ViewEmp1Res.status === 403,
      'Employee 2 cannot view Employee 1 overtime (IDOR blocked with 403 Forbidden)'
    );

    // 4.2 Employee 2 cannot update Employee 1's overtime
    const emp2UpdateEmp1Res = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp2Token}`,
      },
      body: JSON.stringify({ reason: 'Malicious modification attempt' }),
    });
    assert(
      emp2UpdateEmp1Res.status === 403,
      'Employee 2 cannot modify Employee 1 overtime (IDOR blocked with 403 Forbidden)'
    );

    // 4.3 Employee 2 cannot cancel Employee 1's overtime
    const emp2CancelEmp1Res = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    assert(
      emp2CancelEmp1Res.status === 403,
      'Employee 2 cannot cancel Employee 1 overtime (IDOR blocked with 403 Forbidden)'
    );

    // 4.4 Employee cannot approve overtime
    const empApproveRes = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ approvedMinutes: 180 }),
    });
    assert(
      empApproveRes.status === 403,
      'Employee cannot approve overtime (403 Forbidden)'
    );

    // 4.5 Employee cannot reject overtime
    const empRejectRes = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ rejectedReason: 'Self rejection attempt' }),
    });
    assert(
      empRejectRes.status === 403,
      'Employee cannot reject overtime (403 Forbidden)'
    );

    // 4.6 Employee list filtering: Employee only sees own overtimes
    const empListRes = await fetch(`${BACKEND_URL}/overtime`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const empListData = (await empListRes.json()) as any;
    const items = empListData.data || empListData;
    const allBelongToEmp1 = Array.isArray(items) && items.every((i: any) => i.employeeId === emp1Id);
    assert(
      empListRes.status === 200 && allBelongToEmp1,
      'Employee list query strictly scoped to own employee ID'
    );

    // 4.7 HR & Admin can see all overtime requests
    const hrListRes = await fetch(`${BACKEND_URL}/overtime`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(hrListRes.status === 200, 'HR can list all overtime requests (200 OK)');

    // -------------------------------------------------------------
    // 5. CANCELLATION WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- 5. Cancellation Workflow ---');

    // 5.1 Employee 1 cancels their overnight overtime request
    const cancelRes = await fetch(`${BACKEND_URL}/overtime/${overtimeOvernightId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const cancelledData = (await cancelRes.json()) as any;
    assert(cancelRes.status === 200, 'Employee 1 cancels pending overtime (200 OK)');
    assert(cancelledData.status === OvertimeStatus.CANCELLED, 'Status changed to CANCELLED');

    // 5.2 Attempting to edit a CANCELLED request fails
    const editCancelledRes = await fetch(`${BACKEND_URL}/overtime/${overtimeOvernightId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ reason: 'Attempting edit on cancelled overtime' }),
    });
    assert(
      editCancelledRes.status === 400,
      'Cannot modify non-pending overtime (400 Bad Request)'
    );

    // 5.3 Attempting to cancel already CANCELLED request fails
    const reCancelRes = await fetch(`${BACKEND_URL}/overtime/${overtimeOvernightId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(
      reCancelRes.status === 400,
      'Cannot cancel already cancelled overtime (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // 6. APPROVAL WORKFLOW & NOTIFICATION DISPATCH (HR / ADMIN)
    // -------------------------------------------------------------
    console.log('\n--- 6. Approval Workflow & Notification Dispatch ---');

    // 6.1 HR approves overtime 1 with 120 approved minutes
    const approveRes = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({ approvedMinutes: 120 }),
    });
    const approvedData = (await approveRes.json()) as any;
    assert(approveRes.status === 200, 'HR approves overtime request (200 OK)', approvedData);
    assert(
      approvedData.status === OvertimeStatus.APPROVED && approvedData.approvedMinutes === 120,
      'Overtime status is APPROVED with approvedMinutes recorded'
    );

    // 6.2 Verify OVERTIME_APPROVED notification was dispatched to Employee 1
    const notifApproved = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'OVERTIME_APPROVED',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      !!notifApproved && notifApproved.title.includes('Lembur Disetujui'),
      'Employee 1 receives OVERTIME_APPROVED notification'
    );

    // 6.3 Employee cannot cancel an APPROVED overtime
    const cancelApprovedRes = await fetch(`${BACKEND_URL}/overtime/${overtime1Id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(
      cancelApprovedRes.status === 400,
      'Employee cannot cancel an already APPROVED overtime (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // 7. REJECTION WORKFLOW & NOTIFICATION DISPATCH (HR / ADMIN)
    // -------------------------------------------------------------
    console.log('\n--- 7. Rejection Workflow & Notification Dispatch ---');

    // Create a new pending overtime for rejection test
    const createForRejectRes = await fetch(`${BACKEND_URL}/overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        date: '2026-11-14',
        plannedStartTime: '18:00',
        plannedEndTime: '21:00',
        reason: 'Weekend system patch',
      }),
    });
    const forRejectData = (await createForRejectRes.json()) as any;
    const overtimeRejectId = forRejectData.id;

    // Admin rejects overtime
    const rejectRes = await fetch(`${BACKEND_URL}/overtime/${overtimeRejectId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ rejectedReason: 'Budget overtime Q4 exhausted' }),
    });
    const rejectedData = (await rejectRes.json()) as any;
    assert(rejectRes.status === 200, 'Admin rejects overtime request (200 OK)', rejectedData);
    assert(
      rejectedData.status === OvertimeStatus.REJECTED &&
        rejectedData.rejectedReason === 'Budget overtime Q4 exhausted',
      'Overtime status is REJECTED with rejectionReason recorded'
    );

    // Verify OVERTIME_REJECTED notification was dispatched
    const notifRejected = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'OVERTIME_REJECTED',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      !!notifRejected && notifRejected.title.includes('Lembur Ditolak'),
      'Employee 1 receives OVERTIME_REJECTED notification'
    );

    // -------------------------------------------------------------
    // 8. EMPLOYEE PROFILE INTEGRATION
    // -------------------------------------------------------------
    console.log('\n--- 8. Employee Profile Integration ---');

    const empProfileRes = await fetch(`${BACKEND_URL}/employees/${emp1Id}/detailed`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const empProfileData = (await empProfileRes.json()) as any;
    assert(
      empProfileRes.status === 200 && Array.isArray(empProfileData.recentOvertimes),
      'Employee profile detailed response includes recentOvertimes array'
    );

    // -------------------------------------------------------------
    // 9. AUDIT LOGGING VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 9. Audit Logging Verification ---');

    const auditActions = [
      'OVERTIME_CREATED',
      'OVERTIME_UPDATED',
      'OVERTIME_CANCELLED',
      'OVERTIME_APPROVED',
      'OVERTIME_REJECTED',
    ];

    for (const action of auditActions) {
      const log = await prisma.auditLog.findFirst({
        where: { action },
        orderBy: { createdAt: 'desc' },
      });
      assert(
        !!log,
        `Audit log captures action "${action}"`
      );
    }

    // -------------------------------------------------------------
    // 10. REPORTS INTEGRATION & CSV EXPORT
    // -------------------------------------------------------------
    console.log('\n--- 10. Reports Integration & CSV Export ---');

    // 10.1 Admin retrieves overtime report
    const adminReportRes = await fetch(
      `${BACKEND_URL}/reports/overtime?startDate=2026-11-01&endDate=2026-11-30`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const adminReportData = (await adminReportRes.json()) as any;
    assert(
      adminReportRes.status === 200 &&
        adminReportData.summary &&
        Array.isArray(adminReportData.records),
      'Admin retrieves overtime report with summary totals and records list'
    );

    // 10.2 Admin exports overtime CSV
    const adminCsvRes = await fetch(
      `${BACKEND_URL}/reports/overtime/export?startDate=2026-11-01&endDate=2026-11-30`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const csvContent = await adminCsvRes.text();
    assert(
      adminCsvRes.status === 200 &&
        csvContent.includes('Nama Karyawan') &&
        csvContent.includes('Menit Disetujui'),
      'Admin exports overtime report as valid CSV file'
    );

    // 10.3 Employee overtime report is strictly scoped to self
    const empReportRes = await fetch(
      `${BACKEND_URL}/reports/overtime?startDate=2026-11-01&endDate=2026-11-30`,
      { headers: { Authorization: `Bearer ${emp1Token}` } }
    );
    const empReportData = (await empReportRes.json()) as any;
    const empReportScoped =
      Array.isArray(empReportData.records) &&
      empReportData.records.every((r: any) => r.employeeId === emp1Id);
    assert(
      empReportRes.status === 200 && empReportScoped,
      'Employee overtime report strictly scoped to self records'
    );

    // -------------------------------------------------------------
    // 11. SHIFT SCHEDULE LINKAGE
    // -------------------------------------------------------------
    console.log('\n--- 11. Shift Schedule Linkage ---');

    // Ensure a shift and employee schedule exist for Employee 1 on a future date
    let testShift = await prisma.shift.findFirst({ where: { status: ShiftStatus.ACTIVE } });
    if (!testShift) {
      testShift = await prisma.shift.create({
        data: {
          name: 'Regular Morning V2',
          startTime: '08:00',
          endTime: '17:00',
          status: ShiftStatus.ACTIVE,
        },
      });
    }

    const schedDateStr = '2026-11-20';
    const schedDate = new Date(`${schedDateStr}T00:00:00.000Z`);
    await prisma.overtimeRequest.deleteMany({
      where: { employeeId: emp1Id, date: schedDate },
    });
    await prisma.employeeSchedule.deleteMany({
      where: { employeeId: emp1Id, startDate: { lte: schedDate }, endDate: { gte: schedDate } },
    });
    const testSched = await prisma.employeeSchedule.create({
      data: {
        employeeId: emp1Id,
        shiftId: testShift.id,
        startDate: schedDate,
        endDate: schedDate,
        status: 'ACTIVE',
      },
    });

    const createWithSchedRes = await fetch(`${BACKEND_URL}/overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        date: schedDateStr,
        plannedStartTime: '17:00',
        plannedEndTime: '19:00',
        reason: 'Shift scheduled overtime',
      }),
    });
    const withSchedData = (await createWithSchedRes.json()) as any;
    assert(
      createWithSchedRes.status === 201 && withSchedData.scheduleId === testSched.id,
      'Overtime automatically resolves and links active shift schedule on date',
      { status: createWithSchedRes.status, body: withSchedData, expectedScheduleId: testSched.id }
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`🏁 OVERTIME V2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runOvertimeV2TestSuite();
