import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobVacancyStatus } from '@prisma/client';

export class CreateJobVacancyDto {
  @ApiProperty({
    description: 'Judul posisi lowongan pekerjaan',
    example: 'Senior Fullstack Engineer',
  })
  @IsNotEmpty({ message: 'Judul lowongan wajib diisi' })
  @IsString()
  @MaxLength(150, { message: 'Judul lowongan maksimal 150 karakter' })
  title: string;

  @ApiProperty({
    description: 'UUID Departemen / Unit Kerja',
    example: 'ec765e6e-2420-4e62-88ab-2da2cb6826a7',
  })
  @IsNotEmpty({ message: 'Departemen wajib dipilih' })
  @IsUUID('4', { message: 'departmentId harus berupa UUID valid' })
  departmentId: string;

  @ApiProperty({
    description: 'Nama Posisi / Jabatan',
    example: 'Software Engineer',
  })
  @IsNotEmpty({ message: 'Posisi/Jabatan wajib diisi' })
  @IsString()
  @MaxLength(150, { message: 'Posisi maksimal 150 karakter' })
  position: string;

  @ApiProperty({
    description: 'Deskripsi pekerjaan dan tanggung jawab',
    example: 'Bertanggung jawab dalam merancang dan memelihara sistem enterprise backend.',
  })
  @IsNotEmpty({ message: 'Deskripsi lowongan wajib diisi' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Persyaratan dan kualifikasi pelamar',
    example: 'Menguasai TypeScript, NestJS, Next.js, dan PostgreSQL minimal 3 tahun.',
  })
  @IsNotEmpty({ message: 'Persyaratan pelamar wajib diisi' })
  @IsString()
  requirements: string;

  @ApiPropertyOptional({
    description: 'Lokasi penempatan kerja',
    example: 'Jakarta (Hybrid)',
    default: 'Jakarta',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;

  @ApiPropertyOptional({
    description: 'Jenis ikatan kerja (FULL_TIME, CONTRACT, INTERNSHIP, PART_TIME)',
    example: 'FULL_TIME',
    default: 'FULL_TIME',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employmentType?: string;

  @ApiPropertyOptional({
    description: 'Jumlah kuota kebutuhan karyawan',
    example: 2,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Kuota harus berupa bilangan bulat' })
  @Min(1, { message: 'Kuota minimal 1 orang' })
  quota?: number;

  @ApiPropertyOptional({
    enum: JobVacancyStatus,
    description: 'Status lowongan pekerjaan',
    default: JobVacancyStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(JobVacancyStatus, {
    message: 'Status lowongan harus salah satu dari: DRAFT, OPEN, CLOSED, CANCELLED',
  })
  status?: JobVacancyStatus;

  @ApiProperty({
    description: 'Tanggal mulai pembukaan lowongan (YYYY-MM-DD)',
    example: '2026-09-22',
  })
  @IsNotEmpty({ message: 'Tanggal mulai lowongan wajib diisi' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal mulai harus YYYY-MM-DD' })
  startDate: string;

  @ApiPropertyOptional({
    description: 'Tanggal penutupan lowongan (YYYY-MM-DD)',
    example: '2026-10-31',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal penutupan harus YYYY-MM-DD' })
  endDate?: string;
}
