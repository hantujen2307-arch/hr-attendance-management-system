import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeRequestDto } from './dto/create-overtime-request.dto';
import { UpdateOvertimeRequestDto } from './dto/update-overtime-request.dto';
import { QueryOvertimeDto } from './dto/query-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Overtime Management')
@ApiBearerAuth('JWT-auth')
@Controller('overtime')
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new overtime request' })
  @ApiResponse({ status: 201, description: 'Overtime request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or leave conflict' })
  @ApiResponse({ status: 409, description: 'Overlapping overtime request detected' })
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateOvertimeRequestDto,
    @Ip() ipAddress: string,
  ) {
    return this.overtimeService.create(dto, user, ipAddress);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated overtime requests list with filters' })
  @ApiResponse({ status: 200, description: 'List of overtime requests' })
  findAll(
    @Query() query: QueryOvertimeDto,
    @CurrentUser() user: any,
  ) {
    return this.overtimeService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get overtime request details by ID' })
  @ApiParam({ name: 'id', description: 'Overtime Request UUID' })
  @ApiResponse({ status: 200, description: 'Overtime request details' })
  @ApiResponse({ status: 403, description: 'Forbidden (IDOR protection)' })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.overtimeService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pending overtime request details' })
  @ApiParam({ name: 'id', description: 'Overtime Request UUID' })
  @ApiResponse({ status: 200, description: 'Overtime request updated' })
  @ApiResponse({ status: 400, description: 'Invalid state or duration' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOvertimeRequestDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.overtimeService.update(id, dto, user, ipAddress);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel pending overtime request' })
  @ApiParam({ name: 'id', description: 'Overtime Request UUID' })
  @ApiResponse({ status: 200, description: 'Overtime request cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel non-pending request' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.overtimeService.cancel(id, user, ipAddress);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Approve overtime request (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Overtime Request UUID' })
  @ApiResponse({ status: 200, description: 'Overtime request approved' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveOvertimeDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.overtimeService.approve(id, dto, user, ipAddress);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Reject overtime request with reason (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Overtime Request UUID' })
  @ApiResponse({ status: 200, description: 'Overtime request rejected' })
  @ApiResponse({ status: 400, description: 'Missing rejection reason' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Overtime request not found' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectOvertimeDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.overtimeService.reject(id, dto, user, ipAddress);
  }
}
