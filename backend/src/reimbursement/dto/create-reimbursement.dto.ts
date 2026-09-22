import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReimbursementCategory, ReimbursementStatus } from '@prisma/client';

export class CreateReimbursementDto {
  @ApiPropertyOptional({
    description: 'Target Employee UUID (hanya diizinkan untuk ADMIN/HR; EMPLOYEE otomatis menggunakan ID sendiri)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'employeeId harus berupa UUID valid' })
  employeeId?: string;

  @ApiProperty({
    enum: ReimbursementCategory,
    description: 'Kategori biaya reimbursement',
    example: ReimbursementCategory.TRANSPORTATION,
  })
  @IsNotEmpty({ message: 'Kategori reimbursement wajib dipilih' })
  @IsEnum(ReimbursementCategory, {
    message: 'Kategori harus salah satu dari: TRANSPORTATION, MEALS, BUSINESS_TRIP, OPERATIONAL, MEDICAL, OTHER',
  })
  category: ReimbursementCategory;

  @ApiProperty({
    description: 'Nominal biaya reimbursement (IDR)',
    example: 150000,
  })
  @IsNotEmpty({ message: 'Nominal wajib diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @Min(1, { message: 'Nominal pengajuan minimal Rp 1' })
  amount: number;

  @ApiProperty({
    description: 'Tanggal transaksi/pengeluaran biaya (YYYY-MM-DD)',
    example: '2026-09-20',
  })
  @IsNotEmpty({ message: 'Tanggal pengeluaran wajib diisi' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Format tanggal harus YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({
    description: 'Deskripsi dan rincian keperluan pengeluaran biaya',
    example: 'Biaya transportasi taksi menuju kantor klien di Jakarta Selatan',
  })
  @IsNotEmpty({ message: 'Deskripsi wajib diisi' })
  @IsString()
  @MaxLength(1000, { message: 'Deskripsi maksimal 1000 karakter' })
  description: string;

  @ApiProperty({
    description: 'Bukti pembayaran / struk / invoice (data URL base64 atau path file yang sudah diunggah)',
    example: 'data:image/jpeg;base64,...',
  })
  @IsNotEmpty({ message: 'Bukti pembayaran/struk wajib diunggah' })
  @IsString()
  receipt: string;

  @ApiPropertyOptional({
    enum: [ReimbursementStatus.DRAFT, ReimbursementStatus.SUBMITTED],
    description: 'Status awal pengajuan (DRAFT atau SUBMITTED)',
    default: ReimbursementStatus.SUBMITTED,
  })
  @IsOptional()
  @IsEnum([ReimbursementStatus.DRAFT, ReimbursementStatus.SUBMITTED], {
    message: 'Status awal hanya boleh DRAFT atau SUBMITTED',
  })
  status?: ReimbursementStatus;
}
