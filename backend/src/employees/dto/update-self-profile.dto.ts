import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSelfProfileDto {
  @ApiPropertyOptional({ example: '+62 812-3456-7890' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar photo base64 or URL' })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 123, Jakarta' })
  @IsString()
  @IsOptional()
  address?: string;
}
