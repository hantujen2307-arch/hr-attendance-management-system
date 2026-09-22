import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateAttendanceSettingDto } from './dto/update-attendance-setting.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('attendance')
  @ApiOperation({ summary: 'Get current attendance location and schedule settings' })
  @ApiResponse({ status: 200, description: 'Current attendance settings' })
  getAttendanceSetting() {
    return this.settingsService.getAttendanceSetting();
  }

  @Patch('attendance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update attendance location and schedule configuration (Admin only)' })
  @ApiResponse({ status: 200, description: 'Updated attendance configuration' })
  updateAttendanceSetting(
    @Body() dto: UpdateAttendanceSettingDto,
    @CurrentUser() user: any
  ) {
    return this.settingsService.updateAttendanceSetting(dto, user);
  }
}
