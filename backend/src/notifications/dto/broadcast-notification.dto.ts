import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Pengumuman Libur Nasional', description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'Seluruh operasional kantor libur pada hari Senin mendatang.', description: 'Announcement message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Target user role filter (defaults to all)' })
  @IsString()
  @IsOptional()
  targetRole?: UserRole | 'ALL';

  @ApiPropertyOptional({ description: 'Target user role alias' })
  @IsString()
  @IsOptional()
  role?: UserRole | 'ALL';

  @ApiPropertyOptional({ example: 'SYSTEM', description: 'Notification category' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;
}
