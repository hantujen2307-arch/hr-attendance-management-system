import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectReimbursementDto {
  @ApiProperty({
    description: 'Alasan penolakan pengajuan reimbursement',
    example: 'Bukti pembayaran buram dan tidak memuat tanggal transaksi yang jelas',
  })
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  @IsString()
  @MaxLength(500, { message: 'Alasan penolakan maksimal 500 karakter' })
  reason: string;
}
