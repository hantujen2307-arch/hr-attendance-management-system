import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeScheduleDto {
  @ApiPropertyOptional({ example: '2026-09-01', description: 'Schedule start date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Schedule end date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Shift UUID' })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Schedule status (ACTIVE, INACTIVE)' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;

  @ApiPropertyOptional({ example: 'Update catatan jadwal', description: 'Notes or update reason' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
