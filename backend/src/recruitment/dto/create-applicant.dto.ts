import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApplicantStatus } from '@prisma/client';

export class CreateApplicantDto {
  @ApiProperty({
    description: 'UUID Lowongan pekerjaan yang dilamar',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'Lowongan pekerjaan wajib dipilih' })
  @IsUUID('4', { message: 'jobVacancyId harus berupa UUID valid' })
  jobVacancyId: string;

  @ApiProperty({
    description: 'Nama depan pelamar',
    example: 'Budi',
  })
  @IsNotEmpty({ message: 'Nama depan wajib diisi' })
  @IsString()
  @MaxLength(100, { message: 'Nama depan maksimal 100 karakter' })
  firstName: string;

  @ApiProperty({
    description: 'Nama belakang pelamar',
    example: 'Prasetyo',
  })
  @IsNotEmpty({ message: 'Nama belakang wajib diisi' })
  @IsString()
  @MaxLength(100, { message: 'Nama belakang maksimal 100 karakter' })
  lastName: string;

  @ApiProperty({
    description: 'Alamat email aktif pelamar',
    example: 'budi.prasetyo@example.com',
  })
  @IsNotEmpty({ message: 'Email pelamar wajib diisi' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    description: 'Nomor telepon / WhatsApp pelamar',
    example: '081234567890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Alamat domisili pelamar',
    example: 'Jl. Sudirman No. 45, Jakarta Selatan',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Dokumen CV / Resume pelamar (data URL base64 atau path berkas terunggah)',
    example: 'data:application/pdf;base64,...',
  })
  @IsNotEmpty({ message: 'Dokumen CV/Resume wajib diunggah' })
  @IsString()
  resume: string;

  @ApiPropertyOptional({
    description: 'Surat lamaran atau catatan pengantar pelamar',
    example: 'Saya memiliki antusiasme tinggi untuk bergabung sebagai backend developer...',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({
    enum: ApplicantStatus,
    description: 'Tahapan awal pelamar',
    default: ApplicantStatus.APPLIED,
  })
  @IsOptional()
  @IsEnum(ApplicantStatus, {
    message: 'Tahapan pelamar harus salah satu dari: APPLIED, SCREENING, INTERVIEW, SELECTED, REJECTED, HIRED',
  })
  currentStage?: ApplicantStatus;
}
