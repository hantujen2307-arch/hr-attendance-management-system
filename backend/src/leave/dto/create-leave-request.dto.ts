import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveRequestStatus } from '@prisma/client';

export class CreateLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Employee UUID (auto-populated for employee users)' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiProperty({ description: 'Leave Type UUID (e.g. Annual Leave, Sick Leave)' })
  @IsUUID()
  @IsNotEmpty()
  leaveTypeId: string;

  @ApiProperty({ example: '2026-09-22', description: 'Start date in YYYY-MM-DD' })
  @IsNotEmpty({ message: 'Tanggal mulai wajib diisi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal mulai harus YYYY-MM-DD' })
  @IsDateString({}, { message: 'Tanggal mulai harus berupa tanggal yang valid (YYYY-MM-DD)' })
  startDate: string;

  @ApiProperty({ example: '2026-09-22', description: 'End date in YYYY-MM-DD' })
  @IsNotEmpty({ message: 'Tanggal selesai wajib diisi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal selesai harus YYYY-MM-DD' })
  @IsDateString({}, { message: 'Tanggal selesai harus berupa tanggal yang valid (YYYY-MM-DD)' })
  endDate: string;

  @ApiPropertyOptional({ example: 5, description: 'Duration in workdays (auto-calculated by server if omitted)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: 'Family vacation and personal travel', description: 'Reason for leave application' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ enum: LeaveRequestStatus, default: LeaveRequestStatus.PENDING })
  @IsEnum(LeaveRequestStatus)
  @IsOptional()
  status?: LeaveRequestStatus;
}
