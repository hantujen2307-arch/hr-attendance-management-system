import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RejectOvertimeDto {
  @ApiProperty({
    description: 'Alasan penolakan pengajuan lembur (wajib diisi)',
    example: 'Kuota lembur departemen untuk bulan ini telah melampaui batas anggaran',
  })
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  @IsString()
  @MinLength(3, { message: 'Alasan penolakan minimal 3 karakter' })
  @MaxLength(500, { message: 'Alasan penolakan maksimal 500 karakter' })
  rejectedReason: string;
}
