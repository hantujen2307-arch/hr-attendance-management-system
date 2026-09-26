import { NextRequest, NextResponse } from 'next/server';
import { prisma, withDbRetry, formatDatabaseError } from '@/lib/prisma';
import { verifyJwt } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('access_token')?.value ||
      request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const payload = verifyJwt(token);
    if (!payload || !payload.sub) {
      return NextResponse.json(
        { message: 'Sesi login tidak valid atau kadaluarsa.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const targetUserId = body.userId || payload.sub;

    return await withDbRetry(async () => {
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { employee: true },
      });

      if (!user) {
        return NextResponse.json({ message: 'User akun tidak ditemukan.' }, { status: 404 });
      }

      // 1. If explicit employeeId is given, link directly
      if (body.employeeId) {
        const employee = await prisma.employee.findUnique({
          where: { id: body.employeeId },
        });

        if (!employee) {
          return NextResponse.json({ message: 'Data karyawan tidak ditemukan.' }, { status: 404 });
        }

        // Check if employee is already linked to another user
        if (employee.userId && employee.userId !== targetUserId) {
          await prisma.employee.update({
            where: { id: employee.id },
            data: { userId: null },
          });
        }

        const updated = await prisma.employee.update({
          where: { id: employee.id },
          data: { userId: targetUserId },
          include: { department: true, shift: true },
        });

        return NextResponse.json({
          success: true,
          message: `Berhasil menghubungkan akun ${user.email} ke karyawan ${updated.firstName} ${updated.lastName}.`,
          employee: updated,
        });
      }

      // 2. Auto-link by email
      let employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: targetUserId },
            { email: { equals: user.email, mode: 'insensitive' } },
          ],
        },
        include: { department: true, shift: true },
      });

      if (employee) {
        if (employee.userId !== targetUserId) {
          employee = await prisma.employee.update({
            where: { id: employee.id },
            data: { userId: targetUserId },
            include: { department: true, shift: true },
          });
        }
        return NextResponse.json({
          success: true,
          message: `Berhasil menghubungkan profil karyawan (${employee.employeeId}) berdasarkan email.`,
          employee,
        });
      }

      // 3. Auto-match by username prefix for unlinked employee
      const username = user.email.split('@')[0].trim().toLowerCase();
      if (username) {
        const unlinked = await prisma.employee.findFirst({
          where: {
            userId: null,
            email: { startsWith: username, mode: 'insensitive' },
          },
          include: { department: true, shift: true },
        });
        if (unlinked) {
          const updated = await prisma.employee.update({
            where: { id: unlinked.id },
            data: { userId: targetUserId },
            include: { department: true, shift: true },
          });
          return NextResponse.json({
            success: true,
            message: `Berhasil menghubungkan akun ke profil karyawan yang ada (${updated.employeeId} - ${updated.firstName}).`,
            employee: updated,
          });
        }
      }

      // 4. Auto-provision default employee profile for Admin, HR, or requested
      let dept = await prisma.department.findFirst({ where: { status: 'ACTIVE' } });
      if (!dept) {
        dept = await prisma.department.create({
          data: { name: 'Management', code: 'MGMT', status: 'ACTIVE' },
        });
      }

      const shift = await prisma.shift.findFirst({ where: { status: 'ACTIVE' } });
      const empCount = await prisma.employee.count();
      const rolePrefix = user.role === 'ADMIN' ? 'ADM' : user.role === 'HR' ? 'HR' : 'EMP';

      const nameParts = (user.email.split('@')[0] || 'User')
        .replace(/[._-]/g, ' ')
        .trim()
        .split(' ');
      const firstName =
        nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
      const lastName =
        nameParts.length > 1
          ? nameParts
              .slice(1)
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')
          : (user.role === 'ADMIN' ? '(Admin)' : '');

      const position =
        user.role === 'ADMIN'
          ? 'System Administrator'
          : user.role === 'HR'
          ? 'HR Specialist'
          : 'Staff Employee';

      const newEmployee = await prisma.employee.create({
        data: {
          userId: targetUserId,
          employeeId: `EMP-${rolePrefix}-${String(empCount + 1).padStart(3, '0')}`,
          firstName: firstName || 'User',
          lastName: lastName || '',
          email: user.email.trim().toLowerCase(),
          departmentId: dept.id,
          shiftId: shift?.id || null,
          position,
          joinDate: new Date(),
          employmentStatus: 'ACTIVE',
        },
        include: { department: true, shift: true },
      });

      return NextResponse.json({
        success: true,
        message: `Profil karyawan (${newEmployee.employeeId}) berhasil dibuat otomatis dan dihubungkan ke akun Anda.`,
        employee: newEmployee,
      });
    });
  } catch (error: any) {
    console.error('Error in POST /api/employees/link-user:', error);
    const dbErr = formatDatabaseError(error, 'Gagal menghubungkan profil karyawan.');
    return NextResponse.json(
      {
        message: dbErr.message,
        isColdStart: dbErr.isColdStart,
      },
      { status: dbErr.isColdStart ? 503 : 500 }
    );
  }
}
