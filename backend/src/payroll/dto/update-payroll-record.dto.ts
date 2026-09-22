import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePayrollRecordDto {
  @ApiPropertyOptional({
    description: 'Penyesuaian tunjangan (IDR)',
    example: 1500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tunjangan harus berupa angka' })
  @Min(0, { message: 'Tunjangan tidak boleh negatif' })
  allowances?: number;

  @ApiPropertyOptional({
    description: 'Penyesuaian potongan (IDR)',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Potongan harus berupa angka' })
  @Min(0, { message: 'Potongan tidak boleh negatif' })
  deductions?: number;

  @ApiPropertyOptional({
    description: 'Catatan tambahan pada slip gaji ini',
    example: 'Bonus insentif proyek rilis Q4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}
