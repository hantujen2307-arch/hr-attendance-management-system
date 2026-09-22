import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateOvertimeRequestDto {
  @ApiPropertyOptional({
    description: 'Target Employee UUID. Ignored or validated for EMPLOYEE role (auto-bound to session).',
    example: 'd9b1c7a8-1234-5678-9abc-def012345678',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID karyawan harus berupa UUID v4 yang valid' })
  employeeId?: string;

  @ApiProperty({
    description: 'Tanggal lembur dalam format YYYY-MM-DD',
    example: '2026-09-20',
  })
  @IsNotEmpty({ message: 'Tanggal lembur wajib diisi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Format tanggal harus YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({
    description: 'Jam mulai rencana lembur (format HH:mm)',
    example: '17:00',
  })
  @IsNotEmpty({ message: 'Jam mulai rencana lembur wajib diisi' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Format jam mulai harus HH:mm (00:00 - 23:59)',
  })
  plannedStartTime: string;

  @ApiProperty({
    description: 'Jam selesai rencana lembur (format HH:mm)',
    example: '19:00',
  })
  @IsNotEmpty({ message: 'Jam selesai rencana lembur wajib diisi' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Format jam selesai harus HH:mm (00:00 - 23:59)',
  })
  plannedEndTime: string;

  @ApiProperty({
    description: 'Alasan atau tugas yang dikerjakan saat lembur',
    example: 'Penyelesaian laporan keuangan kuartal 3 dan rekonsiliasi data',
  })
  @IsNotEmpty({ message: 'Alasan pengajuan lembur wajib diisi' })
  @IsString()
  @MinLength(3, { message: 'Alasan lembur minimal 3 karakter' })
  @MaxLength(500, { message: 'Alasan lembur maksimal 500 karakter' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Catatan tambahan pengajuan lembur',
    example: 'Telah dikoordinasikan dengan supervisor departemen',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan tambahan maksimal 500 karakter' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Referensi jadwal shift kerja terkait (UUID)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID jadwal harus berupa UUID v4 yang valid' })
  scheduleId?: string;

  @ApiPropertyOptional({
    description: 'Referensi absensi kehadiran terkait (UUID)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID absensi harus berupa UUID v4 yang valid' })
  attendanceId?: string;
}
