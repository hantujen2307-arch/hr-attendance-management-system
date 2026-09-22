import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicantStatus, JobVacancyStatus } from '@prisma/client';

export class QueryVacancyDto {
  @ApiPropertyOptional({ description: 'Kata kunci pencarian judul lowongan atau posisi' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: JobVacancyStatus, description: 'Filter status lowongan' })
  @IsOptional()
  @IsEnum(JobVacancyStatus)
  status?: JobVacancyStatus;

  @ApiPropertyOptional({ description: 'Filter UUID Departemen' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Halaman data', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman (maks. 100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QueryApplicantDto {
  @ApiPropertyOptional({ description: 'Kata kunci pencarian nama atau email pelamar' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter UUID Lowongan pekerjaan' })
  @IsOptional()
  @IsUUID('4')
  jobVacancyId?: string;

  @ApiPropertyOptional({ enum: ApplicantStatus, description: 'Filter tahapan pelamar' })
  @IsOptional()
  @IsEnum(ApplicantStatus)
  stage?: ApplicantStatus;

  @ApiPropertyOptional({ description: 'Halaman data', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman (maks. 100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
