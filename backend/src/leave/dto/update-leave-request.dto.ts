import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveRequestStatus } from '@prisma/client';

export class UpdateLeaveRequestDto {
  @ApiPropertyOptional({ enum: LeaveRequestStatus, description: 'Approval status: APPROVED, REJECTED, PENDING' })
  @IsEnum(LeaveRequestStatus)
  @IsOptional()
  status?: LeaveRequestStatus;

  @ApiPropertyOptional({ description: 'User UUID of the manager or HR who approved/rejected' })
  @IsUUID()
  @IsOptional()
  approvedBy?: string;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  approvedAt?: string;

  @ApiPropertyOptional({ example: 'Review notes or reason update' })
  @IsString()
  @IsOptional()
  reason?: string;
}
