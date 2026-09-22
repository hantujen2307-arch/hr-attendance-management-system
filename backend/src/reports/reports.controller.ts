import { Controller, Get, Query, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { QueryAttendanceReportDto } from './dto/query-attendance-report.dto';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports & Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get comprehensive HR analytics across all 9 pillars with role scoping' })
  @ApiResponse({ status: 200, description: 'Comprehensive organizational or personal HR analytics' })
  getComprehensiveAnalytics(
    @Query() query: QueryAnalyticsDto,
    @CurrentUser() user: any
  ) {
    return this.reportsService.getComprehensiveAnalytics(query, user);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get paginated attendance report with multi-filter criteria and summary totals' })
  @ApiResponse({ status: 200, description: 'Filtered attendance report with summary' })
  getAttendanceReport(
    @Query() query: QueryAttendanceReportDto,
    @CurrentUser() user: any
  ) {
    return this.reportsService.getAttendanceReport(query, user);
  }

  @Get('recap')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get monthly attendance recap per employee (Hadir, Terlambat, Izin, Sakit, Dinas, Cuti, Alpha)' })
  @ApiResponse({ status: 200, description: 'Monthly attendance recap summary' })
  getAttendanceRecap(
    @Query('month') month?: number,
    @Query('year') year?: number,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('position') position?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any
  ) {
    return this.reportsService.getAttendanceRecap(
      {
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        employeeId,
        departmentId,
        position,
        status,
        search,
      },
      user
    );
  }

  @Get('recap/export')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Export monthly attendance recap per employee as downloadable CSV/Excel file' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportRecapCsv(
    @Query('month') month?: number,
    @Query('year') year?: number,
    @Query('departmentId') departmentId?: string,
    @Query('position') position?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
    @Res() res?: Response
  ) {
    const csvContent = await this.reportsService.exportRecapCsv(
      {
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        departmentId,
        position,
        search,
      },
      user
    );
    const dateStr = new Date().toISOString().split('T')[0];

    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', `attachment; filename="attendance-monthly-recap-${dateStr}.csv"`);
    return res!.status(200).send(Buffer.from(csvContent, 'utf-8'));
  }

  @Get('departments')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get aggregated attendance metrics grouped by department' })
  @ApiResponse({ status: 200, description: 'Department-level attendance breakdown' })
  getDepartmentRecap(
    @Query() query: QueryAttendanceReportDto,
    @CurrentUser() user: any
  ) {
    return this.reportsService.getDepartmentRecap(query, user);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get daily attendance trend counts across the date range' })
  @ApiResponse({ status: 200, description: 'Daily trendline statistics' })
  getAttendanceTrend(
    @Query() query: QueryAttendanceReportDto,
    @CurrentUser() user: any
  ) {
    return this.reportsService.getAttendanceTrend(query, user);
  }

  @Get('attendance/export')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Export filtered attendance report as downloadable CSV/Excel file' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportAttendanceCsv(
    @Query() query: QueryAttendanceReportDto,
    @CurrentUser() user: any,
    @Res() res: Response
  ) {
    const csvContent = await this.reportsService.exportAttendanceCsv(query, user);
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${dateStr}.csv"`);
    return res.status(200).send(Buffer.from(csvContent, 'utf-8'));
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get individual employee attendance and productivity statistics' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Employee analytics report' })
  @ApiResponse({ status: 403, description: 'Forbidden if Employee views another staff report' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  getEmployeeReport(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any
  ) {
    return this.reportsService.getEmployeeReport(employeeId, startDate, endDate, user);
  }

  @Get('overtime')
  @ApiOperation({ summary: 'Get detailed overtime report with filtering and totals' })
  @ApiResponse({ status: 200, description: 'Filtered overtime report with summary' })
  getOvertimeReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any
  ) {
    return this.reportsService.getOvertimeReport(
      { startDate, endDate, employeeId, departmentId, status, search },
      user
    );
  }

  @Get('overtime/export')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Export overtime report as downloadable CSV file' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportOvertimeCsv(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
    @Res() res?: Response
  ) {
    const csvContent = await this.reportsService.exportOvertimeCsv(
      { startDate, endDate, employeeId, departmentId, status, search },
      user
    );
    const dateStr = new Date().toISOString().split('T')[0];

    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', `attachment; filename="overtime-report-${dateStr}.csv"`);
    return res!.status(200).send(Buffer.from(csvContent, 'utf-8'));
  }
}
