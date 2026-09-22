export type UserRole = 'ADMIN' | 'HR' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employee?: {
    id: string;
    employeeId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string | null;
    position?: string | null;
    photo?: string | null;
    department?: { id?: string; name: string } | string | null;
    shift?: { id?: string; name: string } | null;
  } | null;
}

export type EmploymentStatus = 'Active' | 'On Leave' | 'Inactive';

export interface EmployeeAttendanceSummary {
  presentRate: number; // e.g. 96.5%
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalDays: number;
}

export interface EmployeeLeaveSummary {
  annualTotal: number;
  annualUsed: number;
  sickUsed: number;
  remaining: number;
}

export interface Employee {
  id: string; // e.g. "EMP-001"
  name: string;
  email: string;
  avatar: string;
  department: string;
  position: string;
  role: UserRole;
  status: EmploymentStatus;
  joinDate: string;
  phone: string;
  address?: string;
  attendanceSummary: EmployeeAttendanceSummary;
  leaveSummary: EmployeeLeaveSummary;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Leave';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workingHours: string | null;
  shift?: string;
  notes?: string;
}

export type LeaveType = 'Annual Leave' | 'Sick Leave' | 'Casual Leave' | 'Maternity Leave' | 'Unpaid Leave';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: number; // number of days
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
}

export type ShiftStatus = 'Active' | 'Inactive' | 'ACTIVE' | 'INACTIVE';

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: string;
  employeeCount: number;
  status: ShiftStatus;
  days: string[];
}

export interface ShiftMasterRecord {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  toleranceMinutes: number;
  isOvernight: boolean;
  workDays?: string | null;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees: number;
    schedules: number;
    attendances?: number;
  };
}

export interface EmployeeScheduleRecord {
  id: string;
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
  workDays?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    position?: string | null;
    department?: {
      id: string;
      name: string;
      code?: string | null;
    } | null;
  };
  shift: ShiftMasterRecord;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  onLeaveToday: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'attendance' | 'leave' | 'employee' | 'shift';
  badgeColor?: string;
}

export interface EmployeeRecord {
  id: string;
  userId?: string | null;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  photo?: string | null;
  address?: string | null;
  birthDate?: string | null;
  departmentId: string;
  shiftId?: string | null;
  position: string;
  joinDate: string;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code?: string | null;
  };
  shift?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    createdAt?: string;
  } | null;
}

export interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveEmployees: number;
  totalDepartments: number;
  totalPositions: number;
}

export interface PositionMaster {
  id: string;
  name: string;
  code?: string | null;
  status: string;
  description?: string | null;
}

export interface EmployeeDetailedStats {
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  dinas: number;
  cuti: number;
  alpha: number;
  totalRecords: number;
}

export interface EmployeeDetailedProfile {
  employee: EmployeeRecord;
  stats: EmployeeDetailedStats;
  recentAttendances: any[];
  recentLeaves: any[];
  auditLogs: any[];
}

export type NotificationType =
  | 'LEAVE_SUBMITTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'SHIFT_REMINDER'
  | 'SHIFT_ASSIGNED'
  | 'SHIFT_CHANGED'
  | 'ATTENDANCE_REMINDER'
  | 'CHECKOUT_REMINDER'
  | 'LATE_ATTENDANCE'
  | 'EMPLOYEE_CREATED'
  | 'GENERAL_ANNOUNCEMENT'
  | 'SYSTEM';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface OvertimeRecord {
  id: string;
  employeeId: string;
  attendanceId?: string | null;
  scheduleId?: string | null;
  date: string;
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  requestedMinutes: number;
  approvedMinutes?: number | null;
  actualMinutes?: number | null;
  status: OvertimeStatus;
  reason: string;
  notes?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  payrollProcessed: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: { id: string; name: string } | null;
    position?: string | null;
  };
  approver?: {
    id: string;
    email: string;
    role: string;
  } | null;
  schedule?: {
    id: string;
    shift?: {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
    } | null;
  } | null;
  attendance?: {
    id: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status?: string | null;
    workingMinutes?: number | null;
  } | null;
}

export interface OvertimeSummary {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalRequestedMinutes: number;
  totalApprovedMinutes: number;
  totalActualMinutes: number;
}

export type PayrollPeriodStatus = 'DRAFT' | 'PROCESSING' | 'PROCESSED' | 'FINAL' | 'PAID';
export type PayrollRecordStatus = 'DRAFT' | 'PROCESSING' | 'PROCESSED' | 'FINAL' | 'PAID';

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  basicSalary: number;
  allowances: number;
  fixedAllowance?: number;
  transportAllowance?: number;
  mealAllowance?: number;
  deductions: number;
  fixedDeduction?: number;
  bpjsDeduction?: number;
  taxDeduction?: number;
  overtimeRatePerHour?: number | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: { id: string; name: string } | null;
    position?: string | null;
  };
}

