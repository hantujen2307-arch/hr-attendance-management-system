import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSalaryDto {
  @ApiPropertyOptional({
    description: 'Target Employee UUID (required if calling POST /payroll/salaries without URL param)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'employeeId harus berupa UUID valid' })
  employeeId?: string;

  @ApiProperty({
    description: 'Gaji Pokok bulanan karyawan (IDR)',
    example: 7500000,
  })
  @IsNotEmpty({ message: 'Gaji pokok wajib diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Gaji pokok harus berupa angka' })
  @Min(0, { message: 'Gaji pokok tidak boleh negatif' })
  basicSalary: number;

  @ApiPropertyOptional({
    description: 'Total tunjangan (IDR)',
    example: 1200000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tunjangan harus berupa angka' })
  @Min(0, { message: 'Tunjangan tidak boleh negatif' })
  allowances?: number;

  @ApiPropertyOptional({
    description: 'Tunjangan Tetap (IDR)',
    example: 500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tunjangan tetap harus berupa angka' })
  @Min(0, { message: 'Tunjangan tetap tidak boleh negatif' })
  fixedAllowance?: number;

  @ApiPropertyOptional({
    description: 'Tunjangan Transport (IDR)',
    example: 300000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tunjangan transport harus berupa angka' })
  @Min(0, { message: 'Tunjangan transport tidak boleh negatif' })
  transportAllowance?: number;

  @ApiPropertyOptional({
    description: 'Tunjangan Makan (IDR)',
    example: 400000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tunjangan makan harus berupa angka' })
  @Min(0, { message: 'Tunjangan makan tidak boleh negatif' })
  mealAllowance?: number;

  @ApiPropertyOptional({
    description: 'Total potongan (IDR)',
    example: 250000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Potongan harus berupa angka' })
  @Min(0, { message: 'Potongan tidak boleh negatif' })
  deductions?: number;

  @ApiPropertyOptional({
    description: 'Potongan Tetap (IDR)',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Potongan tetap harus berupa angka' })
  @Min(0, { message: 'Potongan tetap tidak boleh negatif' })
  fixedDeduction?: number;

  @ApiPropertyOptional({
    description: 'Potongan BPJS Ketenagakerjaan / Kesehatan (IDR)',
    example: 150000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Potongan BPJS harus berupa angka' })
  @Min(0, { message: 'Potongan BPJS tidak boleh negatif' })
  bpjsDeduction?: number;

  @ApiPropertyOptional({
    description: 'Potongan Pajak PPh 21 (opsional) (IDR)',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Potongan pajak harus berupa angka' })
  @Min(0, { message: 'Potongan pajak tidak boleh negatif' })
  taxDeduction?: number;

  @ApiPropertyOptional({
    description: 'Tarif upah lembur per jam khusus karyawan ini (IDR). Jika kosong, menggunakan formula standar (Gaji Pokok / 173).',
    example: 45000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tarif lembur per jam harus berupa angka' })
  @Min(0, { message: 'Tarif lembur tidak boleh negatif' })
  overtimeRatePerHour?: number;

  @ApiPropertyOptional({
    description: 'Nama bank penyalur gaji',
    example: 'Bank Mandiri',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nama bank maksimal 100 karakter' })
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Nomor rekening bank karyawan',
    example: '123-00-9876543-2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nomor rekening maksimal 100 karakter' })
  bankAccount?: string;

  @ApiPropertyOptional({
    description: 'Alias untuk nomor rekening bank karyawan',
    example: '123-00-9876543-2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nomor rekening maksimal 100 karakter' })
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Nama pemilik rekening bank',
    example: 'Budi Santoso',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Nama pemilik rekening maksimal 150 karakter' })
  bankAccountHolder?: string;

  @ApiPropertyOptional({
    description: 'Catatan tambahan terkait struktur gaji',
    example: 'Struktur gaji hasil penyesuaian evaluasi tahun 2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}
