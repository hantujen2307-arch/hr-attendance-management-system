import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '@prisma/client';

export class CreateShiftDto {
  @ApiProperty({ example: 'Shift Pagi', description: 'Unique name of the operational shift' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'PGI', description: 'Unique short code for the shift' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ example: '08:00', description: 'Shift start time (HH:mm format)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format (00:00 - 23:59)' })
  @MaxLength(10)
  startTime: string;

  @ApiProperty({ example: '17:00', description: 'Shift end time (HH:mm format)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format (00:00 - 23:59)' })
  @MaxLength(10)
  endTime: string;

  @ApiPropertyOptional({ example: 60, description: 'Break duration in minutes', default: 60 })
  @IsInt()
  @Min(0)
  @IsOptional()
  breakMinutes?: number;

  @ApiPropertyOptional({ example: 15, description: 'Lateness tolerance in minutes', default: 15 })
  @IsInt()
  @Min(0)
  @IsOptional()
  toleranceMinutes?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether the shift spans overnight across midnight', default: false })
  @IsBoolean()
  @IsOptional()
  isOvernight?: boolean;

  @ApiPropertyOptional({ example: '1,2,3,4,5', description: 'Scheduled working days: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun', default: '1,2,3,4,5' })
  @IsString()
  @IsOptional()
  workDays?: string;

  @ApiPropertyOptional({ example: 'Shift reguler operasional kantor', description: 'Description or notes' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ShiftStatus, default: ShiftStatus.ACTIVE })
  @IsEnum(ShiftStatus)
  @IsOptional()
  status?: ShiftStatus;
}
