import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollRecordStatus } from '@prisma/client';

export class QueryPayrollRecordDto {
  @ApiPropertyOptional({ description: 'Filter berdasarkan ID periode payroll (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'ID periode harus berupa UUID v4 yang valid' })
  payrollPeriodId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID karyawan (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'ID karyawan harus berupa UUID v4 yang valid' })
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID departemen (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'ID departemen harus berupa UUID v4 yang valid' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status',
    enum: PayrollRecordStatus,
  })
  @IsOptional()
  @IsEnum(PayrollRecordStatus, { message: 'Status tidak valid' })
  status?: PayrollRecordStatus;

  @ApiPropertyOptional({ description: 'Pencarian nama atau NIP karyawan' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Halaman data (default: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman (default: 50, max: 100)', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
