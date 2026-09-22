import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateAttendanceSettingDto } from './dto/update-attendance-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async getAttendanceSetting() {
    let setting = await this.prisma.attendanceSetting.findFirst();
    if (!setting) {
      setting = await this.prisma.attendanceSetting.create({
        data: {
          locationName: 'Kantor Utama',
          latitude: -6.2088,
          longitude: 106.8456,
          radiusMeters: 100,
          workStartTime: '08:00',
          toleranceMinutes: 15,
          workEndTime: '17:00',
        },
      });
    }
    return setting;
  }

  async updateAttendanceSetting(dto: UpdateAttendanceSettingDto, user: any) {
    let setting = await this.prisma.attendanceSetting.findFirst();
    let updated;

    if (!setting) {
      updated = await this.prisma.attendanceSetting.create({
        data: {
          locationName: dto.locationName || 'Kantor Utama',
          latitude: dto.latitude ?? -6.2088,
          longitude: dto.longitude ?? 106.8456,
          radiusMeters: dto.radiusMeters ?? 100,
          workStartTime: dto.workStartTime || '08:00',
          toleranceMinutes: dto.toleranceMinutes ?? 15,
          workEndTime: dto.workEndTime || '17:00',
          shiftReminderMinutes: dto.shiftReminderMinutes ?? 30,
          enableNotifications: dto.enableNotifications ?? true,
          enableAttendanceReminder: dto.enableAttendanceReminder ?? true,
          enableCheckoutReminder: dto.enableCheckoutReminder ?? true,
          enableLateAlert: dto.enableLateAlert ?? true,
        },
      });
    } else {
      updated = await this.prisma.attendanceSetting.update({
        where: { id: setting.id },
        data: {
          locationName: dto.locationName ?? setting.locationName,
          latitude: dto.latitude ?? setting.latitude,
          longitude: dto.longitude ?? setting.longitude,
          radiusMeters: dto.radiusMeters ?? setting.radiusMeters,
          workStartTime: dto.workStartTime ?? setting.workStartTime,
          toleranceMinutes: dto.toleranceMinutes ?? setting.toleranceMinutes,
          workEndTime: dto.workEndTime ?? setting.workEndTime,
          shiftReminderMinutes: dto.shiftReminderMinutes ?? setting.shiftReminderMinutes,
          enableNotifications: dto.enableNotifications ?? setting.enableNotifications,
          enableAttendanceReminder: dto.enableAttendanceReminder ?? setting.enableAttendanceReminder,
          enableCheckoutReminder: dto.enableCheckoutReminder ?? setting.enableCheckoutReminder,
          enableLateAlert: dto.enableLateAlert ?? setting.enableLateAlert,
        },
      });
    }

    // Audit log
    await this.auditService.log({
      userId: user?.id,
      action: 'UPDATE_ATTENDANCE_SETTINGS',
      details: `Updated attendance location & schedule settings: ${updated.locationName} (${updated.radiusMeters}m radius, ${updated.workStartTime} - ${updated.workEndTime})`,
      metadata: { previous: setting, updated },
    });

    return updated;
  }
}
