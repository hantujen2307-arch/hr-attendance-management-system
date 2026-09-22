import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get live dashboard summary metrics (company-wide for Admin/HR, personal for Employee)' })
  @ApiResponse({ status: 200, description: 'Aggregated dashboard metrics' })
  getSummary(@CurrentUser() user: any) {
    return this.dashboardService.getSummary(user);
  }

  @Get('attendance-overview')
  @ApiOperation({ summary: 'Get attendance trend counts grouped by date across a date range' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Daily attendance statistics trend' })
  getAttendanceOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any
  ) {
    return this.dashboardService.getAttendanceOverview(startDate, endDate, user);
  }

  @Get('recent-attendance')
  @ApiOperation({ summary: 'Get recent attendance logs feed' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recent logs to fetch (default 10)' })
  @ApiResponse({ status: 200, description: 'Recent attendance logs' })
  getRecentAttendance(
    @Query('limit') limit?: number,
    @CurrentUser() user?: any
  ) {
    return this.dashboardService.getRecentAttendance(limit ? Number(limit) : 10, user);
  }
}
