import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
  @ApiProperty({ description: 'Employee UUID' })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: '2026-09-17', description: 'Attendance log date in YYYY-MM-DD' })
  @IsDateString()
  @IsNotEmpty()
  attendanceDate: string;

  @ApiPropertyOptional({ example: '2026-09-17T07:00:00.000Z', description: 'Clock in timestamp' })
  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @ApiPropertyOptional({ example: '2026-09-17T15:30:00.000Z', description: 'Clock out timestamp' })
  @IsDateString()
  @IsOptional()
  checkOut?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @ApiPropertyOptional({ example: 480, description: 'Recorded work duration in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  workingMinutes?: number;

  @ApiPropertyOptional({ example: 'Morning shift coverage' })
  @IsString()
  @IsOptional()
  notes?: string;
}
