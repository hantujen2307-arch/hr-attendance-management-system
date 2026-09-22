import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const API_BASE = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'hr-attendance-management-super-secure-jwt-secret-2026';
const prisma = new PrismaClient();

function createJwt(payload: object, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsignedToken).digest('base64url');
  return `${unsignedToken}.${signature}`;
}

async function testProfileWithToken(user: any) {
  console.log(`\n🔍 Testing Profile via Auth Token for: ${user.email}`);

  const token = createJwt(
    { sub: user.id, email: user.email, role: user.role, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET
  );

  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData: any = await meRes.json();
  const profile = meData.data || meData;

  console.log(`   Logged In Email : ${profile.email}`);
  console.log(`   Role            : ${profile.role}`);
  console.log(`   Employee Profile: ${profile.employee ? `${profile.employee.firstName} ${profile.employee.lastName} (${profile.employee.position})` : 'None'}`);

  if (profile.role !== user.role) {
    throw new Error(`Role mismatch! Expected ${user.role}, got ${profile.role}`);
  }

  console.log(`   ✅ Profile verified correctly for ${user.email}!`);
  return profile;
}

async function run() {
  console.log('===========================================================');
  console.log('👤 SIDEBAR & AUTHENTICATED USER PROFILE AUDIT TEST');
  console.log('===========================================================');

  // Test 1: Employee Jesen
  const jesenUser = await prisma.user.findUnique({
    where: { email: 'jesen2307@gmail.com' },
    include: { employee: true },
  });
  if (jesenUser) {
    await testProfileWithToken(jesenUser);
  }

  // Test 2: Employee Marcus Vance
  const marcusUser = await prisma.user.findUnique({
    where: { email: 'marcus.vance@company.com' },
    include: { employee: true },
  });
  if (marcusUser) {
    await testProfileWithToken(marcusUser);
  }

  // Test 3: Admin
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
    include: { employee: true },
  });
  if (adminUser) {
    await testProfileWithToken(adminUser);
  }

  // Test 4: HR Emily Zhao
  const hrUser = await prisma.user.findUnique({
    where: { email: 'emily.zhao@company.com' },
    include: { employee: true },
  });
  if (hrUser) {
    await testProfileWithToken(hrUser);
  }

  console.log('\n===========================================================');
  console.log('🎉 ALL PROFILE & SIDEBAR AUTH TESTS PASSED!');
  console.log('===========================================================');
}

run()
  .catch((err) => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
