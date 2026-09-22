import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-010', description: 'Unique internal employee code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeId: string;

  @ApiProperty({ example: 'Jordan', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Miller', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'jordan.miller@company.com', description: 'Corporate email address' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: 'Department UUID' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiPropertyOptional({ description: 'Shift UUID' })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'User account UUID if linked' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'Full Stack Engineer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  position: string;

  @ApiProperty({ example: '2026-09-01', description: 'Join date in YYYY-MM-DD format' })
  @IsDateString()
  @IsNotEmpty()
  joinDate: string;

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

  @ApiPropertyOptional({ example: 'Password123!', description: 'Initial login password' })
  @IsString()
  @IsOptional()
  initialPassword?: string;

  @ApiPropertyOptional({ default: true, description: 'Whether to provision User login account' })
  @IsOptional()
  createAccount?: boolean;

  @ApiPropertyOptional({ enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  @IsEnum(EmploymentStatus)
  @IsOptional()
  employmentStatus?: EmploymentStatus;
}
