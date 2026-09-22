import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Ip,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { UpsertSalaryDto } from './dto/upsert-salary.dto';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollPeriodDto } from './dto/update-payroll-period.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { QueryPayrollRecordDto } from './dto/query-payroll.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payroll Management')
@ApiBearerAuth('JWT-auth')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // -------------------------------------------------------------
  // 1. MASTER GAJI (SALARY SETTING)
  // -------------------------------------------------------------

  @Get('salaries')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get all employees master salaries (ADMIN and HR only)' })
  @ApiResponse({ status: 200, description: 'List of employees with salary configuration' })
  getSalaries() {
    return this.payrollService.getSalaries();
  }

  @Get('salaries/:employeeId')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get employee master salary setting by employee ID (ADMIN and HR only)' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee salary details' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getSalary(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getSalary(employeeId, user);
  }

  @Post('salaries')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Create or update employee master salary setting via body (ADMIN and HR only)' })
  @ApiResponse({ status: 201, description: 'Salary settings saved' })
  createOrUpdateSalary(
    @Body() dto: UpsertSalaryDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    if (!dto.employeeId) {
      throw new BadRequestException('employeeId wajib disertakan');
    }
    return this.payrollService.upsertSalary(dto.employeeId, dto, user, ipAddress);
  }

  @Put('salaries/:employeeId')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Create or update employee master salary setting (ADMIN and HR only)' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Salary settings saved' })
  upsertSalary(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpsertSalaryDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.upsertSalary(employeeId, dto, user, ipAddress);
  }

  // -------------------------------------------------------------
  // 2. PERIODE PAYROLL
  // -------------------------------------------------------------

  @Get('periods')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'List all payroll periods (ADMIN and HR only)' })
  @ApiResponse({ status: 200, description: 'List of payroll periods' })
  getPeriods() {
    return this.payrollService.getPeriods();
  }

  @Get('periods/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get payroll period details with summary calculation (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Payroll period details and records' })
  getPeriod(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.getPeriod(id);
  }

  @Post('periods')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Create a new monthly payroll period (ADMIN and HR only)' })
  @ApiResponse({ status: 201, description: 'Payroll period created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Period for month/year already exists' })
  createPeriod(
    @Body() dto: CreatePayrollPeriodDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.createPeriod(dto, user, ipAddress);
  }

  @Patch('periods/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update draft payroll period (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Payroll period updated' })
  updatePeriod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollPeriodDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.updatePeriod(id, dto, user, ipAddress);
  }

  @Delete('periods/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Delete draft payroll period (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Payroll period deleted' })
  deletePeriod(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.deletePeriod(id, user, ipAddress);
  }

  // -------------------------------------------------------------
  // 3. ENGINE KALKULASI & STATUS TRANSITIONS
  // -------------------------------------------------------------

  @Post('periods/:id/calculate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Calculate payroll from attendance, leave, and overtime (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Payroll records calculated' })
  calculatePayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.calculatePayroll(id, user, ipAddress);
  }

  @Post('periods/:id/generate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Generate payroll calculation from attendance, leave, and overtime (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Payroll records generated' })
  generatePayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.generatePayroll(id, user, ipAddress);
  }

  @Post('periods/:id/process')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Process payroll period (transition status to PROCESSED)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Payroll period processed' })
  processPayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.processPayroll(id, user, ipAddress);
  }

  @Post('periods/:id/pay')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Finalize and pay payroll period (transition to PAID and notify employees)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Payroll finalized and paid' })
  payPayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.payPayroll(id, user, ipAddress);
  }

  // -------------------------------------------------------------
  // 4. SLIP GAJI & REKOR PAYROLL
  // -------------------------------------------------------------

  @Get('records')
  @ApiOperation({ summary: 'Query payroll records (Employees scoped to own records, Admin/HR see all)' })
  @ApiResponse({ status: 200, description: 'Paginated list of payroll records' })
  getRecords(
    @Query() query: QueryPayrollRecordDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getRecords(query, user);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get single payroll record / slip gaji by ID' })
  @ApiParam({ name: 'id', description: 'Payroll Record UUID' })
  @ApiResponse({ status: 200, description: 'Detailed payroll slip' })
  @ApiResponse({ status: 403, description: 'Forbidden (IDOR protection)' })
  getRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getRecord(id, user);
  }

  @Patch('records/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Adjust allowances/deductions of a draft/processed payroll record (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Payroll Record UUID' })
  @ApiResponse({ status: 200, description: 'Payroll record updated' })
  updateRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollRecordDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.payrollService.updateRecord(id, dto, user, ipAddress);
  }

  // -------------------------------------------------------------
  // 5. EXPORT SLIP GAJI PDF
  // -------------------------------------------------------------

  @Get('records/:id/pdf')
  @ApiOperation({ summary: 'Download single payslip PDF (Employee can download own slip, Admin/HR can download any)' })
  @ApiParam({ name: 'id', description: 'Payroll Record UUID' })
  @ApiResponse({ status: 200, description: 'Binary PDF file' })
  @ApiResponse({ status: 403, description: 'Forbidden: IDOR protection' })
  async downloadSinglePayslipPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.payrollService.exportSinglePayslipPdf(id, user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('periods/:id/pdf')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Generate and download bulk PDF for all employee payslips in a period (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Payroll Period UUID' })
  @ApiResponse({ status: 200, description: 'Binary multi-page PDF file' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async downloadBulkPayslipsPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.payrollService.exportBulkPayslipsPdf(id, user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
