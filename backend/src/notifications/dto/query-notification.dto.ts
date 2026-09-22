import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNotificationDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max 100)', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: false, description: 'Filter to only unread notifications' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean = false;

  @ApiPropertyOptional({ example: false, description: 'Filter by read status' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1' ? true : value === 'false' || value === false || value === 0 || value === '0' ? false : undefined)
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({ example: 'LEAVE_SUBMITTED', description: 'Filter by notification category type' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  type?: string;
}

