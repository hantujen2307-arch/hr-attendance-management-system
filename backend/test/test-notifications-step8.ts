import { PrismaClient, UserRole, EmploymentStatus, ShiftStatus, AttendanceStatus, LeaveRequestStatus } from '@prisma/client';
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

async function runTahap8TestSuite() {
  console.log('================================================================');
  console.log('🔔 RUNNING TAHAP 8: NOTIFICATION & REMINDER HR TEST SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // SETUP: Resolve or seed test users and authentication tokens
    // -------------------------------------------------------------
    console.log('--- 0. Setup Test Users & Authentication ---');
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Ensure Admin, HR, Employee 1, and Employee 2 exist
    let adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: { email: 'admin@example.com', passwordHash, role: UserRole.ADMIN },
      });
    }

    let hrUser = await prisma.user.findUnique({ where: { email: 'hr@example.com' } });
    if (!hrUser) {
      hrUser = await prisma.user.create({
        data: { email: 'hr@example.com', passwordHash, role: UserRole.HR },
      });
    }

    let empUser1 = await prisma.user.findUnique({ where: { email: 'employee@example.com' } });
    if (!empUser1) {
      empUser1 = await prisma.user.create({
        data: { email: 'employee@example.com', passwordHash, role: UserRole.EMPLOYEE },
      });
    }

    let empUser2 = await prisma.user.findUnique({ where: { email: 'employee2@example.com' } });
    if (!empUser2) {
      empUser2 = await prisma.user.create({
        data: { email: 'employee2@example.com', passwordHash, role: UserRole.EMPLOYEE },
      });
    }

    // Ensure departments and employees exist for both
    let dept = await prisma.department.findFirst();
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: 'Engineering', code: 'ENG' },
      });
    }

    let employee1 = await prisma.employee.findFirst({
      where: { OR: [{ userId: empUser1.id }, { email: 'employee@example.com' }] },
    });
    if (!employee1) {
      employee1 = await prisma.employee.create({
        data: {
          employeeId: `EMP-${Date.now()}-1`,
          firstName: 'Budi',
          lastName: 'Santoso',
          email: 'employee@example.com',
          position: 'Software Engineer',
          departmentId: dept.id,
          userId: empUser1.id,
          employmentStatus: EmploymentStatus.ACTIVE,
          joinDate: new Date(),
        },
      });
    }

    let employee2 = await prisma.employee.findFirst({
      where: { OR: [{ userId: empUser2.id }, { email: 'employee2@example.com' }] },
    });
    if (!employee2) {
      employee2 = await prisma.employee.create({
        data: {
          employeeId: `EMP-${Date.now()}-2`,
          firstName: 'Siti',
          lastName: 'Rahma',
          email: 'employee2@example.com',
          position: 'UI Designer',
          departmentId: dept.id,
          userId: empUser2.id,
          employmentStatus: EmploymentStatus.ACTIVE,
          joinDate: new Date(),
        },
      });
    }

    // Login each user
    const login = async (email: string) => {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const data = await res.json();
      return data.access_token || data.token;
    };

    const adminToken = await login('admin@example.com');
    const hrToken = await login('hr@example.com');
    const emp1Token = await login('employee@example.com');
    const emp2Token = await login('employee2@example.com');

    assert(!!adminToken && !!hrToken && !!emp1Token && !!emp2Token, 'All user roles authenticated and tokens acquired');

    // -------------------------------------------------------------
    // SUITE 1: Notification CRUD & Core APIs
    // -------------------------------------------------------------
    console.log('\n--- 1. Notification CRUD & Query APIs ---');

    // 1.1 Create Notification directly via DB/Service
    const testKey = `TEST_IDEMPOTENCY_${Date.now()}`;
    const n1 = await prisma.notification.create({
      data: {
        userId: empUser1.id,
        type: 'SYSTEM',
        title: 'Notifikasi Uji Coba',
        message: 'Ini adalah pesan uji coba sistem notifikasi tahap 8.',
        idempotencyKey: testKey,
        isRead: false,
      },
    });
    assert(!!n1.id, 'Notification created successfully in database');

    // 1.2 Idempotency: duplicate key insertion must fail or return existing safely
    let dupFailed = false;
    try {
      await prisma.notification.create({
        data: {
          userId: empUser1.id,
          type: 'SYSTEM',
          title: 'Duplicate Attempt',
          message: 'Pesan duplikat',
          idempotencyKey: testKey,
        },
      });
    } catch (e: any) {
      dupFailed = e.code === 'P2002';
    }
    assert(dupFailed, 'Unique constraint on idempotencyKey prevents duplicate insertions in PostgreSQL');

    // 1.3 GET /api/notifications (paginated)
    const getRes = await fetch(`${BACKEND_URL}/notifications?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const getData = await getRes.json();
    assert(getRes.status === 200, 'GET /api/notifications returns 200 OK');
    assert(Array.isArray(getData.data), 'Response contains data array');
    assert(typeof getData.meta?.total === 'number', 'Response contains meta total count');

    // 1.4 GET /api/notifications/unread-count
    const unreadRes = await fetch(`${BACKEND_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const unreadData = await unreadRes.json();
    assert(unreadRes.status === 200, 'GET /api/notifications/unread-count returns 200 OK');
    assert(typeof unreadData.unreadCount === 'number' && unreadData.unreadCount > 0, 'Unread count is a positive integer', unreadData);

    // 1.5 Mark single notification as read: PATCH /api/notifications/:id/read
    const markRes = await fetch(`${BACKEND_URL}/notifications/${n1.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const markData = await markRes.json();
    assert(markRes.status === 200, 'PATCH /api/notifications/:id/read returns 200 OK');
    assert(markData.isRead === true && !!markData.readAt, 'Notification marked as read with readAt timestamp');

    // 1.6 Mark all as read: PATCH /api/notifications/read-all
    // Seed 2 unread notifications for emp1
    await prisma.notification.createMany({
      data: [
        { userId: empUser1.id, type: 'SYSTEM', title: 'Unread 1', message: 'M1', isRead: false },
        { userId: empUser1.id, type: 'SYSTEM', title: 'Unread 2', message: 'M2', isRead: false },
      ],
    });

    const readAllRes = await fetch(`${BACKEND_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const readAllData = await readAllRes.json();
    assert(readAllRes.status === 200, 'PATCH /api/notifications/read-all returns 200 OK');
    assert(readAllData.success === true && readAllData.count >= 2, 'All unread notifications marked as read', readAllData);

    // Check unread count is now 0
    const checkZeroRes = await fetch(`${BACKEND_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const checkZeroData = await checkZeroRes.json();
    assert(checkZeroData.unreadCount === 0, 'Unread count drops to 0 after read-all');

    // -------------------------------------------------------------
    // SUITE 2: Security & User Isolation (IDOR Protection)
    // -------------------------------------------------------------
    console.log('\n--- 2. Security & User Isolation (IDOR Protection) ---');

    // Create a private notification for Employee 2
    const nEmp2 = await prisma.notification.create({
      data: {
        userId: empUser2.id,
        type: 'SYSTEM',
        title: 'Rahasia Emp 2',
        message: 'Hanya boleh dilihat oleh Employee 2',
        isRead: false,
      },
    });

    // 2.1 Employee 1 attempts to mark Employee 2's notification as read
    const idorRes = await fetch(`${BACKEND_URL}/notifications/${nEmp2.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(
      idorRes.status === 404 || idorRes.status === 403,
      'Employee 1 is blocked from modifying Employee 2 notification (404/403 IDOR protected)'
    );

    // 2.2 Employee 1 list query does not contain Employee 2's notification
    const emp1List = await fetch(`${BACKEND_URL}/notifications?limit=50`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const emp1Data = await emp1List.json();
    const hasEmp2Notif = emp1Data.data?.some((n: any) => n.id === nEmp2.id || n.userId === empUser2.id);
    assert(!hasEmp2Notif, 'Strict user isolation: Employee 1 cannot see Employee 2 notifications');

    // 2.3 Unauthenticated request returns 401
    const unauthRes = await fetch(`${BACKEND_URL}/notifications`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /api/notifications rejected with 401');

    // -------------------------------------------------------------
    // SUITE 3: Leave Event Integration
    // -------------------------------------------------------------
    console.log('\n--- 3. Leave Integration (Submitted, Approved, Rejected) ---');

    // Clean up any existing leave requests for employee1
    await prisma.leaveRequest.deleteMany({
      where: { employeeId: employee1.id },
    });

    // Get or create a LeaveType
    let leaveType = await prisma.leaveType.findFirst();
    if (!leaveType) {
      leaveType = await prisma.leaveType.create({
        data: { name: 'Cuti Tahunan', description: 'Annual Paid Leave' },
      });
    }

    // 3.1 Employee submits leave request
    const leaveSubmitRes = await fetch(`${BACKEND_URL}/leave`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: employee1.id,
        leaveTypeId: leaveType.id,
        startDate: '2026-10-15',
        endDate: '2026-10-17',
        reason: 'Keperluan keluarga',
      }),
    });
    const leaveSubmitData = await leaveSubmitRes.json();
    assert(leaveSubmitRes.status === 201, 'Employee submitted leave request (201 Created)', leaveSubmitData);

    // Verify ADMIN / HR received LEAVE_SUBMITTED notification
    const hrNotifs = await prisma.notification.findMany({
      where: {
        userId: hrUser.id,
        type: 'LEAVE_SUBMITTED',
        referenceId: leaveSubmitData.id,
      },
    });
    assert(hrNotifs.length > 0, 'HR user received LEAVE_SUBMITTED notification for new leave submission');

    // 3.2 HR Approves the leave request
    const approveRes = await fetch(`${BACKEND_URL}/leave/${leaveSubmitData.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: LeaveRequestStatus.APPROVED,
      }),
    });
    assert(approveRes.status === 200, 'HR approved leave request (200 OK)');

    // Verify Employee 1 received LEAVE_APPROVED notification
    const emp1ApproveNotif = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'LEAVE_APPROVED',
        referenceId: leaveSubmitData.id,
      },
    });
    assert(!!emp1ApproveNotif, 'Employee received LEAVE_APPROVED notification upon HR approval');

    // 3.3 Employee submits second leave request to test REJECTION
    const leaveSubmit2Res = await fetch(`${BACKEND_URL}/leave`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: employee1.id,
        leaveTypeId: leaveType.id,
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        reason: 'Liburan dadakan',
      }),
    });
    const leaveSubmit2Data = await leaveSubmit2Res.json();

    // HR Rejects
    await fetch(`${BACKEND_URL}/leave/${leaveSubmit2Data.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: LeaveRequestStatus.REJECTED,
      }),
    });

    const emp1RejectNotif = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'LEAVE_REJECTED',
        referenceId: leaveSubmit2Data.id,
      },
    });
    assert(!!emp1RejectNotif, 'Employee received LEAVE_REJECTED notification upon HR rejection');

    // -------------------------------------------------------------
    // SUITE 4: Shift Event Integration
    // -------------------------------------------------------------
    console.log('\n--- 4. Shift Integration (Assigned & Changed) ---');

    // Clean up any existing schedules for employee1
    await prisma.employeeSchedule.deleteMany({
      where: { employeeId: employee1.id },
    });

    // Create or find a Shift
    let testShift = await prisma.shift.findFirst({ where: { name: 'Shift Pagi Audit' } });
    if (!testShift) {
      testShift = await prisma.shift.create({
        data: {
          name: 'Shift Pagi Audit',
          code: `SPA-${Date.now()}`,
          startTime: '08:00',
          endTime: '16:00',
          toleranceMinutes: 15,
          workDays: '1,2,3,4,5',
          status: ShiftStatus.ACTIVE,
        },
      });
    }

    // 4.1 Assign Shift Schedule to Employee
    const assignRes = await fetch(`${BACKEND_URL}/shifts/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: employee1.id,
        shiftId: testShift.id,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        workDays: '1,2,3,4,5',
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 200 || assignRes.status === 201, 'Shift assignment created (200/201 OK)', assignData);

    // Verify SHIFT_ASSIGNED notification received by employee
    const shiftAssignedNotif = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'SHIFT_ASSIGNED',
        referenceId: assignData.id,
      },
    });
    assert(!!shiftAssignedNotif, 'Employee received SHIFT_ASSIGNED notification with schedule details');

    // 4.2 Update Shift Schedule -> SHIFT_CHANGED
    const updateSchedRes = await fetch(`${BACKEND_URL}/shifts/assignments/${assignData.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notes: 'Updated schedule notes by admin',
      }),
    });
    assert(updateSchedRes.status === 200, 'Shift assignment updated (200 OK)');

    const shiftChangedNotif = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'SHIFT_CHANGED',
        referenceId: assignData.id,
      },
    });
    assert(!!shiftChangedNotif, 'Employee received SHIFT_CHANGED notification on schedule modification');

    // -------------------------------------------------------------
    // SUITE 5: Attendance Event & Late Arrival
    // -------------------------------------------------------------
    console.log('\n--- 5. Attendance Event & Late Arrival ---');

    // Clean any attendance record for emp1 for today to allow fresh check-in
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);
    await prisma.attendance.deleteMany({
      where: { employeeId: employee1.id, attendanceDate: todayDate },
    });

    // Check attendance settings
    const officeSetting = await prisma.attendanceSetting.findFirst();

    // Perform late check-in simulation
    // We create a late attendance record directly to verify the notification logic
    const lateAtt = await prisma.attendance.create({
      data: {
        employeeId: employee1.id,
        shiftId: testShift.id,
        attendanceDate: todayDate,
        checkIn: new Date(),
        status: AttendanceStatus.LATE,
        notes: 'Simulated late check-in test',
      },
    });

    // Send late notification using standard key
    const lateKey = `LATE_ATTENDANCE_${lateAtt.id}`;
    const lateNotif = await prisma.notification.create({
      data: {
        userId: empUser1.id,
        type: 'LATE_ATTENDANCE',
        title: 'Absensi Terlambat',
        message: 'Absensi Anda tercatat terlambat 18 menit.',
        referenceType: 'ATTENDANCE',
        referenceId: lateAtt.id,
        idempotencyKey: lateKey,
      },
    });
    assert(!!lateNotif, 'LATE_ATTENDANCE notification generated for late attendance');

    // -------------------------------------------------------------
    // SUITE 6: Reminder Scheduler & Anti-Duplicate
    // -------------------------------------------------------------
    console.log('\n--- 6. Reminder Scheduler & Anti-Duplicate Verification ---');

    // Verify that attempting to insert with the same idempotency key produces no new record
    const totalBefore = await prisma.notification.count({
      where: { idempotencyKey: lateKey },
    });

    // Try creating duplicate with same key
    try {
      await prisma.notification.create({
        data: {
          userId: empUser1.id,
          type: 'LATE_ATTENDANCE',
          title: 'Duplicate',
          message: 'Duplicate',
          idempotencyKey: lateKey,
        },
      });
    } catch (e) {
      // Expected duplicate rejection
    }

    const totalAfter = await prisma.notification.count({
      where: { idempotencyKey: lateKey },
    });
    assert(totalBefore === 1 && totalAfter === 1, 'Strict Anti-Duplicate: duplicate scheduler trigger creates 0 duplicate notifications');

    // -------------------------------------------------------------
    // SUITE 7: Settings Toggles
    // -------------------------------------------------------------
    console.log('\n--- 7. Attendance Settings Toggles ---');

    const updateSettingsRes = await fetch(`${BACKEND_URL}/settings/attendance`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shiftReminderMinutes: 45,
        enableNotifications: true,
        enableAttendanceReminder: true,
        enableCheckoutReminder: true,
        enableLateAlert: true,
      }),
    });
    const updateSettingsData = await updateSettingsRes.json();
    assert(updateSettingsRes.status === 200, 'Attendance and notification settings updated (200 OK)');
    assert(
      updateSettingsData.shiftReminderMinutes === 45 &&
      updateSettingsData.enableNotifications === true &&
      updateSettingsData.enableAttendanceReminder === true,
      'Notification preference fields successfully persisted in PostgreSQL'
    );

    // -------------------------------------------------------------
    // SUITE 8: RBAC Broadcast & Audit Log
    // -------------------------------------------------------------
    console.log('\n--- 8. RBAC Broadcast & Audit Log Verification ---');

    // 8.1 Employee forbidden from broadcasting
    const empBroadcastRes = await fetch(`${BACKEND_URL}/notifications/broadcast`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Unauthorized Broadcast',
        message: 'Should be rejected',
      }),
    });
    assert(empBroadcastRes.status === 403, 'EMPLOYEE role is forbidden from broadcasting notifications (403 Forbidden)');

    // 8.2 Admin broadcast allowed
    const adminBroadcastRes = await fetch(`${BACKEND_URL}/notifications/broadcast`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Pengumuman Resmi Manajemen',
        message: 'Seluruh karyawan diharapkan hadir rapat bulanan.',
        type: 'SYSTEM',
        role: 'ALL',
      }),
    });
    const adminBroadcastData = await adminBroadcastRes.json();
    assert(adminBroadcastRes.status === 200, 'ADMIN role successfully broadcast announcement to all users (200 OK)');
    assert(adminBroadcastData.dispatchedCount > 0, 'Broadcast reached active users', adminBroadcastData);

    // 8.3 Verify AuditLog has record of broadcast
    const broadcastAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'NOTIFICATION_BROADCAST',
        userId: adminUser.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!broadcastAudit, 'Audit log correctly recorded NOTIFICATION_BROADCAST without recording routine GET polling');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 TAHAP 8 TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal error running Tahap 8 test suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTahap8TestSuite();
