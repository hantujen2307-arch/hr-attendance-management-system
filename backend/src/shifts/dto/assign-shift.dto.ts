import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignShiftDto {
  @ApiProperty({ description: 'Employee UUID' })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ description: 'Shift UUID' })
  @IsUUID()
  @IsNotEmpty()
  shiftId: string;

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

  @ApiPropertyOptional({ example: '1,2,3,4,5', description: 'Custom work days if overriding shift default' })
  @IsString()
  @IsOptional()
  workDays?: string;

  @ApiPropertyOptional({ example: 'Penugasan shift periode September', description: 'Notes or assignment reason' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: true, description: 'Also set as employee permanent default shift' })
  @IsBoolean()
  @IsOptional()
  setAsDefault?: boolean;
}