export interface PayrollPeriod {
  id: string;
  name: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  processedAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    records: number;
  };
  records?: PayrollRecord[];
}

export interface PayrollRecord {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  status: PayrollRecordStatus;
  basicSalary: number;
  allowances: number;
  fixedAllowance?: number;
  transportAllowance?: number;
  mealAllowance?: number;
  grossSalary?: number;
  deductions: number;
  lateDeduction?: number;
  alphaDeduction?: number;
  unpaidLeaveDays?: number;
  unpaidLeaveDeduction?: number;
  fixedDeduction?: number;
  bpjsDeduction?: number;
  taxDeduction?: number;
  otherDeduction?: number;
  totalDeductions?: number;
  overtimeHours: number;
  overtimeMinutes?: number;
  overtimePay: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  netSalary: number;
  takeHomePay?: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    position?: string | null;
    department?: { id: string; name: string } | null;
    salary?: EmployeeSalary | null;
  };
  payrollPeriod?: {
    id: string;
    name: string;
    month: number;
    year: number;
    status: PayrollPeriodStatus;
    paidAt?: string | null;
  };
}

export interface PayrollSummary {
  totalEmployees: number;
  totalNetSalary: number;
  totalBasicSalary: number;
  totalAllowances: number;
  totalOvertimePay: number;
  totalDeductions: number;
  draftCount: number;
  processedCount: number;
  paidCount: number;
}

export type ReimbursementCategory =
  | 'TRANSPORTATION'
  | 'MEALS'
  | 'BUSINESS_TRIP'
  | 'OPERATIONAL'
  | 'MEDICAL'
  | 'OTHER';

export type ReimbursementStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

export interface ReimbursementRequest {
  id: string;
  reimbursementNo: string;
  reimbursementNumber?: string;
  employeeId: string;
  category: ReimbursementCategory;
  amount: number;
  approvedAmount?: number | null;
  date: string;
  expenseDate?: string;
  description: string;
  receiptUrl: string;
  receiptProof?: string;
  receiptFileName?: string | null;
  receiptFileSize?: number | null;
  receiptFileHash?: string | null;
  status: ReimbursementStatus;
  notes?: string | null;
  approvalNotes?: string | null;
  rejectedReason?: string | null;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  payrollRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    name?: string;
    position?: any;
    department?: { id: string; name: string } | null;
    salary?: EmployeeSalary | null;
  };
  approver?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  } | null;
  approvedByUser?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  } | null;
  payer?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  } | null;
  paidByUser?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  } | null;
  rejectedByUser?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  } | null;
}

export interface ReimbursementSummary {
  totalRequests: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  paidCount: number;
  totalRequestedAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  totalAmount?: number;
  submittedAmount?: number;
  approvedAmount?: number;
  paidAmount?: number;
}

export type JobVacancyStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';

export type ApplicantStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'HIRED';

export interface JobVacancy {
  id: string;
  vacancyNo: string;
  title: string;
  departmentId: string;
  position: string;
  description: string;
  requirements: string;
  location?: string | null;
  employmentType?: string | null;
  quota: number;
  status: JobVacancyStatus;
  startDate: string;
  endDate?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  applicants?: Applicant[];
  _count?: {
    applicants: number;
  };
}

export interface Applicant {
  id: string;
  applicantNo: string;
  jobVacancyId: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  resumeUrl: string;
  resumeFileName?: string | null;
  resumeFileSize?: number | null;
  resumeFileHash?: string | null;
  coverLetter?: string | null;
  currentStage: ApplicantStatus;
  screeningNotes?: string | null;
  interviewNotes?: string | null;
  interviewDate?: string | null;
  rejectionReason?: string | null;
  hiredDate?: string | null;
  employeeId?: string | null;
  createdAt: string;
  updatedAt: string;
  jobVacancy?: {
    id: string;
    vacancyNo?: string;
    title: string;
    position: string;
    department?: {
      id: string;
      name: string;
      code?: string | null;
    } | null;
  } | null;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    employmentStatus: string;
    joinDate?: string | null;
  } | null;
}

export interface RecruitmentSummary {
  totalVacancies: number;
  openVacancies: number;
  closedVacancies: number;
  totalApplicants: number;
  appliedCount: number;
  screeningCount: number;
  interviewCount: number;
  selectedCount: number;
  hiredCount: number;
  rejectedCount: number;
}



