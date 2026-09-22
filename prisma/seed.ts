import { PrismaClient, UserRole, EmploymentStatus, ShiftStatus, AttendanceStatus, LeaveRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ SAFETY ABORT: Database seeding with demo data is disabled in production to prevent data loss.');
    console.error('👉 To create the initial superadmin in production, use: npm run admin:create');
    process.exit(1);
  }

  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.department.deleteMany();
  await prisma.attendanceSetting.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // Seed default AttendanceSetting
  await prisma.attendanceSetting.create({
    data: {
      locationName: 'Kantor Utama',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 100,
      workStartTime: '08:00',
      toleranceMinutes: 15,
      workEndTime: '17:00',
    },
  });
  console.log('📍 Seeded default Attendance Settings (Kantor Utama)');

  // 2. Hash default password for demo accounts
  const passwordHash = await bcrypt.hash('password123', 10);

  // 3. Seed Users (ADMIN, HR, EMPLOYEE)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@example.com',
      passwordHash,
      role: UserRole.HR,
    },
  });

  const employeeUser1 = await prisma.user.create({
    data: {
      email: 'employee@example.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  const employeeUser2 = await prisma.user.create({
    data: {
      email: 'marcus.vance@company.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  // Additional aliases for company email format
  await prisma.user.create({
    data: {
      email: 'admin@company.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      email: 'hr@company.com',
      passwordHash,
      role: UserRole.HR,
    },
  });

  await prisma.user.create({
    data: {
      email: 'alex.rivera@company.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  const budiUser = await prisma.user.create({
    data: {
      email: 'budi.santoso@example.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  const sitiUser = await prisma.user.create({
    data: {
      email: 'siti.rahma@example.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
    },
  });

  console.log('👤 Seeded users with roles: ADMIN, HR, EMPLOYEE');

  // 4. Seed Departments (IT, HR, Finance, Operations)
  const itDept = await prisma.department.create({
    data: {
      name: 'IT',
      description: 'Information Technology, Software Engineering & Cloud Infrastructure',
    },
  });

  const hrDept = await prisma.department.create({
    data: {
      name: 'HR',
      description: 'Human Resources, People Operations & Talent Acquisition',
    },
  });

  const financeDept = await prisma.department.create({
    data: {
      name: 'Finance',
      description: 'Corporate Finance, Accounting, Payroll & Financial Planning',
    },
  });

  const opsDept = await prisma.department.create({
    data: {
      name: 'Operations',
      description: 'Business Operations, Facilities & Customer Fulfillment',
    },
  });

  console.log('🏢 Seeded departments: IT, HR, Finance, Operations');

  // 5. Seed Shifts (Morning, Afternoon)
  const morningShift = await prisma.shift.create({
    data: {
      name: 'Morning',
      startTime: '07:00',
      endTime: '15:30',
      breakMinutes: 45,
      status: ShiftStatus.ACTIVE,
    },
  });

  const afternoonShift = await prisma.shift.create({
    data: {
      name: 'Afternoon',
      startTime: '15:00',
      endTime: '23:30',
      breakMinutes: 45,
      status: ShiftStatus.ACTIVE,
    },
  });

  console.log('⏰ Seeded shifts: Morning, Afternoon');

  // 6. Seed Leave Types (Annual Leave, Sick Leave, Personal Leave)
  const annualLeave = await prisma.leaveType.create({
    data: {
      name: 'Annual Leave',
      description: 'Standard paid annual vacation leave allocation',
    },
  });

  const sickLeave = await prisma.leaveType.create({
    data: {
      name: 'Sick Leave',
      description: 'Medical leave for illness, injury, or medical appointments',
    },
  });

  const personalLeave = await prisma.leaveType.create({
    data: {
      name: 'Personal Leave',
      description: 'Unplanned time-off for personal emergencies or family commitments',
    },
  });

  console.log('📝 Seeded leave types: Annual Leave, Sick Leave, Personal Leave');

  // 7. Seed Employees
  const emp1 = await prisma.employee.create({
    data: {
      userId: adminUser.id,
      employeeId: 'EMP-001',
      firstName: 'Administrator',
      lastName: '',
      email: 'admin@example.com',
      phone: '+62 812-0000-0001',
      departmentId: hrDept.id,
      shiftId: morningShift.id,
      position: 'System Administrator',
      joinDate: new Date('2021-03-15'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  });

  const emp2 = await prisma.employee.create({
    data: {
      userId: employeeUser1.id,
      employeeId: 'EMP-002',
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex.rivera@company.com',
      phone: '+1 (555) 345-6789',
      departmentId: itDept.id,
      shiftId: morningShift.id,
      position: 'Lead Backend Engineer',
      joinDate: new Date('2022-01-10'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  });

  const emp3 = await prisma.employee.create({
    data: {
      userId: hrUser.id,
      employeeId: 'EMP-003',
      firstName: 'Emily',
      lastName: 'Zhao',
      email: 'emily.zhao@company.com',
      phone: '+1 (555) 456-7890',
      departmentId: hrDept.id,
      shiftId: morningShift.id,
      position: 'HR Specialist',
      joinDate: new Date('2022-06-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  });

  const emp4 = await prisma.employee.create({
    data: {
      userId: employeeUser2.id,
      employeeId: 'EMP-004',
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'marcus.vance@company.com',
      phone: '+1 (555) 567-8901',
      departmentId: financeDept.id,
      shiftId: morningShift.id,
      position: 'Senior Financial Analyst',
      joinDate: new Date('2021-11-05'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  });

  const emp5 = await prisma.employee.create({
    data: {
      employeeId: 'EMP-005',
      firstName: 'Tariq',
      lastName: 'Mansoor',
      email: 'tariq.mansoor@company.com',
      phone: '+1 (555) 678-9012',
      departmentId: opsDept.id,
      shiftId: afternoonShift.id,
      position: 'Operations Specialist',
      joinDate: new Date('2023-02-20'),
      employmentStatus: EmploymentStatus.ON_LEAVE,
    },
  });

  const empBudi = await prisma.employee.create({
    data: {
      userId: budiUser.id,
      employeeId: 'EMP-BUDI-001',
      firstName: 'Budi',
      lastName: 'Santoso',
      email: 'budi.santoso@example.com',
      phone: '+62 812-3456-7890',
      departmentId: itDept.id,
      shiftId: morningShift.id,
      position: 'Software Engineer',
      joinDate: new Date('2025-01-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  });

  const empSiti = await prisma.employee.create({
    data: {
      userId: sitiUser.id,
      employeeId: 'EMP-012',
      firstName: 'Siti',
      lastName: 'Rahma',
      email: 'siti.rahma@example.com',
      phone: '+62 812-9876-5432',
      departmentId: itDept.id,
      shiftId: morningShift.id,
      position: 'UI/UX Designer',
      joinDate: new Date('2025-02-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  });

  console.log('👥 Seeded employees: Administrator, Alex Rivera, Emily Zhao, Marcus Vance, Tariq Mansoor, Budi Santoso, Siti Rahma');

  // 8. Seed Attendance Records (PRESENT, LATE, ABSENT, LEAVE)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.attendance.createMany({
    data: [
      {
        employeeId: emp1.id,
        attendanceDate: today,
        checkIn: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 07:00 AM
        checkOut: new Date(today.getTime() + 15.5 * 60 * 60 * 1000), // 03:30 PM
        status: AttendanceStatus.PRESENT,
        workingMinutes: 465,
        notes: 'On-time morning arrival',
      },
      {
        employeeId: emp2.id,
        attendanceDate: today,
        checkIn: new Date(today.getTime() + 7.5 * 60 * 60 * 1000), // 07:30 AM
        checkOut: new Date(today.getTime() + 16 * 60 * 60 * 1000), // 04:00 PM
        status: AttendanceStatus.LATE,
        workingMinutes: 465,
        notes: 'Arrived 30 mins late due to transit delay',
      },
      {
        employeeId: emp3.id,
        attendanceDate: today,
        checkIn: new Date(today.getTime() + 6.9 * 60 * 60 * 1000), // 06:54 AM
        checkOut: new Date(today.getTime() + 15.5 * 60 * 60 * 1000),
        status: AttendanceStatus.PRESENT,
        workingMinutes: 471,
      },
      {
        employeeId: emp4.id,
        attendanceDate: today,
        checkIn: null,
        checkOut: null,
        status: AttendanceStatus.ABSENT,
        workingMinutes: 0,
        notes: 'Unexcused absence - Follow-up initiated',
      },
      {
        employeeId: emp5.id,
        attendanceDate: today,
        checkIn: null,
        checkOut: null,
        status: AttendanceStatus.LEAVE,
        workingMinutes: 0,
        notes: 'Scheduled approved personal leave',
      },
      // Yesterday records for emp1 & emp2
      {
        employeeId: emp1.id,
        attendanceDate: yesterday,
        checkIn: new Date(yesterday.getTime() + 7 * 60 * 60 * 1000),
        checkOut: new Date(yesterday.getTime() + 15.5 * 60 * 60 * 1000),
        status: AttendanceStatus.PRESENT,
        workingMinutes: 465,
      },
      {
        employeeId: emp2.id,
        attendanceDate: yesterday,
        checkIn: new Date(yesterday.getTime() + 7 * 60 * 60 * 1000),
        checkOut: new Date(yesterday.getTime() + 15.5 * 60 * 60 * 1000),
        status: AttendanceStatus.PRESENT,
        workingMinutes: 465,
      },
    ],
  });

  console.log('📅 Seeded attendance records with PRESENT, LATE, ABSENT, LEAVE statuses');

  // 9. Seed Leave Requests (PENDING, APPROVED, REJECTED)
  await prisma.leaveRequest.create({
    data: {
      employeeId: emp5.id,
      leaveTypeId: personalLeave.id,
      startDate: today,
      endDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      duration: 3,
      reason: 'Urgent family personal matters in hometown',
      status: LeaveRequestStatus.APPROVED,
      approvedBy: hrUser.id,
      approvedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: emp2.id,
      leaveTypeId: annualLeave.id,
      startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 11 * 24 * 60 * 60 * 1000),
      duration: 5,
      reason: 'Annual family summer vacation',
      status: LeaveRequestStatus.PENDING,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: emp4.id,
      leaveTypeId: sickLeave.id,
      startDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      duration: 2,
      reason: 'Mild fever and medical rest per doctor note',
      status: LeaveRequestStatus.APPROVED,
      approvedBy: adminUser.id,
      approvedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: emp3.id,
      leaveTypeId: personalLeave.id,
      startDate: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
      duration: 1,
      reason: 'Personal conflict with team product launch timeline',
      status: LeaveRequestStatus.REJECTED,
      approvedBy: adminUser.id,
      approvedAt: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✈️ Seeded leave requests with PENDING, APPROVED, REJECTED statuses');
  console.log('✅ Database seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
