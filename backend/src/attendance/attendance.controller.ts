import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@ApiTags('Attendance')
@ApiBearerAuth('JWT-auth')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Employee self check-in with GPS location and selfie photo' })
  @ApiResponse({ status: 201, description: 'Check-in recorded successfully' })
  @ApiResponse({ status: 400, description: 'User not associated with an employee or outside allowed radius' })
  @ApiResponse({ status: 409, description: 'Already checked in for today' })
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: any) {
    return this.attendanceService.checkIn(user, dto);
  }

  @Patch('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Employee self check-out with GPS location and selfie photo (PATCH)' })
  @ApiResponse({ status: 200, description: 'Check-out recorded successfully' })
  @ApiResponse({ status: 400, description: 'Outside allowed radius or invalid timestamps' })
  @ApiResponse({ status: 404, description: 'No active check-in found for today' })
  @ApiResponse({ status: 409, description: 'Already checked out for today' })
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: any) {
    return this.attendanceService.checkOut(user, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Employee self check-out with GPS location and selfie photo (POST alias)' })
  @ApiResponse({ status: 200, description: 'Check-out recorded successfully' })
  checkOutPost(@Body() dto: CheckOutDto, @CurrentUser() user: any) {
    return this.attendanceService.checkOut(user, dto);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today attendance summary (all employees for Admin/HR, self status for Employee)' })
  @ApiResponse({ status: 200, description: 'Today summary metrics and self record' })
  getTodaySummary(@CurrentUser() user: any) {
    return this.attendanceService.getTodaySummary(user);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated attendance records with search, filter, and role scoping' })
  @ApiResponse({ status: 200, description: 'Paginated attendance records' })
  findAll(@Query() query: QueryAttendanceDto, @CurrentUser() user: any) {
    return this.attendanceService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiParam({ name: 'id', description: 'Attendance UUID' })
  @ApiResponse({ status: 200, description: 'Attendance details' })
  @ApiResponse({ status: 403, description: 'Forbidden (employee viewing another staff record)' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.attendanceService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Manual attendance log creation (ADMIN & HR only)' })
  @ApiResponse({ status: 201, description: 'Attendance record created' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid date/time' })
  @ApiResponse({ status: 409, description: 'Record already exists for employee on this date' })
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Manual attendance log update (ADMIN & HR only)' })
  @ApiParam({ name: 'id', description: 'Attendance UUID' })
  @ApiResponse({ status: 200, description: 'Attendance record updated' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid timestamps' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: any
  ) {
    return this.attendanceService.update(id, dto, user);
  }
}
