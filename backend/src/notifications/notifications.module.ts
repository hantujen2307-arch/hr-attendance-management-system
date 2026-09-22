import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ReminderSchedulerService } from './reminder-scheduler.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ReminderSchedulerService],
  exports: [NotificationsService, ReminderSchedulerService],
})
export class NotificationsModule {}
