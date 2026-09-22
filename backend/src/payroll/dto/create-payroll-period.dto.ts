import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsString,
  Matches,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayrollPeriodDto {
  @ApiProperty({
    description: 'Nama periode penggajian',
    example: 'Gaji Bulan November 2026',
  })
  @IsNotEmpty({ message: 'Nama periode payroll wajib diisi' })
  @IsString()
  @MaxLength(100, { message: 'Nama periode maksimal 100 karakter' })
  name: string;

  @ApiProperty({
    description: 'Bulan penggajian (1 - 12)',
    example: 11,
  })
  @IsNotEmpty({ message: 'Bulan payroll wajib diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Bulan harus berupa angka' })
  @Min(1, { message: 'Bulan minimal 1' })
  @Max(12, { message: 'Bulan maksimal 12' })
  month: number;

  @ApiProperty({
    description: 'Tahun penggajian',
    example: 2026,
  })
  @IsNotEmpty({ message: 'Tahun payroll wajib diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Tahun harus berupa angka' })
  @Min(2020, { message: 'Tahun minimal 2020' })
  @Max(2100, { message: 'Tahun maksimal 2100' })
  year: number;

  @ApiProperty({
    description: 'Tanggal awal perhitungan absensi & lembur (YYYY-MM-DD)',
    example: '2026-11-01',
  })
  @IsNotEmpty({ message: 'Tanggal awal cut-off wajib diisi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal awal harus YYYY-MM-DD' })
  startDate: string;

  @ApiProperty({
    description: 'Tanggal akhir perhitungan absensi & lembur (YYYY-MM-DD)',
    example: '2026-11-30',
  })
  @IsNotEmpty({ message: 'Tanggal akhir cut-off wajib diisi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal akhir harus YYYY-MM-DD' })
  endDate: string;

  @ApiPropertyOptional({
    description: 'Catatan tambahan periode penggajian',
    example: 'Periode reguler bulan November',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}
