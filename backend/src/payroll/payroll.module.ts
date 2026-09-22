import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollPdfService } from './payroll.pdf.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollPdfService],
  exports: [PayrollService, PayrollPdfService],
})
export class PayrollModule {}
