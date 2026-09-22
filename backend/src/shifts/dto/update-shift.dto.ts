import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '@prisma/client';

export class UpdateShiftDto {
  @ApiPropertyOptional({ example: 'Updated Shift Name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'PGI' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format (00:00 - 23:59)' })
  @MaxLength(10)
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format (00:00 - 23:59)' })
  @MaxLength(10)
  endTime?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsInt()
  @Min(0)
  @IsOptional()
  breakMinutes?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsInt()
  @Min(0)
  @IsOptional()
  toleranceMinutes?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isOvernight?: boolean;

  @ApiPropertyOptional({ example: '1,2,3,4,5' })
  @IsString()
  @IsOptional()
  workDays?: string;

  @ApiPropertyOptional({ example: 'Shift note or description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ShiftStatus })
  @IsEnum(ShiftStatus)
  @IsOptional()
  status?: ShiftStatus;
}
