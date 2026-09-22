import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class ConvertApplicantDto {
  @ApiPropertyOptional({
    description: 'NIP / Employee ID kustom (jika dikosongkan, sistem akan generate otomatis)',
    example: 'EMP-2026-0045',
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Tanggal mulai kerja karyawan (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal harus YYYY-MM-DD' })
  joinDate?: string;

  @ApiPropertyOptional({
    description: 'UUID Shift kerja awal yang dialokasikan',
    example: 'c1b48ef7-0361-4dfb-90f7-d35ec891a2cd',
  })
  @IsOptional()
  @IsUUID('4', { message: 'shiftId harus berupa UUID valid' })
  shiftId?: string;

  @ApiPropertyOptional({
    description: 'Buat akun login pengguna otomatis untuk karyawan baru',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createAccount?: boolean;

  @ApiPropertyOptional({
    description: 'Password awal akun login pengguna',
    default: 'Password123!',
  })
  @IsOptional()
  @IsString()
  initialPassword?: string;
}
