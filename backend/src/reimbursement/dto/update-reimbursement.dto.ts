import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReimbursementCategory, ReimbursementStatus } from '@prisma/client';

export class UpdateReimbursementDto {
  @ApiPropertyOptional({
    enum: ReimbursementCategory,
    description: 'Kategori reimbursement',
  })
  @IsOptional()
  @IsEnum(ReimbursementCategory, {
    message: 'Kategori harus salah satu dari: TRANSPORTATION, MEALS, BUSINESS_TRIP, OPERATIONAL, MEDICAL, OTHER',
  })
  category?: ReimbursementCategory;

  @ApiPropertyOptional({
    description: 'Nominal biaya reimbursement (IDR)',
    example: 200000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @Min(1, { message: 'Nominal pengajuan minimal Rp 1' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Tanggal transaksi (YYYY-MM-DD)',
    example: '2026-09-21',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Format tanggal harus YYYY-MM-DD',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Deskripsi pengeluaran',
    example: 'Revisi keperluan transportasi meeting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Deskripsi maksimal 1000 karakter' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Bukti pembayaran baru (opsional)',
  })
  @IsOptional()
  @IsString()
  receipt?: string;

  @ApiPropertyOptional({
    enum: [ReimbursementStatus.DRAFT, ReimbursementStatus.SUBMITTED],
    description: 'Ubah status dari DRAFT ke SUBMITTED',
  })
  @IsOptional()
  @IsEnum([ReimbursementStatus.DRAFT, ReimbursementStatus.SUBMITTED], {
    message: 'Status pembaruan hanya boleh DRAFT atau SUBMITTED',
  })
  status?: ReimbursementStatus;
}
