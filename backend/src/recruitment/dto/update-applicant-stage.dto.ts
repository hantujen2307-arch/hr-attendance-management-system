import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApplicantStatus } from '@prisma/client';

export class UpdateApplicantStageDto {
  @ApiProperty({
    enum: ApplicantStatus,
    description: 'Tahapan baru pelamar',
    example: ApplicantStatus.INTERVIEW,
  })
  @IsNotEmpty({ message: 'Tahapan baru wajib dipilih' })
  @IsEnum(ApplicantStatus, {
    message: 'Tahapan harus salah satu dari: APPLIED, SCREENING, INTERVIEW, SELECTED, REJECTED, HIRED',
  })
  stage: ApplicantStatus;

  @ApiPropertyOptional({
    description: 'Catatan hasil evaluasi tahap screening',
    example: 'Kandidat memiliki portofolio proyek yang relevan.',
  })
  @IsOptional()
  @IsString()
  screeningNotes?: string;

  @ApiPropertyOptional({
    description: 'Catatan hasil wawancara / feedback interviewer',
    example: 'Komunikasi sangat baik, pemahaman arsitektur sistem kuat.',
  })
  @IsOptional()
  @IsString()
  interviewNotes?: string;

  @ApiPropertyOptional({
    description: 'Jadwal tanggal dan jam wawancara (ISO string atau format YYYY-MM-DD HH:mm)',
    example: '2026-09-25T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  interviewDate?: string;

  @ApiPropertyOptional({
    description: 'Alasan penolakan (wajib jika tahapan adalah REJECTED)',
    example: 'Kualifikasi pengalaman belum sesuai dengan kebutuhan posisi senior.',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
