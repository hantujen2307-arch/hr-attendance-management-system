import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createInitialAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@company.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminSecurePassword2026!';

  if (password.length < 8) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`🔐 Initializing production administrator: ${email}...`);

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    // 1. Ensure default attendance setting exists
    const settingCount = await prisma.attendanceSetting.count();
    if (settingCount === 0) {
      await prisma.attendanceSetting.create({
        data: {
          locationName: 'Kantor Pusat',
          latitude: -6.2088,
          longitude: 106.8456,
          radiusMeters: 100,
          workStartTime: '08:00',
          toleranceMinutes: 15,
          workEndTime: '17:00',
          shiftReminderMinutes: 30,
          enableNotifications: true,
          enableAttendanceReminder: true,
          enableCheckoutReminder: true,
          enableLateAlert: true,
        },
      });
      console.log('✅ Created default AttendanceSetting.');
    }

    // 2. Upsert admin user account safely
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: UserRole.ADMIN,
      },
      create: {
        email,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    console.log(`✅ Administrator account ready:`);
    console.log(`   ID:    ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role:  ${user.role}`);
    console.log(`🎉 Initial Admin Setup Complete.`);
  } catch (error) {
    console.error('❌ Failed to initialize admin account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialAdmin();
