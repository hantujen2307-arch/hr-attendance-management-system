import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get recent system audit logs (Admin & HR only)' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  findAll(@Query('limit') limit?: number) {
    const take = limit ? Math.min(100, Math.max(1, Number(limit))) : 50;
    return this.auditService.findAll(take);
  }
}
