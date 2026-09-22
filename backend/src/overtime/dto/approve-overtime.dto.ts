import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveOvertimeDto {
  @ApiPropertyOptional({
    description: 'Jumlah menit lembur yang disetujui (default: requestedMinutes)',
    example: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Approved minutes harus berupa angka integer' })
  @Min(1, { message: 'Approved minutes minimal 1 menit' })
  approvedMinutes?: number;

  @ApiPropertyOptional({
    description: 'Catatan tambahan dari approver',
    example: 'Disetujui sesuai kuota lembur departemen',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}
