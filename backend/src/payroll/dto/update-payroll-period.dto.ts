import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdatePayrollPeriodDto {
  @ApiPropertyOptional({
    description: 'Nama periode penggajian',
    example: 'Gaji Bulan November 2026 (Revisi)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nama periode maksimal 100 karakter' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Tanggal awal perhitungan absensi & lembur (YYYY-MM-DD)',
    example: '2026-11-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal awal harus YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir perhitungan absensi & lembur (YYYY-MM-DD)',
    example: '2026-11-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal akhir harus YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Catatan tambahan periode penggajian',
    example: 'Pembaruan data cut-off lembur',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}
