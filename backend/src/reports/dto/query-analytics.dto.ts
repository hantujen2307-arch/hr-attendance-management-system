import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAnalyticsDto {
  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format', example: '2026-09-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format', example: '2026-09-30' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by Department UUID or "all"' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Period preset', enum: ['this_month', 'last_month', 'last_3_months', 'year_to_date', 'custom'] })
  @IsOptional()
  @IsString()
  period?: string;
}
