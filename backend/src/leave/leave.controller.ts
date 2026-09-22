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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveRequestStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Leave Management')
@ApiBearerAuth('JWT-auth')
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  @ApiOperation({ summary: 'Get all leave requests with optional filters' })
  @ApiQuery({ name: 'status', enum: LeaveRequestStatus, required: false, description: 'Filter by approval status' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee UUID' })
  @ApiQuery({ name: 'leaveTypeId', required: false, description: 'Filter by leave type UUID' })
  @ApiResponse({ status: 200, description: 'List of leave requests' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: LeaveRequestStatus,
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    // If EMPLOYEE, strictly view only their own leave requests
    let effectiveEmployeeId = employeeId;
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        return [];
      }
      effectiveEmployeeId = user.employee.id;
    }

    return this.leaveService.findAll({ status, employeeId: effectiveEmployeeId, leaveTypeId });
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all available leave categories' })
  @ApiResponse({ status: 200, description: 'List of leave types' })
  findAllTypes() {
    return this.leaveService.findAllLeaveTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave request details by ID' })
  @ApiParam({ name: 'id', description: 'Leave Request UUID' })
  @ApiResponse({ status: 200, description: 'Leave request details' })
  @ApiResponse({ status: 403, description: 'Forbidden (IDOR protection)' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.leaveService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a new leave request' })
  @ApiResponse({ status: 201, description: 'Leave request submitted' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Employee or leave type not found' })
  create(@CurrentUser() user: any, @Body() dto: CreateLeaveRequestDto) {
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        throw new ForbiddenException('Akun pengguna tidak memiliki data profil karyawan yang valid');
      }
      dto.employeeId = user.employee.id;
      dto.status = LeaveRequestStatus.PENDING;
    }
    return this.leaveService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Approve, reject, or update a leave request (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Leave Request UUID' })
  @ApiResponse({ status: 200, description: 'Leave request updated' })
  @ApiResponse({ status: 403, description: 'Forbidden. Employees cannot approve leave requests' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeaveRequestDto, @CurrentUser() user: any) {
    return this.leaveService.update(id, dto, user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Approve a leave request (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Leave Request UUID' })
  @ApiResponse({ status: 200, description: 'Leave request approved' })
  @ApiResponse({ status: 403, description: 'Forbidden. Employees cannot approve leave requests' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.leaveService.approve(id, user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Reject a leave request (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Leave Request UUID' })
  @ApiResponse({ status: 200, description: 'Leave request rejected' })
  @ApiResponse({ status: 403, description: 'Forbidden. Employees cannot reject leave requests' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.leaveService.reject(id, user, body?.reason);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending leave request (Employee owner or Admin/HR)' })
  @ApiParam({ name: 'id', description: 'Leave Request UUID' })
  @ApiResponse({ status: 200, description: 'Leave request cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel non-pending leave request' })
  @ApiResponse({ status: 403, description: 'Forbidden: IDOR protection' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.leaveService.cancel(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/Cancel a pending leave request' })
  @ApiParam({ name: 'id', description: 'Leave Request UUID' })
  @ApiResponse({ status: 200, description: 'Leave request cancelled' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.leaveService.cancel(id, user);
  }
}
