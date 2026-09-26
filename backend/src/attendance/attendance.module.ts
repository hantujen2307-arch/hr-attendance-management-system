import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { StorageService } from '../common/services/storage.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, StorageService],
  exports: [AttendanceService, StorageService],
})
export class AttendanceModule {}
