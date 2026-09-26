import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ example: -6.2088, description: 'Employee latitude GPS coordinate' })
  @IsNotEmpty({ message: 'Lokasi latitude diperlukan untuk melakukan absensi' })
  @IsNumber({}, { message: 'Latitude harus berupa angka valid' })
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 106.8456, description: 'Employee longitude GPS coordinate' })
  @IsNotEmpty({ message: 'Lokasi longitude diperlukan untuk melakukan absensi' })
  @IsNumber({}, { message: 'Longitude harus berupa angka valid' })
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 15.5, description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Base64 data URL or path of selfie photo' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000_000, { message: 'Ukuran foto maksimal 10MB' })
  photo?: string;

  @ApiPropertyOptional({ description: 'URL or Base64 data of selfie photo' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000_000, { message: 'Ukuran foto maksimal 10MB' })
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Check-in selfie photo Base64 / URL' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000_000, { message: 'Ukuran foto maksimal 10MB' })
  checkInPhoto?: string;

  @ApiPropertyOptional({ description: 'Check-in selfie photo Base64 / URL alias' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000_000, { message: 'Ukuran foto maksimal 10MB' })
  photoCheckIn?: string;
}
