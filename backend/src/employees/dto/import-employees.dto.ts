import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportEmployeeRowDto {
  fullName: string;
  employeeId: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  joinDate: string;
  status?: string;
  address?: string;
}

export class ImportEmployeesDto {
  @ApiPropertyOptional({ description: 'Raw CSV text content' })
  @IsString()
  @IsOptional()
  csvContent?: string;

  @ApiPropertyOptional({ description: 'Structured employee rows array' })
  @IsArray()
  @IsOptional()
  rows?: ImportEmployeeRowDto[];
}
