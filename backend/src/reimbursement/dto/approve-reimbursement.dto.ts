import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveReimbursementDto {
  @ApiPropertyOptional({
    description: 'Nominal yang disetujui (IDR). Jika dikosongkan, nominal yang diajukan akan disetujui penuh.',
    example: 150000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nominal yang disetujui harus berupa angka' })
  @Min(0, { message: 'Nominal yang disetujui tidak boleh negatif' })
  approvedAmount?: number;

  @ApiPropertyOptional({
    description: 'Catatan persetujuan dari HR/Admin',
    example: 'Disetujui sesuai bukti struk resmi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}
