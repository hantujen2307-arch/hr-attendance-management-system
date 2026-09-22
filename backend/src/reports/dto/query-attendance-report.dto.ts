import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class QueryAttendanceReportDto {
  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by Department UUID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by Employee UUID' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, description: 'Filter by Attendance Status' })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page (max 100)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by employee name or employee ID / NIP' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by month (1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ description: 'Filter by year (e.g. 2026)' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Filter by job position / title' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ description: 'Field to sort by: attendanceDate, name, checkIn, checkOut, status' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction: asc or desc' })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
