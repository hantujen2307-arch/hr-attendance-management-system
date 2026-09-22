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
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReimbursementService } from './reimbursement.service';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { UpdateReimbursementDto } from './dto/update-reimbursement.dto';
import { ApproveReimbursementDto } from './dto/approve-reimbursement.dto';
import { RejectReimbursementDto } from './dto/reject-reimbursement.dto';
import { QueryReimbursementDto } from './dto/query-reimbursement.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reimbursement Management')
@ApiBearerAuth('JWT-auth')
@Controller('reimbursements')
export class ReimbursementController {
  constructor(private readonly reimbursementService: ReimbursementService) {}

  @Post()
  @ApiOperation({ summary: 'Submit new reimbursement request' })
  @ApiResponse({ status: 201, description: 'Reimbursement request created' })
  @ApiResponse({ status: 400, description: 'Validation or magic bytes error' })
  create(
    @Body() dto: CreateReimbursementDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.reimbursementService.create(dto, user, ipAddress);
  }

  @Get()
  @ApiOperation({ summary: 'List reimbursement requests (Scoped to employee for EMPLOYEE role)' })
  @ApiResponse({ status: 200, description: 'Paginated list of reimbursement requests' })
  findAll(@Query() query: QueryReimbursementDto, @CurrentUser() user: any) {
    return this.reimbursementService.findAll(query, user);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get summary statistics of reimbursement requests' })
  @ApiResponse({ status: 200, description: 'Aggregated metrics' })
  getSummary(@CurrentUser() user: any) {
    return this.reimbursementService.getSummary(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single reimbursement request details' })
  @ApiParam({ name: 'id', description: 'Reimbursement UUID' })
  @ApiResponse({ status: 200, description: 'Reimbursement details' })
  @ApiResponse({ status: 403, description: 'Forbidden (IDOR protection)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.reimbursementService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update reimbursement request (Only if DRAFT or SUBMITTED)' })
  @ApiParam({ name: 'id', description: 'Reimbursement UUID' })
  @ApiResponse({ status: 200, description: 'Reimbursement updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReimbursementDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.reimbursementService.update(id, dto, user, ipAddress);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel reimbursement request (By owner employee)' })
  @ApiParam({ name: 'id', description: 'Reimbursement UUID' })
  @ApiResponse({ status: 200, description: 'Reimbursement cancelled' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.reimbursementService.cancel(id, user, ipAddress);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Approve reimbursement request (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Reimbursement UUID' })
  @ApiResponse({ status: 200, description: 'Reimbursement approved' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReimbursementDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.reimbursementService.approve(id, dto, user, ipAddress);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Reject reimbursement request (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Reimbursement UUID' })
  @ApiResponse({ status: 200, description: 'Reimbursement rejected' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReimbursementDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.reimbursementService.reject(id, dto, user, ipAddress);
  }

  @Patch(':id/pay')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Mark reimbursement as PAID (disbursed) (ADMIN and HR only)' })
  @ApiParam({ name: 'id', description: 'Reimbursement UUID' })
  @ApiResponse({ status: 200, description: 'Reimbursement marked as paid' })
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.reimbursementService.markPaid(id, user, ipAddress);
  }
}
