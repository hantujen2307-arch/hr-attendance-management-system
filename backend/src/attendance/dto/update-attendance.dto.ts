import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @ApiPropertyOptional({ example: '2026-09-17T07:15:00.000Z' })
  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @ApiPropertyOptional({ example: '2026-09-17T15:45:00.000Z' })
  @IsDateString()
  @IsOptional()
  checkOut?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @ApiPropertyOptional({ example: 495 })
  @IsInt()
  @Min(0)
  @IsOptional()
  workingMinutes?: number;

  @ApiPropertyOptional({ example: 'Adjusted overtime' })
  @IsString()
  @IsOptional()
  notes?: string;
}
