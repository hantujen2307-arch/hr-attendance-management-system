import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateOvertimeRequestDto {
  @ApiPropertyOptional({
    description: 'Tanggal lembur dalam format YYYY-MM-DD',
    example: '2026-09-20',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Format tanggal harus YYYY-MM-DD',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Jam mulai rencana lembur (format HH:mm)',
    example: '17:30',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Format jam mulai harus HH:mm (00:00 - 23:59)',
  })
  plannedStartTime?: string;

  @ApiPropertyOptional({
    description: 'Jam selesai rencana lembur (format HH:mm)',
    example: '19:30',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Format jam selesai harus HH:mm (00:00 - 23:59)',
  })
  plannedEndTime?: string;

  @ApiPropertyOptional({
    description: 'Alasan atau tugas lembur',
    example: 'Pembaruan data server database produksi',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Alasan lembur minimal 3 karakter' })
  @MaxLength(500, { message: 'Alasan lembur maksimal 500 karakter' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Catatan tambahan',
    example: 'Estimasi waktu diperpanjang',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan tambahan maksimal 500 karakter' })
  notes?: string;
}
