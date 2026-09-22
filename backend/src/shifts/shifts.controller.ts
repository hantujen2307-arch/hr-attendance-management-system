import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { UpdateEmployeeScheduleDto } from './dto/update-employee-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Shifts')
@ApiBearerAuth('JWT-auth')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get all shifts with employee and schedule counts' })
  @ApiResponse({ status: 200, description: 'List of all master shifts' })
  findAll() {
    return this.shiftsService.findAll();
  }

  @Get('assignments')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get all employee shift schedules with filter & pagination' })
  @ApiResponse({ status: 200, description: 'List of employee shift schedules' })
  findAllSchedules(@Query() query: QueryScheduleDto) {
    return this.shiftsService.findAllSchedules(query);
  }

  @Get('my-schedule')
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get active shift schedule for the authenticated employee' })
  @ApiResponse({ status: 200, description: 'Active shift details for current user' })
  getMySchedule(@Req() req: any) {
    return this.shiftsService.getMySchedule(req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get shift details by ID' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift details' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Create a new shift schedule' })
  @ApiResponse({ status: 201, description: 'Shift created successfully' })
  @ApiResponse({ status: 409, description: 'Shift name or code already exists' })
  create(@Body() dto: CreateShiftDto, @Req() req: any) {
    return this.shiftsService.create(dto, req.user);
  }

  @Post('assign')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a shift to an employee' })
  @ApiResponse({ status: 200, description: 'Shift assigned successfully' })
  @ApiResponse({ status: 400, description: 'Schedule conflict or invalid input' })
  @ApiResponse({ status: 404, description: 'Shift or employee not found' })
  assign(@Body() dto: AssignShiftDto, @Req() req: any) {
    return this.shiftsService.assignShift(dto, req.user);
  }

  @Patch('assignments/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update an existing employee schedule' })
  @ApiParam({ name: 'id', description: 'EmployeeSchedule UUID' })
  updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeScheduleDto,
    @Req() req: any
  ) {
    return this.shiftsService.updateSchedule(id, dto, req.user);
  }

  @Delete('assignments/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Delete an employee schedule assignment' })
  @ApiParam({ name: 'id', description: 'EmployeeSchedule UUID' })
  removeSchedule(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.shiftsService.removeSchedule(id, req.user);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Soft deactivate a shift' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.shiftsService.deactivate(id, req.user);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Re-activate a shift' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.shiftsService.activate(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update an existing shift' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift updated successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftDto,
    @Req() req: any
  ) {
    return this.shiftsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete or deactivate shift by ID' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift deleted or deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.shiftsService.remove(id, req.user);
  }
}
