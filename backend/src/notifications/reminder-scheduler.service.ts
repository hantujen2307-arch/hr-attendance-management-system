import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { getJakartaDateInfo } from '../attendance/attendance.time.util';

@Injectable()
export class ReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.logger.log('⏰ Reminder Scheduler initialized (interval: 60s)');
    // Initial trigger after 5 seconds, then recurring every 60 seconds
    setTimeout(() => this.runReminderChecks().catch((err) => this.logger.error('Error in initial reminder check:', err)), 5000);
    this.timer = setInterval(() => {
      this.runReminderChecks().catch((err) => this.logger.error('Error in periodic reminder check:', err));
    }, 60000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('⏰ Reminder Scheduler stopped');
    }
  }

  /**
   * Main reminder verification logic. Safe to call on-demand by tests or scheduler.
   */
  async runReminderChecks(simulatedDate?: Date) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Fetch office attendance setting
      const setting = await this.prisma.attendanceSetting.findFirst();
      if (setting && setting.enableNotifications === false) {
        return;
      }

      const reminderMinutes = setting?.shiftReminderMinutes ?? 30;

      // 2. Resolve current Jakarta timestamp info
      const now = simulatedDate || new Date();
      const { attendanceDate, dateString, hour, minute, dayOfWeek } = getJakartaDateInfo(now);
      const currentMinutes = hour * 60 + minute;
      const dayStr = dayOfWeek.toString(); // 1=Mon, ..., 7=Sun

      // 3. Query active employee schedules for today
      const activeSchedules = await this.prisma.employeeSchedule.findMany({
        where: {
          status: 'ACTIVE',
          startDate: { lte: attendanceDate },
          endDate: { gte: attendanceDate },
          employee: {
            employmentStatus: 'ACTIVE',
            user: { isNot: null },
          },
        },
        include: {
          shift: true,
          employee: {
            include: { user: true },
          },
        },
      });

      // Also find active employees who have a direct shift assigned and no specific schedule for today
      const scheduledEmpIds = new Set(activeSchedules.map((s) => s.employeeId));
      const directShiftEmployees = await this.prisma.employee.findMany({
        where: {
          employmentStatus: 'ACTIVE',
          user: { isNot: null },
          shiftId: { not: null },
          id: { notIn: Array.from(scheduledEmpIds) },
        },
        include: {
          shift: true,
          user: true,
        },
      });

      // Unified shift targets
      const targets = [
        ...activeSchedules.map((s) => ({
          scheduleId: s.id,
          employeeId: s.employeeId,
          userId: s.employee.user!.id,
          shift: s.shift,
          workDays: (s.workDays || s.shift.workDays || '1,2,3,4,5').split(','),
        })),
        ...directShiftEmployees.map((e) => ({
          scheduleId: undefined,
          employeeId: e.id,
          userId: e.user!.id,
          shift: e.shift!,
          workDays: (e.shift!.workDays || '1,2,3,4,5').split(','),
        })),
      ];

      // -------------------------------------------------------------
      // CHECK 1: SHIFT REMINDER (e.g. 30 min before shift.startTime)
      // -------------------------------------------------------------
      for (const target of targets) {
        if (!target.workDays.includes(dayStr)) continue;

        const [sHour, sMin] = target.shift.startTime.split(':').map((v) => parseInt(v, 10));
        const shiftStartMins = sHour * 60 + (sMin || 0);

        // Reminder window: from (shiftStartMins - reminderMinutes) up to shiftStartMins
        if (
          currentMinutes >= shiftStartMins - reminderMinutes &&
          currentMinutes < shiftStartMins
        ) {
          const idempotencyKey = target.scheduleId
            ? `SHIFT_REMINDER_${target.scheduleId}_${dateString}`
            : `SHIFT_REMINDER_${target.employeeId}_${dateString}`;

          await this.notificationsService.create({
            userId: target.userId,
            type: 'SHIFT_REMINDER',
            title: 'Pengingat Shift',
            message: `Shift ${target.shift.name} Anda dimulai pukul ${target.shift.startTime}. Jangan lupa bersiap melakukan absensi.`,
            referenceType: 'SHIFT_ASSIGNMENT',
            referenceId: target.scheduleId || target.employeeId,
            idempotencyKey,
          });
        }
      }

      // -------------------------------------------------------------
      // CHECK 2: ATTENDANCE CHECK-IN REMINDER
      // (If past shift.startTime and employee hasn't clocked in yet)
      // -------------------------------------------------------------
      if (setting?.enableAttendanceReminder !== false) {
        for (const target of targets) {
          if (!target.workDays.includes(dayStr)) continue;

          const [sHour, sMin] = target.shift.startTime.split(':').map((v) => parseInt(v, 10));
          const shiftStartMins = sHour * 60 + (sMin || 0);

          // If current time is past shift start time
          if (currentMinutes >= shiftStartMins) {
            // Check if attendance record with checkIn exists
            const attendance = await this.prisma.attendance.findUnique({
              where: {
                uq_employee_attendance_date: {
                  employeeId: target.employeeId,
                  attendanceDate,
                },
              },
            });

            if (!attendance || !attendance.checkIn) {
              const idempotencyKey = `ATTENDANCE_REMINDER_${target.employeeId}_${dateString}`;
              await this.notificationsService.create({
                userId: target.userId,
                type: 'ATTENDANCE_REMINDER',
                title: 'Pengingat Absensi Masuk',
                message: `Anda belum melakukan check-in untuk shift ${target.shift.name} hari ini (${target.shift.startTime}).`,
                referenceType: 'ATTENDANCE',
                referenceId: dateString,
                idempotencyKey,
              });
            }
          }
        }
      }

      // -------------------------------------------------------------
      // CHECK 3: CHECK-OUT REMINDER
      // (If employee has clocked in, but hasn't clocked out approaching/past shift.endTime)
      // -------------------------------------------------------------
      if (setting?.enableCheckoutReminder !== false) {
        // Find attendances where checkIn is not null and checkOut is null
        const openAttendances = await this.prisma.attendance.findMany({
          where: {
            checkIn: { not: null },
            checkOut: null,
            employee: {
              employmentStatus: 'ACTIVE',
              user: { isNot: null },
            },
          },
          include: {
            shift: true,
            employee: {
              include: {
                user: true,
                shift: true,
              },
            },
          },
        });

        for (const att of openAttendances) {
          if (!att.employee.user) continue;

          const shift = att.shift || att.employee.shift;
          if (!shift) continue;

          const [eHour, eMin] = shift.endTime.split(':').map((v) => parseInt(v, 10));
          const shiftEndMins = eHour * 60 + (eMin || 0);

          let isDueForCheckout = false;

          if (shift.isOvernight) {
            // Overnight shift: check-in was yesterday, checkout is today
            const checkInDate = getJakartaDateInfo(new Date(att.checkIn!)).dateString;
            if (checkInDate !== dateString) {
              // We are on day D+1, check if approaching or past endTime
              if (currentMinutes >= shiftEndMins - 15) {
                isDueForCheckout = true;
              }
            }
          } else {
            // Same-day shift: if currentMinutes >= shiftEndMins - 15
            if (currentMinutes >= shiftEndMins - 15) {
              isDueForCheckout = true;
            }
          }

          if (isDueForCheckout) {
            const idempotencyKey = `CHECKOUT_REMINDER_${att.id}`;
            await this.notificationsService.create({
              userId: att.employee.user.id,
              type: 'CHECKOUT_REMINDER',
              title: 'Pengingat Check-Out',
              message: `Jam kerja shift ${shift.name} telah selesai (${shift.endTime}). Jangan lupa melakukan absensi pulang (check-out).`,
              referenceType: 'ATTENDANCE',
              referenceId: att.id,
              idempotencyKey,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.error('Error in reminder checks:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }
}
