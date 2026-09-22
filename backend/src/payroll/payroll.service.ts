import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  UserRole,
  EmploymentStatus,
  PayrollPeriodStatus,
  PayrollRecordStatus,
  LeaveRequestStatus,
  Prisma,
} from '@prisma/client';
import { UpsertSalaryDto } from './dto/upsert-salary.dto';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollPeriodDto } from './dto/update-payroll-period.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { QueryPayrollRecordDto } from './dto/query-payroll.dto';
import { parseJakartaDateString } from '../attendance/attendance.time.util';
import { PayrollPdfService } from './payroll.pdf.service';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly payrollPdfService: PayrollPdfService,
  ) {}

  // ===========================================================================
  // 1. MASTER GAJI KARYAWAN (SALARY SETTINGS)
  // ===========================================================================

  /**
   * Get all employee salaries list (Admin/HR).
   */
  async getSalaries() {
    return this.prisma.employee.findMany({
      where: { employmentStatus: EmploymentStatus.ACTIVE },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        position: true,
        department: { select: { id: true, name: true } },
        salary: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Get single employee salary master.
   */
  async getSalary(employeeId: string, user: any) {
    if (user.role === UserRole.EMPLOYEE) {
      if (user.employee?.id !== employeeId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke konfigurasi gaji karyawan lain');
      }
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        salary: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Karyawan dengan ID '${employeeId}' tidak ditemukan`);
    }

    return employee;
  }

  /**
   * Create or update employee salary setting (Admin/HR only).
   */
  async upsertSalary(employeeId: string, dto: UpsertSalaryDto, user: any, ipAddress?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Karyawan dengan ID '${employeeId}' tidak ditemukan`);
    }

    const fixedAllowance = dto.fixedAllowance !== undefined ? dto.fixedAllowance : 0;
    const transportAllowance = dto.transportAllowance !== undefined ? dto.transportAllowance : 0;
    const mealAllowance = dto.mealAllowance !== undefined ? dto.mealAllowance : 0;
    const hasSubAllowances = (dto.fixedAllowance !== undefined || dto.transportAllowance !== undefined || dto.mealAllowance !== undefined);
    const allowances = hasSubAllowances
      ? (fixedAllowance + transportAllowance + mealAllowance)
      : (dto.allowances ?? 0);
    const finalFixedAllowance = (!hasSubAllowances && dto.allowances)
      ? dto.allowances
      : fixedAllowance;

    const fixedDeduction = dto.fixedDeduction !== undefined ? dto.fixedDeduction : 0;
    const bpjsDeduction = dto.bpjsDeduction !== undefined ? dto.bpjsDeduction : 0;
    const taxDeduction = dto.taxDeduction !== undefined ? dto.taxDeduction : 0;
    const hasSubDeductions = (dto.fixedDeduction !== undefined || dto.bpjsDeduction !== undefined || dto.taxDeduction !== undefined);
    const deductions = hasSubDeductions
      ? (fixedDeduction + bpjsDeduction + taxDeduction)
      : (dto.deductions ?? 0);
    const finalFixedDeduction = (!hasSubDeductions && dto.deductions)
      ? dto.deductions
      : fixedDeduction;

    const salary = await this.prisma.employeeSalary.upsert({
      where: { employeeId },
      create: {
        employeeId,
        basicSalary: new Prisma.Decimal(dto.basicSalary),
        allowances: new Prisma.Decimal(allowances),
        fixedAllowance: new Prisma.Decimal(finalFixedAllowance),
        transportAllowance: new Prisma.Decimal(transportAllowance),
        mealAllowance: new Prisma.Decimal(mealAllowance),
        deductions: new Prisma.Decimal(deductions),
        fixedDeduction: new Prisma.Decimal(finalFixedDeduction),
        bpjsDeduction: new Prisma.Decimal(bpjsDeduction),
        taxDeduction: new Prisma.Decimal(taxDeduction),
        overtimeRatePerHour: dto.overtimeRatePerHour !== undefined && dto.overtimeRatePerHour !== null
          ? new Prisma.Decimal(dto.overtimeRatePerHour)
          : null,
        bankName: dto.bankName || null,
        bankAccount: dto.bankAccount || dto.bankAccountNumber || null,
        bankAccountHolder: dto.bankAccountHolder || null,
        notes: dto.notes || null,
      },
      update: {
        basicSalary: new Prisma.Decimal(dto.basicSalary),
        allowances: new Prisma.Decimal(allowances),
        fixedAllowance: new Prisma.Decimal(finalFixedAllowance),
        transportAllowance: new Prisma.Decimal(transportAllowance),
        mealAllowance: new Prisma.Decimal(mealAllowance),
        deductions: new Prisma.Decimal(deductions),
        fixedDeduction: new Prisma.Decimal(finalFixedDeduction),
        bpjsDeduction: new Prisma.Decimal(bpjsDeduction),
        taxDeduction: new Prisma.Decimal(taxDeduction),
        overtimeRatePerHour: dto.overtimeRatePerHour !== undefined && dto.overtimeRatePerHour !== null
          ? new Prisma.Decimal(dto.overtimeRatePerHour)
          : null,
        bankName: dto.bankName || null,
        bankAccount: dto.bankAccount || dto.bankAccountNumber || null,
        bankAccountHolder: dto.bankAccountHolder || null,
        notes: dto.notes || null,
      },
    });

    await this.auditService.log({
      action: 'SALARY_MASTER_UPSERTED',
      userId: user.id,
      ipAddress,
      details: `Master gaji karyawan ${employee.firstName} ${employee.lastName || ''} diperbarui. Gaji pokok: ${dto.basicSalary}`,
      metadata: {
        resource: 'EmployeeSalary',
        resourceId: salary.id,
        employeeId,
        basicSalary: dto.basicSalary,
        allowances,
        deductions,
      },
    });

    return salary;
  }

  // ===========================================================================
  // 2. PERIODE PAYROLL BULANAN
  // ===========================================================================

  /**
   * List all payroll periods with record summary.
   */
  async getPeriods() {
    return this.prisma.payrollPeriod.findMany({
      include: {
        _count: {
          select: { records: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /**
   * Get single payroll period with summary statistics.
   */
  async getPeriod(id: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        records: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                position: true,
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { employee: { firstName: 'asc' } },
        },
      },
    });

    if (!period) {
      throw new NotFoundException(`Periode payroll dengan ID '${id}' tidak ditemukan`);
    }

    // Compute period totals
    const totalRecords = period.records.length;
    let totalBasicSalary = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;
    let totalOvertimePay = 0;
    let totalNetSalary = 0;

    for (const r of period.records) {
      totalBasicSalary += Number(r.basicSalary);
      totalAllowances += Number(r.allowances);
      totalDeductions += Number(r.deductions);
      totalOvertimePay += Number(r.overtimePay);
      totalNetSalary += Number(r.netSalary);
    }

    return {
      ...period,
      summary: {
        totalRecords,
        totalBasicSalary,
        totalAllowances,
        totalDeductions,
        totalOvertimePay,
        totalNetSalary,
      },
    };
  }

  /**
   * Create a new monthly payroll period (Admin/HR).
   */
  async createPeriod(dto: CreatePayrollPeriodDto, user: any, ipAddress?: string) {
    const startDateObj = parseJakartaDateString(dto.startDate);
    const endDateObj = parseJakartaDateString(dto.endDate);

    if (startDateObj > endDateObj) {
      throw new BadRequestException('Tanggal awal cut-off tidak boleh lebih besar dari tanggal akhir');
    }

    // Check unique month/year
    const existing = await this.prisma.payrollPeriod.findUnique({
      where: {
        month_year: {
          month: dto.month,
          year: dto.year,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Periode payroll untuk bulan ${dto.month}/${dto.year} sudah pernah dibuat ('${existing.name}')`,
      );
    }

    const period = await this.prisma.payrollPeriod.create({
      data: {
        name: dto.name,
        month: dto.month,
        year: dto.year,
        startDate: startDateObj,
        endDate: endDateObj,
        status: PayrollPeriodStatus.DRAFT,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'PAYROLL_PERIOD_CREATED',
      userId: user.id,
      ipAddress,
      details: `Periode penggajian ${period.name} dibuat`,
      metadata: { resource: 'PayrollPeriod', resourceId: period.id, name: period.name, month: period.month, year: period.year },
    });

    return period;
  }

  /**
   * Update draft payroll period.
   */
  async updatePeriod(id: string, dto: UpdatePayrollPeriodDto, user: any, ipAddress?: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new NotFoundException(`Periode payroll dengan ID '${id}' tidak ditemukan`);
    }

    if (period.status !== PayrollPeriodStatus.DRAFT) {
      throw new BadRequestException('Hanya periode berstatus DRAFT yang dapat diubah tanggal atau detailnya');
    }

    const data: Prisma.PayrollPeriodUpdateInput = {};
    if (dto.name) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.startDate) data.startDate = parseJakartaDateString(dto.startDate);
    if (dto.endDate) data.endDate = parseJakartaDateString(dto.endDate);

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      action: 'PAYROLL_PERIOD_UPDATED',
      userId: user.id,
      ipAddress,
      details: `Periode penggajian ${updated.name} diperbarui`,
      metadata: { resource: 'PayrollPeriod', resourceId: id },
    });

    return updated;
  }

  /**
   * Delete draft payroll period.
   */
  async deletePeriod(id: string, user: any, ipAddress?: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new NotFoundException(`Periode payroll dengan ID '${id}' tidak ditemukan`);
    }

    if (period.status !== PayrollPeriodStatus.DRAFT) {
      throw new BadRequestException('Hanya periode berstatus DRAFT yang dapat dihapus');
    }

    await this.prisma.payrollPeriod.delete({ where: { id } });

    await this.auditService.log({
      action: 'PAYROLL_PERIOD_DELETED',
      userId: user.id,
      ipAddress,
      details: `Periode penggajian ${period.name} dihapus`,
      metadata: { resource: 'PayrollPeriod', resourceId: id, name: period.name },
    });

    return { success: true, message: 'Periode payroll berhasil dihapus' };
  }

  // ===========================================================================
  // 3. KALKULASI & PEMROSESAN PAYROLL (ENGINE V1)
  // ===========================================================================

  /**
   * Automatically calculate payroll records for a period.
   * Aggregates salary, attendance, approved leaves, and approved overtimes.
   *
   * Formula:
   * Gross Salary = Basic Salary + Allowance + Overtime
   * Deduction = Late Deduction + Alpha Deduction + Other Deduction
   * Take Home Pay = Gross Salary - Deduction
   */
  async calculatePayroll(periodId: string, user?: any, ipAddress?: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException(`Periode payroll dengan ID '${periodId}' tidak ditemukan`);
    }

    if (
      period.status !== PayrollPeriodStatus.DRAFT &&
      period.status !== PayrollPeriodStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Kalkulasi payroll hanya dapat dijalankan pada periode berstatus DRAFT atau PROCESSING',
      );
    }

    // 1. Fetch all ACTIVE employees with an EmployeeSalary profile
    const employees = await this.prisma.employee.findMany({
      where: {
        employmentStatus: EmploymentStatus.ACTIVE,
        salary: { isNot: null },
      },
      include: {
        salary: true,
      },
      orderBy: { firstName: 'asc' },
    });

    if (employees.length === 0) {
      throw new BadRequestException(
        'Tidak ada karyawan aktif yang memiliki data master gaji. Silakan atur master gaji karyawan terlebih dahulu.',
      );
    }

    let calculatedCount = 0;

    for (const emp of employees) {
      const salary = emp.salary!;

      // 1. Salary & Master Allowance Components
      const basicSalaryNum = Number(salary.basicSalary);
      const fixedAllowanceNum = Number(salary.fixedAllowance || 0);
      const transportAllowanceNum = Number(salary.transportAllowance || 0);
      const mealAllowanceNum = Number(salary.mealAllowance || 0);
      const totalAllowanceNum =
        fixedAllowanceNum + transportAllowanceNum + mealAllowanceNum > 0
          ? fixedAllowanceNum + transportAllowanceNum + mealAllowanceNum
          : Number(salary.allowances || 0);

      // 2. Attendance aggregation within period cut-off
      const attendances = await this.prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          attendanceDate: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
      });

      const presentDays = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
      const lateDays = attendances.filter((a) => a.status === 'LATE').length;
      const absentDays = attendances.filter((a) => a.status === 'ABSENT').length;

      // 3. Approved Overtime aggregation within period cut-off
      const approvedOvertimes = await this.prisma.overtimeRequest.findMany({
        where: {
          employeeId: emp.id,
          status: 'APPROVED',
          date: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
      });

      const overtimeMinutes = approvedOvertimes.reduce(
        (acc, curr) => acc + (curr.approvedMinutes ?? curr.requestedMinutes ?? 0),
        0,
      );
      const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

      // Configurable rate: if salary has overtimeRatePerHour use it, else default (basicSalary / 173)
      const hourlyRate = salary.overtimeRatePerHour
        ? Number(salary.overtimeRatePerHour)
        : Math.round(basicSalaryNum / 173);

      let customOvertimePay = 0;
      let hasCustomOvertimePay = false;
      for (const ot of approvedOvertimes) {
        if (ot.notes) {
          const match = ot.notes.match(/(?:amount|pay|nominal|biaya)[\s:=]+([0-9.]+)/i);
          if (match) {
            const parsed = parseInt(match[1].replace(/\./g, ''), 10);
            if (!isNaN(parsed) && parsed > 0) {
              customOvertimePay += parsed;
              hasCustomOvertimePay = true;
            }
          }
        }
      }

      const overtimePay = hasCustomOvertimePay
        ? customOvertimePay
        : Math.round(overtimeHours * hourlyRate);

      // 4. Approved Leave aggregation within period (izin, cuti, unpaid leave)
      const approvedLeaves = await this.prisma.leaveRequest.findMany({
        where: {
          employeeId: emp.id,
          status: LeaveRequestStatus.APPROVED,
          startDate: { lte: period.endDate },
          endDate: { gte: period.startDate },
        },
        include: {
          leaveType: true,
        },
      });

      let leaveDays = 0;
      let unpaidLeaveDays = 0;

      for (const l of approvedLeaves) {
        leaveDays += l.duration;
        const typeName = (l.leaveType?.name || '').toLowerCase();
        if (
          typeName.includes('unpaid') ||
          typeName.includes('tanpa gaji') ||
          typeName.includes('potong gaji')
        ) {
          unpaidLeaveDays += l.duration;
        }
      }

      // 5. Formula Calculations
      // Gross Salary = Basic Salary + Allowance + Overtime
      const grossSalary = basicSalaryNum + totalAllowanceNum + overtimePay;

      // Rates for deductions
      const dailyRate = Math.round(basicSalaryNum / 22);

      // Late deduction (Rp 25.000 per arrival late, or 0 if no late arrival)
      const lateDeduction = lateDays * 25000;

      // Alpha deduction (absent days * daily rate)
      const alphaDeduction = absentDays * dailyRate;

      // Unpaid leave deduction (unpaid leave days * daily rate)
      const unpaidLeaveDeduction = unpaidLeaveDays * dailyRate;

      // Other Deductions from Master Salary (Potongan Tetap, BPJS, Pajak)
      const fixedDeductionNum = Number(salary.fixedDeduction || 0);
      const bpjsDeductionNum = Number(salary.bpjsDeduction || 0);
      const taxDeductionNum = Number(salary.taxDeduction || 0);
      const otherDeductionNum =
        fixedDeductionNum + bpjsDeductionNum + taxDeductionNum > 0
          ? fixedDeductionNum + bpjsDeductionNum + taxDeductionNum
          : Number(salary.deductions || 0);

      // Total Deduction = Late Deduction + Alpha Deduction + Other Deduction (+ unpaid leave)
      const totalDeductions = lateDeduction + alphaDeduction + unpaidLeaveDeduction + otherDeductionNum;

      // Take Home Pay = Gross Salary - Deduction
      const takeHomePay = Math.max(0, grossSalary - totalDeductions);

      // 6. Upsert PayrollRecord snapshot
      await this.prisma.payrollRecord.upsert({
        where: {
          payrollPeriodId_employeeId: {
            payrollPeriodId: period.id,
            employeeId: emp.id,
          },
        },
        create: {
          payrollPeriodId: period.id,
          employeeId: emp.id,
          presentDays,
          lateDays,
          absentDays,
          leaveDays,
          unpaidLeaveDays,
          overtimeHours: new Prisma.Decimal(overtimeHours),
          overtimeMinutes,
          basicSalary: new Prisma.Decimal(basicSalaryNum),
          allowances: new Prisma.Decimal(totalAllowanceNum),
          fixedAllowance: new Prisma.Decimal(fixedAllowanceNum),
          transportAllowance: new Prisma.Decimal(transportAllowanceNum),
          mealAllowance: new Prisma.Decimal(mealAllowanceNum),
          overtimePay: new Prisma.Decimal(overtimePay),
          grossSalary: new Prisma.Decimal(grossSalary),
          lateDeduction: new Prisma.Decimal(lateDeduction),
          alphaDeduction: new Prisma.Decimal(alphaDeduction),
          unpaidLeaveDeduction: new Prisma.Decimal(unpaidLeaveDeduction),
          fixedDeduction: new Prisma.Decimal(fixedDeductionNum),
          bpjsDeduction: new Prisma.Decimal(bpjsDeductionNum),
          taxDeduction: new Prisma.Decimal(taxDeductionNum),
          otherDeduction: new Prisma.Decimal(otherDeductionNum),
          deductions: new Prisma.Decimal(totalDeductions),
          totalDeductions: new Prisma.Decimal(totalDeductions),
          netSalary: new Prisma.Decimal(takeHomePay),
          takeHomePay: new Prisma.Decimal(takeHomePay),
          status: PayrollRecordStatus.DRAFT,
        },
        update: {
          presentDays,
          lateDays,
          absentDays,
          leaveDays,
          unpaidLeaveDays,
          overtimeHours: new Prisma.Decimal(overtimeHours),
          overtimeMinutes,
          basicSalary: new Prisma.Decimal(basicSalaryNum),
          allowances: new Prisma.Decimal(totalAllowanceNum),
          fixedAllowance: new Prisma.Decimal(fixedAllowanceNum),
          transportAllowance: new Prisma.Decimal(transportAllowanceNum),
          mealAllowance: new Prisma.Decimal(mealAllowanceNum),
          overtimePay: new Prisma.Decimal(overtimePay),
          grossSalary: new Prisma.Decimal(grossSalary),
          lateDeduction: new Prisma.Decimal(lateDeduction),
          alphaDeduction: new Prisma.Decimal(alphaDeduction),
          unpaidLeaveDeduction: new Prisma.Decimal(unpaidLeaveDeduction),
          fixedDeduction: new Prisma.Decimal(fixedDeductionNum),
          bpjsDeduction: new Prisma.Decimal(bpjsDeductionNum),
          taxDeduction: new Prisma.Decimal(taxDeductionNum),
          otherDeduction: new Prisma.Decimal(otherDeductionNum),
          deductions: new Prisma.Decimal(totalDeductions),
          totalDeductions: new Prisma.Decimal(totalDeductions),
          netSalary: new Prisma.Decimal(takeHomePay),
          takeHomePay: new Prisma.Decimal(takeHomePay),
        },
      });

      calculatedCount++;
    }

    if (user?.id) {
      await this.auditService.log({
        action: 'PAYROLL_CALCULATED',
        userId: user.id,
        ipAddress,
        details: `Kalkulasi payroll berhasil dijalankan untuk ${calculatedCount} karyawan pada periode ${period.name}`,
        metadata: {
          resource: 'PayrollPeriod',
          resourceId: period.id,
          calculatedCount,
          periodName: period.name,
        },
      });
    }

    return {
      success: true,
      message: `Kalkulasi payroll berhasil dijalankan untuk ${calculatedCount} karyawan.`,
      generatedCount: calculatedCount,
    };
  }

  /**
   * Alias for calculatePayroll for backward compatibility.
   */
  async generatePayroll(periodId: string, user: any, ipAddress?: string) {
    return this.calculatePayroll(periodId, user, ipAddress);
  }

  /**
   * Transition payroll period and records to PROCESSED.
   */
  async processPayroll(periodId: string, user: any, ipAddress?: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: { _count: { select: { records: true } } },
    });

    if (!period) {
      throw new NotFoundException(`Periode payroll dengan ID '${periodId}' tidak ditemukan`);
    }

    if (
      period.status !== PayrollPeriodStatus.DRAFT &&
      period.status !== PayrollPeriodStatus.PROCESSING
    ) {
      throw new BadRequestException('Hanya periode berstatus DRAFT atau PROCESSING yang dapat diproses');
    }

    if (period._count.records === 0) {
      throw new BadRequestException('Tidak ada slip gaji dalam periode ini. Generate/kalkulasi payroll terlebih dahulu.');
    }

    const processedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.payrollPeriod.update({
        where: { id: periodId },
        data: {
          status: PayrollPeriodStatus.PROCESSED,
          processedAt,
        },
      }),
      this.prisma.payrollRecord.updateMany({
        where: { payrollPeriodId: periodId },
        data: { status: PayrollRecordStatus.PROCESSED },
      }),
    ]);

    await this.auditService.log({
      action: 'PAYROLL_PROCESSED',
      userId: user.id,
      ipAddress,
      details: `Periode payroll ${period.name} diproses`,
      metadata: { resource: 'PayrollPeriod', resourceId: periodId },
    });

    return {
      success: true,
      message: 'Periode payroll berhasil diproses dan siap untuk pembayaran.',
    };
  }

  /**
   * Finalize and Pay payroll: marks period as PAID, links overtime as payrollProcessed,
   * and dispatches notifications to employees.
   */
  async payPayroll(periodId: string, user: any, ipAddress?: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        records: {
          include: {
            employee: {
              select: { id: true, userId: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException(`Periode payroll dengan ID '${periodId}' tidak ditemukan`);
    }

    if (period.status === PayrollPeriodStatus.PAID) {
      throw new BadRequestException('Periode payroll ini sudah dibayarkan sebelumnya');
    }

    const paidAt = new Date();

    // 1. Update period and all records to PAID
    await this.prisma.$transaction([
      this.prisma.payrollPeriod.update({
        where: { id: periodId },
        data: {
          status: PayrollPeriodStatus.PAID,
          paidAt,
        },
      }),
      this.prisma.payrollRecord.updateMany({
        where: { payrollPeriodId: periodId },
        data: {
          status: PayrollRecordStatus.PAID,
          paidAt,
        },
      }),
    ]);

    // 2. Mark corresponding approved overtime requests as payrollProcessed = true
    const employeeIds = period.records.map((r) => r.employeeId);
    await this.prisma.overtimeRequest.updateMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      data: {
        payrollProcessed: true,
      },
    });

    // 3. Dispatch notifications to employees
    for (const rec of period.records) {
      if (rec.employee.userId) {
        await this.notificationsService.create({
          userId: rec.employee.userId,
          type: 'PAYROLL_PAID',
          title: 'Gaji Telah Dibayarkan',
          message: `Gaji Anda untuk periode ${period.name} sebesar Rp ${Number(rec.netSalary).toLocaleString('id-ID')} telah dibayarkan. Silakan cek slip gaji Anda.`,
          referenceType: 'PAYROLL_RECORD',
          referenceId: rec.id,
          idempotencyKey: `PAYROLL_PAID_${period.id}_${rec.id}`,
        });
      }
    }

    await this.auditService.log({
      action: 'PAYROLL_PAID',
      userId: user.id,
      ipAddress,
      details: `Pembayaran payroll periode ${period.name} diselesaikan`,
      metadata: { resource: 'PayrollPeriod', resourceId: periodId, recordsPaid: period.records.length, periodName: period.name },
    });

    return {
      success: true,
      message: `Pembayaran payroll berhasil diselesaikan untuk ${period.records.length} karyawan.`,
    };
  }

  // ===========================================================================
  // 4. SLIP GAJI & REKOR PAYROLL (RECORDS & IDOR)
  // ===========================================================================

  /**
   * Query payroll records with IDOR scoping and filters.
   */
  async getRecords(query: QueryPayrollRecordDto, user: any) {
    const page = Number(query.page) || 1;
    const limit = Math.min(100, Number(query.limit) || 50);
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollRecordWhereInput = {};
    const employeeWhere: Prisma.EmployeeWhereInput = {};

    // IDOR Protection: EMPLOYEE role can ONLY see their own records
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        throw new ForbiddenException('Profil karyawan tidak ditemukan');
      }
      where.employeeId = user.employee.id;
    } else {
      if (query.employeeId) where.employeeId = query.employeeId;
      if (query.departmentId) employeeWhere.departmentId = query.departmentId;
    }

    if (query.payrollPeriodId) where.payrollPeriodId = query.payrollPeriodId;
    if (query.status) where.status = query.status;

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      employeeWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(employeeWhere).length > 0) {
      where.employee = { is: employeeWhere };
    }

    const [records, total] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        where,
        include: {
          payrollPeriod: {
            select: { id: true, name: true, month: true, year: true, status: true, paidAt: true },
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              position: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ payrollPeriod: { year: 'desc' } }, { payrollPeriod: { month: 'desc' } }],
        skip,
        take: limit,
      }),
      this.prisma.payrollRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single payroll record / slip gaji with IDOR check.
   */
  async getRecord(id: string, user: any) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        employee: {
          include: {
            department: true,
            salary: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Slip gaji dengan ID '${id}' tidak ditemukan`);
    }

    // IDOR Protection
    if (user.role === UserRole.EMPLOYEE) {
      if (record.employeeId !== user.employee?.id) {
        throw new ForbiddenException('Anda tidak memiliki akses ke slip gaji karyawan lain');
      }
    }

    return record;
  }

  /**
   * Adjust allowances/deductions of a draft/processed record before payment (Admin/HR).
   */
  async updateRecord(id: string, dto: UpdatePayrollRecordDto, user: any, ipAddress?: string) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      throw new NotFoundException(`Slip gaji dengan ID '${id}' tidak ditemukan`);
    }

    if (record.status === PayrollRecordStatus.PAID) {
      throw new BadRequestException('Slip gaji yang sudah berstatus PAID tidak dapat diubah');
    }

    const basicSalaryNum = Number(record.basicSalary);
    const overtimePayNum = Number(record.overtimePay);
    const allowancesNum = dto.allowances !== undefined ? dto.allowances : Number(record.allowances);
    const deductionsNum = dto.deductions !== undefined ? dto.deductions : Number(record.deductions);
    const grossSalary = basicSalaryNum + allowancesNum + overtimePayNum;
    const netSalary = Math.max(0, grossSalary - deductionsNum);

    const updated = await this.prisma.payrollRecord.update({
      where: { id },
      data: {
        allowances: new Prisma.Decimal(allowancesNum),
        deductions: new Prisma.Decimal(deductionsNum),
        totalDeductions: new Prisma.Decimal(deductionsNum),
        grossSalary: new Prisma.Decimal(grossSalary),
        netSalary: new Prisma.Decimal(netSalary),
        takeHomePay: new Prisma.Decimal(netSalary),
        notes: dto.notes !== undefined ? dto.notes : record.notes,
      },
    });

    await this.auditService.log({
      action: 'PAYROLL_RECORD_UPDATED',
      userId: user.id,
      ipAddress,
      details: `Slip gaji ${record.employee.firstName} disesuaikan. Gaji bersih baru: Rp ${netSalary.toLocaleString('id-ID')}`,
      metadata: { resource: 'PayrollRecord', resourceId: id, allowances: allowancesNum, deductions: deductionsNum, netSalary },
    });

    return updated;
  }

  // ===========================================================================
  // 5. EXPORT SLIP GAJI PDF
  // ===========================================================================

  /**
   * Export single employee payslip PDF (Employee can download own slip, Admin/HR can download any).
   */
  async exportSinglePayslipPdf(id: string, user: any) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        employee: {
          include: {
            department: true,
            salary: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Slip gaji dengan ID '${id}' tidak ditemukan`);
    }

    // IDOR Protection: Employee can only export own payslip
    if (user.role === UserRole.EMPLOYEE) {
      if (record.employeeId !== user.employee?.id) {
        throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses untuk mengunduh slip gaji karyawan lain');
      }
    }

    const buffer = await this.payrollPdfService.generateSinglePayslipPdf(record);
    const empId = record.employee?.employeeId || 'EMP';
    const periodName = (record.payrollPeriod?.name || 'periode').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `slip-gaji-${empId}-${periodName}.pdf`;

    return { buffer, filename };
  }

  /**
   * Export bulk payslips for an entire period into a multi-page PDF (Admin and HR only).
   */
  async exportBulkPayslipsPdf(periodId: string, user: any) {
    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException('Akses ditolak: Hanya Admin dan HR yang dapat men-generate seluruh slip gaji');
    }

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        records: {
          include: {
            payrollPeriod: true,
            employee: {
              include: {
                department: true,
                salary: true,
              },
            },
          },
          orderBy: { employee: { firstName: 'asc' } },
        },
      },
    });

    if (!period) {
      throw new NotFoundException(`Periode payroll dengan ID '${periodId}' tidak ditemukan`);
    }

    if (!period.records || period.records.length === 0) {
      throw new BadRequestException('Periode ini belum memiliki rekor slip gaji. Jalankan generate payroll terlebih dahulu.');
    }

    const buffer = await this.payrollPdfService.generateBulkPayslipsPdf(period, period.records);
    const periodName = period.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `rekap-semua-slip-gaji-${periodName}.pdf`;

    return { buffer, filename, count: period.records.length };
  }
}
