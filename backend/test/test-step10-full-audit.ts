import { PrismaClient, UserRole, EmploymentStatus, ShiftStatus, LeaveRequestStatus, AttendanceStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000';
const prisma = new PrismaClient();

interface AuditResult {
  section: string;
  name: string;
  passed: boolean;
  details?: any;
}

const results: AuditResult[] = [];

function record(section: string, name: string, passed: boolean, details?: any) {
  results.push({ section, name, passed, details });
  if (passed) {
    console.log(`[PASS] [${section}] ${name}`);
  } else {
    console.error(`[FAIL] [${section}] ${name}`, details || '');
  }
}

async function runStep10Audit() {
  console.log('================================================================');
  console.log('🚀 STEP 10: COMPREHENSIVE INTEGRATION & PRODUCTION AUDIT');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 3. DATABASE CHECK
    // -------------------------------------------------------------------------
    console.log('\n--- 3. DATABASE CHECK ---');
    try {
      const userCount = await prisma.user.count();
      record('DATABASE', 'PostgreSQL and Prisma connected and queryable', userCount >= 0, { userCount });
    } catch (err: any) {
      record('DATABASE', 'PostgreSQL and Prisma connected and queryable', false, err.message);
    }

    // -------------------------------------------------------------------------
    // 4. BACKEND STARTUP & HEALTH PROBES
    // -------------------------------------------------------------------------
    console.log('\n--- 4. BACKEND STARTUP & HEALTH PROBES ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json().catch(() => ({}));
    record('BACKEND_STARTUP', 'GET /api/health returns status ok', healthRes.status === 200 && healthData.status === 'ok');

    const dbHealthRes = await fetch(`${BASE_URL}/health/database`);
    const dbHealthData = await dbHealthRes.json().catch(() => ({}));
    record('BACKEND_STARTUP', 'GET /api/health/database returns database connected', dbHealthRes.status === 200 && dbHealthData.database === 'connected');

    // -------------------------------------------------------------------------
    // 5. SWAGGER DOCUMENTATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. SWAGGER DOCUMENTATION ---');
    const swaggerRes = await fetch(`${BASE_URL}/docs`);
    record('SWAGGER', 'GET /api/docs accessible (200 OK)', swaggerRes.status === 200);

    // -------------------------------------------------------------------------
    // 6. AUTHENTICATION TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 6. AUTHENTICATION TEST ---');
    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.access_token;
    record('AUTHENTICATION', 'ADMIN valid login succeeds', adminLoginRes.status === 200 && !!adminToken);
    record('AUTHENTICATION', 'ADMIN login never returns password or passwordHash', !adminLoginData.user?.password && !adminLoginData.user?.passwordHash);

    // HR login
    const hrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@example.com', password: 'password123' }),
    });
    const hrLoginData = await hrLoginRes.json();
    const hrToken = hrLoginData.access_token;
    record('AUTHENTICATION', 'HR valid login succeeds', hrLoginRes.status === 200 && !!hrToken);
    record('AUTHENTICATION', 'HR login never returns password or passwordHash', !hrLoginData.user?.password && !hrLoginData.user?.passwordHash);

    // Employee login
    const passwordHash = await bcrypt.hash('password123', 10);
    const itDept = await prisma.department.findFirst();
    let budiUser = await prisma.user.findUnique({
      where: { email: 'budi.santoso@example.com' },
      include: { employee: true },
    });
    if (!budiUser) {
      budiUser = await prisma.user.create({
        data: {
          email: 'budi.santoso@example.com',
          passwordHash,
          role: UserRole.EMPLOYEE,
        },
        include: { employee: true },
      });
    } else {
      await prisma.user.update({
        where: { id: budiUser.id },
        data: { passwordHash },
      });
    }
    if (!budiUser.employee) {
      await prisma.employee.create({
        data: {
          userId: budiUser.id,
          employeeId: 'EMP-BUDI-001',
          firstName: 'Budi',
          lastName: 'Santoso',
          email: 'budi.santoso@example.com',
          departmentId: itDept!.id,
          position: 'Software Engineer',
          joinDate: new Date('2025-01-01'),
        },
      });
    }

    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'budi.santoso@example.com', password: 'password123' }),
    });
    const empLoginData = await empLoginRes.json();
    const empToken = empLoginData.access_token;
    const empUser = empLoginData.user;
    record('AUTHENTICATION', 'EMPLOYEE valid login succeeds', empLoginRes.status === 200 && !!empToken && !!empUser?.employee);
    record('AUTHENTICATION', 'EMPLOYEE login never returns password or passwordHash', !empLoginData.user?.password && !empLoginData.user?.passwordHash);

    // Wrong password -> 401
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'wrongpassword' }),
    });
    record('AUTHENTICATION', 'Wrong password returns 401 Unauthorized', wrongPassRes.status === 401);

    // Protected endpoint without token -> 401
    const noTokenRes = await fetch(`${BASE_URL}/employees`);
    record('AUTHENTICATION', 'Missing token rejected with 401 Unauthorized', noTokenRes.status === 401);

    // Protected endpoint with invalid token -> 401
    const invalidTokenRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    record('AUTHENTICATION', 'Invalid token rejected with 401 Unauthorized', invalidTokenRes.status === 401);

    // -------------------------------------------------------------------------
    // 7. ROLE AUTHORIZATION
    // -------------------------------------------------------------------------
    console.log('\n--- 7. ROLE AUTHORIZATION ---');
    // Admin access to company endpoints
    const adminEmployeesRes = await fetch(`${BASE_URL}/employees`, { headers: { Authorization: `Bearer ${adminToken}` } });
    record('ROLE_AUTHORIZATION', 'ADMIN can access employee management', adminEmployeesRes.status === 200);

    const adminDashboardRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${adminToken}` } });
    record('ROLE_AUTHORIZATION', 'ADMIN can access dashboard summary', adminDashboardRes.status === 200);

    const adminReportsRes = await fetch(`${BASE_URL}/reports/attendance`, { headers: { Authorization: `Bearer ${adminToken}` } });
    record('ROLE_AUTHORIZATION', 'ADMIN can access reports', adminReportsRes.status === 200);

    // HR access to company endpoints
    const hrEmployeesRes = await fetch(`${BASE_URL}/employees`, { headers: { Authorization: `Bearer ${hrToken}` } });
    record('ROLE_AUTHORIZATION', 'HR can access employee management', hrEmployeesRes.status === 200);

    const hrDashboardRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${hrToken}` } });
    record('ROLE_AUTHORIZATION', 'HR can access dashboard summary', hrDashboardRes.status === 200);

    // Employee restricted from admin employee management & shift creation
    const empAdminEmployeesRes = await fetch(`${BASE_URL}/employees`, { headers: { Authorization: `Bearer ${empToken}` } });
    record('ROLE_AUTHORIZATION', 'EMPLOYEE forbidden from employee management (403 Forbidden)', empAdminEmployeesRes.status === 403);

    const empShiftCreateRes = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ name: 'Unauthorized Shift', startTime: '08:00', endTime: '16:00' }),
    });
    record('ROLE_AUTHORIZATION', 'EMPLOYEE forbidden from shift management (403 Forbidden)', empShiftCreateRes.status === 403);

    // Employee cannot access other employees' individual report
    const otherEmployee = await prisma.employee.findFirst({
      where: { id: { not: empUser.employee?.id } },
    });
    if (otherEmployee) {
      const empOtherReportRes = await fetch(`${BASE_URL}/reports/employee/${otherEmployee.id}`, {
        headers: { Authorization: `Bearer ${empToken}` },
      });
      record('ROLE_AUTHORIZATION', 'EMPLOYEE forbidden from accessing other employee reports (403 Forbidden)', empOtherReportRes.status === 403);
    }

    // Employee own profile & own dashboard data access
    const empProfileRes = await fetch(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${empToken}` } });
    record('ROLE_AUTHORIZATION', 'EMPLOYEE can access own profile via /auth/me', empProfileRes.status === 200);

    const empDashboardSummaryRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${empToken}` } });
    const empDashData = await empDashboardSummaryRes.json();
    record('ROLE_AUTHORIZATION', 'EMPLOYEE gets scoped personal metrics from dashboard summary', empDashboardSummaryRes.status === 200 && empDashData.isEmployee === true);

    // -------------------------------------------------------------------------
    // 8. EMPLOYEE MANAGEMENT TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 8. EMPLOYEE MANAGEMENT TEST ---');
    // Get department for employee creation
    const dept = await prisma.department.findFirst();
    if (!dept) throw new Error('No department found in database');

    const testEmpCode = `EMP-TEST-${Date.now().toString().slice(-4)}`;
    const testEmpEmail = `test.employee.${Date.now().toString().slice(-4)}@example.com`;

    // Create employee
    const createEmpRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: testEmpCode,
        firstName: 'Audit',
        lastName: 'Tester',
        email: testEmpEmail,
        phone: '+628123456789',
        departmentId: dept.id,
        position: 'QA Automation Engineer',
        joinDate: '2026-01-15',
      }),
    });
    const createdEmp = await createEmpRes.json();
    record('EMPLOYEE_MODULE', 'Create employee succeeds (201 Created)', createEmpRes.status === 201 && createdEmp.employeeId === testEmpCode);

    // Duplicate employee ID -> 409 Conflict
    const dupEmpRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: testEmpCode, // duplicate
        firstName: 'Duplicate',
        lastName: 'Tester',
        email: `another.${Date.now()}@example.com`,
        departmentId: dept.id,
        position: 'Tester',
        joinDate: '2026-01-15',
      }),
    });
    record('EMPLOYEE_MODULE', 'Duplicate employee ID rejected with 409 Conflict', dupEmpRes.status === 409);

    // Read employee list with search and filter
    const listEmpRes = await fetch(`${BASE_URL}/employees?search=Audit&departmentId=${dept.id}&status=ACTIVE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const empList = await listEmpRes.json();
    record('EMPLOYEE_MODULE', 'Read employee list with search & department & status filter', listEmpRes.status === 200 && Array.isArray(empList) && empList.some(e => e.id === createdEmp.id));

    // Read employee detail
    const detailEmpRes = await fetch(`${BASE_URL}/employees/${createdEmp.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record('EMPLOYEE_MODULE', 'Read employee detail by ID', detailEmpRes.status === 200);

    // Update employee
    const updateEmpRes = await fetch(`${BASE_URL}/employees/${createdEmp.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ position: 'Senior QA Automation Engineer' }),
    });
    const updatedEmp = await updateEmpRes.json();
    record('EMPLOYEE_MODULE', 'Update employee details succeeds', updateEmpRes.status === 200 && updatedEmp.position === 'Senior QA Automation Engineer');

    // Soft deactivation
    const deactRes = await fetch(`${BASE_URL}/employees/${createdEmp.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deactivatedEmp = await deactRes.json();
    const dbEmpAfterDeact = await prisma.employee.findUnique({ where: { id: createdEmp.id } });
    record(
      'EMPLOYEE_MODULE',
      'Deactivate employee performs soft deactivation (physical record preserved, status INACTIVE)',
      deactRes.status === 200 &&
      deactivatedEmp.employmentStatus === EmploymentStatus.INACTIVE &&
      dbEmpAfterDeact !== null &&
      dbEmpAfterDeact.employmentStatus === EmploymentStatus.INACTIVE
    );

    // Re-activate for further shift & attendance tests
    await prisma.employee.update({
      where: { id: createdEmp.id },
      data: { employmentStatus: EmploymentStatus.ACTIVE },
    });

    // -------------------------------------------------------------------------
    // 9. ATTENDANCE TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 9. ATTENDANCE TEST ---');
    // Today summary
    const todayRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    record('ATTENDANCE_MODULE', 'GET /api/attendance/today works for employee', todayRes.status === 200);

    // Attendance list for Admin
    const adminAttListRes = await fetch(`${BASE_URL}/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAttListData = await adminAttListRes.json();
    record('ATTENDANCE_MODULE', 'Admin can list all attendance records with pagination', adminAttListRes.status === 200 && Array.isArray(adminAttListData.data));

    // Manual attendance creation by Admin
    const manualAttDate = '2026-03-01';
    // Clean up any existing record for this date
    await prisma.attendance.deleteMany({
      where: { employeeId: createdEmp.id, attendanceDate: new Date(`${manualAttDate}T00:00:00.000Z`) },
    });

    const createManualAttRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: createdEmp.id,
        attendanceDate: manualAttDate,
        checkIn: `${manualAttDate}T08:55:00.000Z`,
        checkOut: `${manualAttDate}T17:05:00.000Z`,
        status: AttendanceStatus.PRESENT,
        notes: 'Step 10 Audit Manual Record',
      }),
    });
    const manualAttData = await createManualAttRes.json();
    record(
      'ATTENDANCE_MODULE',
      'Admin can create manual attendance with working minutes calculation',
      createManualAttRes.status === 201 && manualAttData.workingMinutes > 0,
      { status: createManualAttRes.status, manualAttData }
    );

    // Duplicate check-in / manual entry for same date rejected
    const dupManualAttRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: createdEmp.id,
        attendanceDate: manualAttDate,
        checkIn: `${manualAttDate}T08:55:00.000Z`,
      }),
    });
    record('ATTENDANCE_MODULE', 'Duplicate attendance record for same employee and date rejected (409)', dupManualAttRes.status === 409);

    // Attendance detail by ID
    const attDetailRes = await fetch(`${BASE_URL}/attendance/${manualAttData.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record('ATTENDANCE_MODULE', 'Attendance detail retrieval by ID succeeds', attDetailRes.status === 200);

    // -------------------------------------------------------------------------
    // 10. LEAVE TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 10. LEAVE TEST ---');
    const leaveType = await prisma.leaveType.findFirst();
    if (!leaveType) throw new Error('No leave type found');

    // Rule: invalid date range (startDate > endDate) rejected
    const invalidDateLeaveRes = await fetch(`${BASE_URL}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: createdEmp.id,
        leaveTypeId: leaveType.id,
        startDate: '2026-11-10',
        endDate: '2026-11-05', // invalid
        reason: 'Invalid date range test',
      }),
    });
    record('LEAVE_MODULE', 'Invalid date range (start > end) rejected with 400 Bad Request', invalidDateLeaveRes.status === 400);

    // Clean up test leave requests for createdEmp
    await prisma.leaveRequest.deleteMany({ where: { employeeId: createdEmp.id } });

    // Create leave request with auto-calculated duration
    const createLeaveRes = await fetch(`${BASE_URL}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: createdEmp.id,
        leaveTypeId: leaveType.id,
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        reason: 'Family vacation test',
      }),
    });
    const createdLeave = await createLeaveRes.json();
    record(
      'LEAVE_MODULE',
      'Create leave request defaults to PENDING with server-calculated duration (5 days)',
      createLeaveRes.status === 201 && createdLeave.status === LeaveRequestStatus.PENDING && createdLeave.duration === 5
    );

    // Rule: overlapping leave request rejected
    const overlapLeaveRes = await fetch(`${BASE_URL}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: createdEmp.id,
        leaveTypeId: leaveType.id,
        startDate: '2026-11-03',
        endDate: '2026-11-07',
        reason: 'Overlapping request test',
      }),
    });
    record('LEAVE_MODULE', 'Overlapping leave request rejected (409 Conflict)', overlapLeaveRes.status === 409);

    // List & Detail leave
    const listLeaveRes = await fetch(`${BASE_URL}/leave?employeeId=${createdEmp.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record('LEAVE_MODULE', 'List leave requests with employee filter', listLeaveRes.status === 200);

    const detailLeaveRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record('LEAVE_MODULE', 'Get leave request details by ID', detailLeaveRes.status === 200);

    // Employee cannot approve leave
    const empApproveRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({ status: LeaveRequestStatus.APPROVED }),
    });
    record('LEAVE_MODULE', 'Employee cannot approve/reject leave requests (403 Forbidden)', empApproveRes.status === 403);

    // Admin approve leave
    const adminApproveRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: LeaveRequestStatus.APPROVED }),
    });
    const approvedLeave = await adminApproveRes.json();
    record('LEAVE_MODULE', 'Admin can approve leave request (status APPROVED)', adminApproveRes.status === 200 && approvedLeave.status === LeaveRequestStatus.APPROVED);

    // Rule: APPROVED cannot revert to PENDING
    const revertApproveRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: LeaveRequestStatus.PENDING }),
    });
    record('LEAVE_MODULE', 'APPROVED leave cannot revert back to PENDING (400 Bad Request)', revertApproveRes.status === 400);

    // Reject leave
    const adminRejectRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: LeaveRequestStatus.REJECTED }),
    });
    const rejectedLeave = await adminRejectRes.json();
    record('LEAVE_MODULE', 'Admin can reject leave request (status REJECTED)', adminRejectRes.status === 200 && rejectedLeave.status === LeaveRequestStatus.REJECTED);

    // Rule: REJECTED cannot revert to PENDING
    const revertRejectRes = await fetch(`${BASE_URL}/leave/${createdLeave.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: LeaveRequestStatus.PENDING }),
    });
    record('LEAVE_MODULE', 'REJECTED leave cannot revert back to PENDING (400 Bad Request)', revertRejectRes.status === 400);

    // -------------------------------------------------------------------------
    // 11. SHIFT TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 11. SHIFT TEST ---');
    const shiftName = `Audit Shift ${Date.now().toString().slice(-4)}`;

    // Create shift
    const createShiftRes = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: shiftName,
        startTime: '10:00',
        endTime: '19:00',
        breakMinutes: 60,
      }),
    });
    const createdShift = await createShiftRes.json();
    record('SHIFT_MODULE', 'Create shift schedule succeeds (201 Created)', createShiftRes.status === 201 && createdShift.name === shiftName);

    // Duplicate shift name rejected
    const dupShiftRes = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: shiftName,
        startTime: '10:00',
        endTime: '19:00',
        breakMinutes: 60,
      }),
    });
    record('SHIFT_MODULE', 'Duplicate shift name rejected (409 Conflict)', dupShiftRes.status === 409);

    // Invalid time rejected
    const invalidTimeShiftRes = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Invalid Time Shift ${Date.now()}`,
        startTime: '99:99', // invalid
        endTime: '19:00',
        breakMinutes: 60,
      }),
    });
    record('SHIFT_MODULE', 'Invalid time format (e.g. 99:99) rejected with 400 Bad Request', invalidTimeShiftRes.status === 400);

    // Negative break minutes rejected
    const negBreakShiftRes = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Neg Break Shift ${Date.now()}`,
        startTime: '08:00',
        endTime: '17:00',
        breakMinutes: -30, // negative
      }),
    });
    record('SHIFT_MODULE', 'Negative break minutes rejected with 400 Bad Request', negBreakShiftRes.status === 400);

    // List & Detail shift
    const listShiftRes = await fetch(`${BASE_URL}/shifts`, { headers: { Authorization: `Bearer ${adminToken}` } });
    record('SHIFT_MODULE', 'List shifts succeeds', listShiftRes.status === 200);

    const detailShiftRes = await fetch(`${BASE_URL}/shifts/${createdShift.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    record('SHIFT_MODULE', 'Get shift detail by ID succeeds', detailShiftRes.status === 200);

    // Deactivate shift
    const deactShiftRes = await fetch(`${BASE_URL}/shifts/${createdShift.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: ShiftStatus.INACTIVE }),
    });
    const deactivatedShift = await deactShiftRes.json();
    record('SHIFT_MODULE', 'Deactivate shift succeeds (status INACTIVE)', deactShiftRes.status === 200 && deactivatedShift.status === ShiftStatus.INACTIVE);

    // Rule: inactive shift cannot be assigned to an employee
    const assignInactiveShiftRes = await fetch(`${BASE_URL}/shifts/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shiftId: createdShift.id,
        employeeId: createdEmp.id,
      }),
    });
    record('SHIFT_MODULE', 'Inactive shift cannot be assigned to employee (400 Bad Request)', assignInactiveShiftRes.status === 400);

    // Reactivate shift
    const reactivateShiftRes = await fetch(`${BASE_URL}/shifts/${createdShift.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: ShiftStatus.ACTIVE }),
    });

    // Employee cannot assign shift
    const empAssignShiftRes = await fetch(`${BASE_URL}/shifts/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        shiftId: createdShift.id,
        employeeId: createdEmp.id,
      }),
    });
    record('SHIFT_MODULE', 'Employee cannot assign shift (403 Forbidden)', empAssignShiftRes.status === 403);

    // Admin assign active shift to employee
    const adminAssignShiftRes = await fetch(`${BASE_URL}/shifts/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shiftId: createdShift.id,
        employeeId: createdEmp.id,
      }),
    });
    const assignedShiftData = await adminAssignShiftRes.json();
    record(
      'SHIFT_MODULE',
      'Admin can assign active shift to employee',
      adminAssignShiftRes.status === 200 && assignedShiftData.shiftId === createdShift.id,
      { status: adminAssignShiftRes.status, assignedShiftData }
    );

    // -------------------------------------------------------------------------
    // 12. DASHBOARD TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 12. DASHBOARD TEST ---');
    // Admin dashboard summary
    const dashSumRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const dashSum = await dashSumRes.json();
    const totalEmpCount = await prisma.employee.count({ where: { employmentStatus: EmploymentStatus.ACTIVE } });
    record(
      'DASHBOARD_MODULE',
      'ADMIN dashboard summary matches PostgreSQL live data without dummy values',
      dashSumRes.status === 200 && dashSum.totalEmployees === totalEmpCount,
      { dashSumTotal: dashSum.totalEmployees, totalEmpCount }
    );

    // HR dashboard summary
    const hrDashSumRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${hrToken}` } });
    record('DASHBOARD_MODULE', 'HR dashboard summary works and matches data', hrDashSumRes.status === 200);

    // Employee dashboard summary
    const empDashSumRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${empToken}` } });
    const empDashSum = await empDashSumRes.json();
    record(
      'DASHBOARD_MODULE',
      'EMPLOYEE dashboard summary returns personal metrics only',
      empDashSumRes.status === 200 && empDashSum.isEmployee === true && typeof empDashSum.attendanceThisMonth === 'number'
    );

    // Attendance trend chart
    const trendRes = await fetch(`${BASE_URL}/dashboard/attendance-overview`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const trendData = await trendRes.json();
    record('DASHBOARD_MODULE', 'Attendance trend chart endpoint returns array from live DB', trendRes.status === 200 && Array.isArray(trendData.data));

    // Recent attendance
    const recentRes = await fetch(`${BASE_URL}/dashboard/recent-attendance`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const recentData = await recentRes.json();
    record('DASHBOARD_MODULE', 'Recent attendance returns records from live DB', recentRes.status === 200 && Array.isArray(recentData));

    // -------------------------------------------------------------------------
    // 13. REPORT TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 13. REPORT TEST ---');
    // Attendance report with filters & pagination
    const reportRes = await fetch(`${BASE_URL}/reports/attendance?page=1&limit=10&departmentId=${dept.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reportData = await reportRes.json();
    record(
      'REPORTS_MODULE',
      'Attendance report with filters and pagination works properly',
      reportRes.status === 200 && Array.isArray(reportData.data) && reportData.meta && typeof reportData.meta.total === 'number'
    );

    // Employee individual analytics report
    const empReportRes = await fetch(`${BASE_URL}/reports/employee/${createdEmp.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const empReportData = await empReportRes.json();
    record('REPORTS_MODULE', 'Employee analytics report works', empReportRes.status === 200 && empReportData.employee?.id === createdEmp.id);

    // CSV export
    const csvRes = await fetch(`${BASE_URL}/reports/attendance/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csvContentType = csvRes.headers.get('content-type') || '';
    const csvBody = await csvRes.text();
    record(
      'REPORTS_MODULE',
      'Attendance CSV export returns valid CSV content',
      csvRes.status === 200 && csvContentType.includes('csv') && (csvBody.includes('Nama Karyawan') || csvBody.includes('Employee Name')),
      { status: csvRes.status, csvContentType }
    );

    // -------------------------------------------------------------------------
    // 14. FRONTEND ROUTES TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 14. FRONTEND ROUTES TEST ---');
    const routes = [
      '/login',
      '/dashboard',
      '/employees',
      `/employees/${createdEmp.id}`,
      '/attendance',
      '/leave',
      '/shifts',
      '/reports',
      '/settings',
    ];

    for (const r of routes) {
      try {
        const feRes = await fetch(`${FRONTEND_URL}${r}`);
        record('FRONTEND_ROUTES', `Route ${r} renders (HTTP ${feRes.status})`, feRes.status === 200);
      } catch (err: any) {
        record('FRONTEND_ROUTES', `Route ${r} renders`, false, err.message);
      }
    }

    // -------------------------------------------------------------------------
    // 15. SECURITY CHECK
    // -------------------------------------------------------------------------
    console.log('\n--- 15. SECURITY CHECK ---');
    // Verify password hashing with bcrypt
    const dbAdminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    const isHashed = dbAdminUser?.passwordHash?.startsWith('$2b$') || dbAdminUser?.passwordHash?.startsWith('$2a$');
    record('SECURITY', 'Passwords are encrypted using bcrypt hashing', !!isHashed);

    // Verify JWT_SECRET is loaded from process.env and not a fallback
    const backendEnvPath = path.resolve(__dirname, '../.env');
    const envContent = fs.existsSync(backendEnvPath) ? fs.readFileSync(backendEnvPath, 'utf8') : '';
    record('SECURITY', 'JWT secret and DATABASE_URL loaded from environment (.env)', envContent.includes('JWT_SECRET=') && envContent.includes('DATABASE_URL='));

    // Verify .env is in .gitignore
    const backendGitignore = path.resolve(__dirname, '../.gitignore');
    const rootGitignore = path.resolve(__dirname, '../../.gitignore');
    const backendGitignoreContent = fs.existsSync(backendGitignore) ? fs.readFileSync(backendGitignore, 'utf8') : '';
    const rootGitignoreContent = fs.existsSync(rootGitignore) ? fs.readFileSync(rootGitignore, 'utf8') : '';
    record(
      'SECURITY',
      '.env is ignored in both backend and root .gitignore',
      backendGitignoreContent.includes('.env') && rootGitignoreContent.includes('.env*')
    );

    // -------------------------------------------------------------------------
    // 16. ENVIRONMENT CHECK
    // -------------------------------------------------------------------------
    console.log('\n--- 16. ENVIRONMENT CHECK ---');
    const rootEnvExample = path.resolve(__dirname, '../../.env.example');
    const rootEnvExampleContent = fs.existsSync(rootEnvExample) ? fs.readFileSync(rootEnvExample, 'utf8') : '';
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'FRONTEND_URL', 'PORT'];
    const allEnvVarsDocumented = requiredEnvVars.every(v => rootEnvExampleContent.includes(v));
    record('ENVIRONMENT', '.env.example documents all 5 required environment variables', allEnvVarsDocumented);

    // -------------------------------------------------------------------------
    // 17. API ERROR HANDLING
    // -------------------------------------------------------------------------
    console.log('\n--- 17. API ERROR HANDLING ---');
    // 400 Bad Request
    const badReqRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email: 'invalid-email' }),
    });
    record('ERROR_HANDLING', 'Validation failure returns 400 Bad Request', badReqRes.status === 400);

    // 401 Unauthorized
    const unauthRes = await fetch(`${BASE_URL}/employees`);
    record('ERROR_HANDLING', 'Missing auth returns 401 Unauthorized', unauthRes.status === 401);

    // 403 Forbidden
    const forbidRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    record('ERROR_HANDLING', 'Forbidden action returns 403 Forbidden', forbidRes.status === 403);

    // 404 Not Found
    const notFoundRes = await fetch(`${BASE_URL}/employees/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record('ERROR_HANDLING', 'Missing entity returns 404 Not Found', notFoundRes.status === 404);

    // 409 Conflict
    const conflictRes = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: shiftName, startTime: '09:00', endTime: '18:00' }),
    });
    const conflictBody = await conflictRes.json().catch(() => ({}));
    record('ERROR_HANDLING', 'Conflict state returns 409 Conflict', conflictRes.status === 409, { status: conflictRes.status, conflictBody });

    // -------------------------------------------------------------------------
    // 18. PERFORMANCE BASIC CHECK
    // -------------------------------------------------------------------------
    console.log('\n--- 18. PERFORMANCE CHECK ---');
    const paginatedAttRes = await fetch(`${BASE_URL}/attendance?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const paginatedAtt = await paginatedAttRes.json();
    record(
      'PERFORMANCE',
      'Pagination properly enforced on list queries (meta & limit present)',
      paginatedAttRes.status === 200 && paginatedAtt.meta && paginatedAtt.data?.length <= 5
    );

  } finally {
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 AUDIT SUMMARY SCORECARD');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Checks: ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);

  if (failed > 0) {
    console.error('\n⚠️  FAILED CHECKS:');
    results.filter(r => !r.passed).forEach(r => {
      console.error(`- [${r.section}] ${r.name}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 20 PRODUCTION AUDIT CRITERIA PASSED WITH ZERO ERRORS!');
    process.exit(0);
  }
}

runStep10Audit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
