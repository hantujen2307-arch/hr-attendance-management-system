import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsUUID,
  Matches,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OvertimeStatus } from '@prisma/client';

export class QueryOvertimeDto {
  @ApiPropertyOptional({ description: 'Halaman data (default: 1)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page harus berupa angka integer' })
  @Min(1, { message: 'Page minimal bernilai 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Jumlah data per halaman (default: 20, max: 100)',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit harus berupa angka integer' })
  @Min(1, { message: 'Limit minimal bernilai 1' })
  @Max(100, { message: 'Limit maksimal 100 data per halaman' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan UUID Karyawan',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID karyawan harus berupa UUID valid' })
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan UUID Departemen',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID departemen harus berupa UUID valid' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status pengajuan lembur',
    enum: OvertimeStatus,
  })
  @IsOptional()
  @IsEnum(OvertimeStatus, {
    message: 'Status harus bernilai PENDING, APPROVED, REJECTED, CANCELLED, atau COMPLETED',
  })
  status?: OvertimeStatus;

  @ApiPropertyOptional({
    description: 'Filter tanggal tepat (YYYY-MM-DD)',
    example: '2026-09-20',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal harus YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Filter tanggal awal rentang (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format startDate harus YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter tanggal akhir rentang (YYYY-MM-DD)',
    example: '2026-09-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format endDate harus YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Pencarian nama karyawan, NIP, atau alasan lembur',
    example: 'Budi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Kata kunci pencarian maksimal 100 karakter' })
  search?: string;
}
