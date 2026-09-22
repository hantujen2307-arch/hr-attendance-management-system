import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, Matches } from 'class-validator';

export class UpdateAttendanceSettingDto {
  @ApiPropertyOptional({ example: 'Kantor Utama', description: 'Office location name' })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({ example: -6.2088, description: 'Office latitude coordinate' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 106.8456, description: 'Office longitude coordinate' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 100, description: 'Allowed radius in meters' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(50000)
  radiusMeters?: number;

  @ApiPropertyOptional({ example: '08:00', description: 'Work start time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'workStartTime must be in HH:mm format' })
  workStartTime?: string;

  @ApiPropertyOptional({ example: 15, description: 'Tolerance window in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(180)
  toleranceMinutes?: number;

  @ApiPropertyOptional({ example: '17:00', description: 'Work end time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'workEndTime must be in HH:mm format' })
  workEndTime?: string;

  @ApiPropertyOptional({ example: 30, description: 'Shift reminder in minutes before start' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  shiftReminderMinutes?: number;

  @ApiPropertyOptional({ example: true, description: 'Global notification enable switch' })
  @IsOptional()
  enableNotifications?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Attendance check-in reminder switch' })
  @IsOptional()
  enableAttendanceReminder?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Checkout reminder switch' })
  @IsOptional()
  enableCheckoutReminder?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Late arrival alert switch' })
  @IsOptional()
  enableLateAlert?: boolean;
}

