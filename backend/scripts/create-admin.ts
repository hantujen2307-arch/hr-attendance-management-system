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

    // 3. Ensure employee profile is linked to this admin user
    let employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    if (employee) {
      if (employee.userId !== user.id) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { userId: user.id },
        });
        console.log(`🔗 Linked existing employee profile (${employee.employeeId}) to admin user.`);
      } else {
        console.log(`✅ Employee profile already linked (${employee.employeeId}).`);
      }
    } else {
      let dept = await prisma.department.findFirst({ where: { status: 'ACTIVE' } });
      if (!dept) {
        dept = await prisma.department.create({
          data: {
            name: 'Management',
            code: 'MGMT',
            status: 'ACTIVE',
          },
        });
      }
      const shift = await prisma.shift.findFirst({ where: { status: 'ACTIVE' } });
      const empCount = await prisma.employee.count();
      employee = await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: `EMP-ADM-${String(empCount + 1).padStart(3, '0')}`,
          firstName: 'Administrator',
          lastName: '(System)',
          email: user.email,
          departmentId: dept.id,
          shiftId: shift?.id || null,
          position: 'System Administrator',
          joinDate: new Date(),
          employmentStatus: 'ACTIVE',
        },
      });
      console.log(`👤 Created and linked new employee profile (${employee.employeeId}) for admin.`);
    }

    console.log(`🎉 Initial Admin Setup Complete.`);
  } catch (error) {
    console.error('❌ Failed to initialize admin account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialAdmin();
