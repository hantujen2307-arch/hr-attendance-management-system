import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateJesen() {
  const user = await prisma.user.findUnique({
    where: { email: 'jesen2307@gmail.com' },
    include: { employee: true },
  });

  if (user && user.employee) {
    const updated = await prisma.employee.update({
      where: { id: user.employee.id },
      data: {
        firstName: 'Jesen',
        lastName: '',
      },
    });
    console.log('Updated employee for Jesen:', updated);
  } else {
    console.log('User or employee not found');
  }

  await prisma.$disconnect();
}

updateJesen();
