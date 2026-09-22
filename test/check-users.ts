import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: {
      employee: {
        include: {
          department: true,
          shift: true,
        },
      },
    },
  });

  console.log('=== ALL USERS IN DB ===');
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      role: u.role,
      employee: u.employee
        ? {
            id: u.employee.id,
            employeeId: u.employee.employeeId,
            firstName: u.employee.firstName,
            lastName: u.employee.lastName,
            email: u.employee.email,
            position: u.employee.position,
          }
        : null,
    });
  }

  const employeesWithoutUser = await prisma.employee.findMany({
    where: { userId: null },
  });
  console.log('\n=== EMPLOYEES WITHOUT USER ===');
  console.log(employeesWithoutUser);

  await prisma.$disconnect();
}

check();
