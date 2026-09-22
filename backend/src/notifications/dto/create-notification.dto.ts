import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target user UUID' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'LEAVE_SUBMITTED', description: 'Notification category type' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @ApiProperty({ example: 'Pengajuan Cuti Baru', description: 'Notification header title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'Andi mengajukan cuti 3 hari', description: 'Detailed notification content' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'LEAVE_REQUEST', description: 'Associated domain entity type' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ example: '7d722421-4f10-41be-94e8-2831db2ffea4', description: 'Entity reference ID' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceId?: string;

  @ApiPropertyOptional({ example: 'ATTENDANCE_REMINDER_emp1_2026-09-20', description: 'Unique idempotency key to prevent duplicates' })
  @IsString()
  @IsOptional()
  @MaxLength(191)
  idempotencyKey?: string;
}
