import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, EmploymentStatus, AttendanceStatus, OvertimeStatus } from '@prisma/client';

describe('ReportsService - Comprehensive HR Analytics', () => {
  let service: ReportsService;
  let prisma: any;

  const mockAdminUser = {
    id: 'user-admin-1',
    email: 'admin@company.com',
    role: UserRole.ADMIN,
  };

  const mockEmployeeUser = {
    id: 'user-emp-1',
    email: 'budi@company.com',
    role: UserRole.EMPLOYEE,
    employee: {
      id: 'emp-uuid-1',
      employeeId: 'EMP-001',
    },
  };

  const mockEmployees = [
    {
      id: 'emp-uuid-1',
      employeeId: 'EMP-001',
      firstName: 'Budi',
      lastName: 'Santoso',
      departmentId: 'dept-1',
      employmentStatus: EmploymentStatus.ACTIVE,
      department: { id: 'dept-1', name: 'Engineering' },
      shift: { id: 'shift-1', name: 'Shift Pagi' },
    },
    {
      id: 'emp-uuid-2',
      employeeId: 'EMP-002',
      firstName: 'Siti',
      lastName: 'Rahma',
      departmentId: 'dept-1',
      employmentStatus: EmploymentStatus.ACTIVE,
      department: { id: 'dept-1', name: 'Engineering' },
      shift: { id: 'shift-1', name: 'Shift Pagi' },
    },
    {
      id: 'emp-uuid-3',
      employeeId: 'EMP-003',
      firstName: 'Dewi',
      lastName: 'Lestari',
      departmentId: 'dept-2',
      employmentStatus: EmploymentStatus.ON_LEAVE,
      department: { id: 'dept-2', name: 'Human Resources' },
      shift: { id: 'shift-1', name: 'Shift Pagi' },
    },
  ];

  const mockAttendances = [
    {
      id: 'att-1',
      employeeId: 'emp-uuid-1',
      attendanceDate: new Date('2026-09-01T00:00:00.000Z'),
      status: AttendanceStatus.PRESENT,
      workingMinutes: 480,
      employee: { id: 'emp-uuid-1', departmentId: 'dept-1', firstName: 'Budi', lastName: 'Santoso' },
    },
    {
      id: 'att-2',
      employeeId: 'emp-uuid-1',
      attendanceDate: new Date('2026-09-02T00:00:00.000Z'),
      status: AttendanceStatus.LATE,
      workingMinutes: 460,
      employee: { id: 'emp-uuid-1', departmentId: 'dept-1', firstName: 'Budi', lastName: 'Santoso' },
    },
    {
      id: 'att-3',
      employeeId: 'emp-uuid-2',
      attendanceDate: new Date('2026-09-01T00:00:00.000Z'),
      status: AttendanceStatus.ABSENT,
      workingMinutes: 0,
      employee: { id: 'emp-uuid-2', departmentId: 'dept-1', firstName: 'Siti', lastName: 'Rahma' },
    },
  ];

  const mockLeaveRequests = [
    {
      id: 'leave-1',
      employeeId: 'emp-uuid-3',
      duration: 3,
      status: 'APPROVED',
      leaveType: { name: 'CUTI TAHUNAN' },
      employee: { departmentId: 'dept-2' },
    },
    {
      id: 'leave-2',
      employeeId: 'emp-uuid-1',
      duration: 1,
      status: 'PENDING',
      leaveType: { name: 'IZIN' },
      employee: { departmentId: 'dept-1' },
    },
  ];

  const mockOvertimes = [
    {
      id: 'ot-1',
      employeeId: 'emp-uuid-1',
      status: OvertimeStatus.APPROVED,
      requestedMinutes: 120,
      approvedMinutes: 120,
      actualMinutes: 120,
      date: new Date('2026-09-05T00:00:00.000Z'),
      employee: { departmentId: 'dept-1' },
    },
  ];

  const mockPayrolls = [
    {
      id: 'pr-1',
      employeeId: 'emp-uuid-1',
      basicSalary: 8000000,
      allowances: 1500000,
      deductions: 500000,
      overtimePay: 300000,
      netSalary: 9300000,
      status: 'PAID',
      paidAt: new Date('2026-09-25T00:00:00.000Z'),
      payrollPeriod: { id: 'period-1', name: 'September 2026' },
      employee: { departmentId: 'dept-1' },
    },
  ];

  const mockReimbursements = [
    {
      id: 'reimb-1',
      employeeId: 'emp-uuid-1',
      amount: 250000,
      category: 'TRANSPORTATION',
      status: 'PAID',
      expenseDate: new Date('2026-09-10T00:00:00.000Z'),
      employee: { departmentId: 'dept-1' },
    },
  ];

  const mockVacancies = [
    { id: 'vac-1', status: 'OPEN', departmentId: 'dept-1' },
  ];

  const mockApplicants = [
    { id: 'app-1', currentStage: 'APPLIED', jobVacancyId: 'vac-1' },
    { id: 'app-2', currentStage: 'HIRED', jobVacancyId: 'vac-1' },
  ];

  beforeEach(async () => {
    prisma = {
      employee: {
        findMany: jest.fn().mockResolvedValue(mockEmployees),
        findUnique: jest.fn().mockResolvedValue(mockEmployees[0]),
      },
      department: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dept-1', name: 'Engineering', code: 'ENG', employees: [mockEmployees[0], mockEmployees[1]] },
          { id: 'dept-2', name: 'Human Resources', code: 'HRD', employees: [mockEmployees[2]] },
        ]),
      },
      attendance: {
        findMany: jest.fn().mockResolvedValue(mockAttendances),
      },
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue(mockLeaveRequests),
      },
      shift: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'shift-1', name: 'Shift Pagi', code: 'PAGI', startTime: '08:00', endTime: '17:00', _count: { employees: 3 } },
        ]),
      },
      overtimeRequest: {
        findMany: jest.fn().mockResolvedValue(mockOvertimes),
      },
      payrollRecord: {
        findMany: jest.fn().mockResolvedValue(mockPayrolls),
      },
      reimbursementRequest: {
        findMany: jest.fn().mockResolvedValue(mockReimbursements),
      },
      jobVacancy: {
        findMany: jest.fn().mockResolvedValue(mockVacancies),
      },
      applicant: {
        findMany: jest.fn().mockResolvedValue(mockApplicants),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should calculate comprehensive analytics correctly for ADMIN role', async () => {
    const result: any = await service.getComprehensiveAnalytics(
      { period: 'this_month' },
      mockAdminUser
    );

    expect(result.isEmployee).toBe(false);
    expect(result.headcount.total).toBe(3);
    expect(result.headcount.active).toBe(2);
    expect(result.headcount.onLeave).toBe(1);

    // Attendance aggregation (2 present/late out of 3 = 67% attendance)
    expect(result.attendance.totalRecords).toBe(3);
    expect(result.attendance.present).toBe(1);
    expect(result.attendance.late).toBe(1);
    expect(result.attendance.absent).toBe(1);
    expect(result.attendance.attendanceRate).toBe(67);

    // Overtime aggregation (120 mins = 2.0 hours)
    expect(result.overtime.totalRequests).toBe(1);
    expect(result.overtime.approvedHours).toBe('2.0');

    // Payroll aggregation
    expect(result.payroll.totalNetPaid).toBe(9300000);

    // Reimbursement aggregation
    expect(result.reimbursement.totalAmount).toBe(250000);
    expect(result.reimbursement.paidAmount).toBe(250000);

    // Recruitment funnel (1 hired out of 2 = 50% conversion)
    expect(result.recruitment.totalApplicants).toBe(2);
    expect(result.recruitment.funnel.hired).toBe(1);
    expect(result.recruitment.conversionRate).toBe(50);

    // Department breakdown
    expect(result.departmentBreakdown.length).toBe(2);
    expect(result.departmentBreakdown[0].name).toBe('Engineering');
  });

  it('should scope analytics strictly to personal data for EMPLOYEE role', async () => {
    prisma.attendance.findMany.mockResolvedValue([mockAttendances[0], mockAttendances[1]]);
    prisma.leaveRequest.findMany.mockResolvedValue([mockLeaveRequests[1]]);

    const result: any = await service.getComprehensiveAnalytics(
      { period: 'this_month' },
      mockEmployeeUser
    );

    expect(result.isEmployee).toBe(true);
    expect(result.employee.employeeId).toBe('EMP-001');
    expect(result.attendance.present).toBe(1);
    expect(result.attendance.late).toBe(1);
    expect(result.attendance.absent).toBe(0);
    expect(result.attendance.attendanceRate).toBe(100);
    expect(result.overtime.approvedHours).toBe('2.0');
    expect(result.performance.score).toBeGreaterThanOrEqual(80);

    // Ensure company-wide recruitment and all-department tables are not leaked
    expect((result as any).departmentBreakdown).toBeUndefined();
    expect((result as any).recruitment).toBeUndefined();
  });

  it('should handle empty database records without crashing or zero-division errors', async () => {
    prisma.employee.findMany.mockResolvedValue([]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.leaveRequest.findMany.mockResolvedValue([]);
    prisma.overtimeRequest.findMany.mockResolvedValue([]);
    prisma.payrollRecord.findMany.mockResolvedValue([]);
    prisma.reimbursementRequest.findMany.mockResolvedValue([]);
    prisma.jobVacancy.findMany.mockResolvedValue([]);
    prisma.applicant.findMany.mockResolvedValue([]);
    prisma.department.findMany.mockResolvedValue([]);

    const result: any = await service.getComprehensiveAnalytics(
      { period: 'this_month' },
      mockAdminUser
    );

    expect(result.headcount.total).toBe(0);
    expect(result.attendance.attendanceRate).toBe(0);
    expect(result.attendance.punctualityRate).toBe(0);
    expect(result.overtime.approvedHours).toBe('0.0');
    expect(result.payroll.totalNetPaid).toBe(0);
    expect(result.recruitment.conversionRate).toBe(0);
    expect(result.departmentBreakdown).toEqual([]);
  });
});
