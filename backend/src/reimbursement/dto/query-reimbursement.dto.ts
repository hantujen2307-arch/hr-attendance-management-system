import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReimbursementCategory, ReimbursementStatus } from '@prisma/client';

export class QueryReimbursementDto {
  @ApiPropertyOptional({
    enum: ReimbursementStatus,
    description: 'Filter status pengajuan',
  })
  @IsOptional()
  @IsEnum(ReimbursementStatus)
  status?: ReimbursementStatus;

  @ApiPropertyOptional({
    enum: ReimbursementCategory,
    description: 'Filter kategori biaya',
  })
  @IsOptional()
  @IsEnum(ReimbursementCategory)
  category?: ReimbursementCategory;

  @ApiPropertyOptional({ description: 'Filter karyawan spesifik (UUID)' })
  @IsOptional()
  @IsUUID('4')
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter departemen karyawan (UUID)' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Tanggal awal transaksi (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format startDate harus YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir transaksi (YYYY-MM-DD)',
    example: '2026-09-30',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format endDate harus YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Pencarian no klaim, deskripsi, atau nama karyawan' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, description: 'Halaman data (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, description: 'Batas baris per halaman (maksimal 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
