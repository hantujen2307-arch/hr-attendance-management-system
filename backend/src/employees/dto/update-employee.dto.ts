import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Jordan' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Miller' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'jordan.miller@company.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Shift UUID' })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'User account UUID if linked' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'Senior Staff Engineer' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  position?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsDateString()
  @IsOptional()
  joinDate?: string;

  @ApiPropertyOptional({ example: 'EMP-010' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Profile avatar photo URL or Base64 data' })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiPropertyOptional({ description: 'Residential home address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '1995-05-20', description: 'Date of birth in YYYY-MM-DD format' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsEnum(EmploymentStatus)
  @IsOptional()
  employmentStatus?: EmploymentStatus;
}
