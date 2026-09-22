import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEx = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
    include: { employee: true },
  });
  console.log('admin@example.com:', adminEx);

  const adminCo = await prisma.user.findUnique({
    where: { email: 'admin@company.com' },
    include: { employee: true },
  });
  console.log('admin@company.com:', adminCo);


  const jesen = await prisma.user.findUnique({
    where: { email: 'jesen2307@gmail.com' },
    include: { employee: true },
  });
  console.log('jesen2307@gmail.com:', jesen);

  const empEx = await prisma.user.findUnique({
    where: { email: 'employee@example.com' },
    include: { employee: true },
  });
  console.log('employee@example.com:', empEx);

  await prisma.$disconnect();
}

main();
