import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const jwtSecret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV !== 'production'
        ? 'hr-attendance-management-super-secure-jwt-secret-2026'
        : undefined);

    if (!jwtSecret) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            departmentId: true,
            shiftId: true,
            position: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists or session has been invalidated');
    }

    // If user.employee relation is not populated directly, resolve by email, unlinked match, or auto-provision for Admin/HR
    if (!user.employee && user.email) {
      let matchedEmployee = await this.prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: { equals: user.email, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          departmentId: true,
          shiftId: true,
          position: true,
          userId: true,
        },
      });

      if (!matchedEmployee) {
        const username = user.email.split('@')[0].trim().toLowerCase();
        if (username) {
          const unlinked = await this.prisma.employee.findFirst({
            where: {
              userId: null,
              email: { startsWith: username, mode: 'insensitive' },
            },
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              departmentId: true,
              shiftId: true,
              position: true,
              userId: true,
            },
          });
          if (unlinked) {
            matchedEmployee = unlinked;
          }
        }
      }

      if (matchedEmployee) {
        if (!matchedEmployee.userId || matchedEmployee.userId !== user.id) {
          await this.prisma.employee
            .update({
              where: { id: matchedEmployee.id },
              data: { userId: user.id },
            })
            .catch(() => {});
        }
        (user as any).employee = matchedEmployee;
      } else if (user.role === UserRole.ADMIN || user.role === UserRole.HR) {
        try {
          let dept = await this.prisma.department.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          });
          if (!dept) {
            dept = await this.prisma.department.create({
              data: {
                name: 'Management',
                code: 'MGMT',
                status: 'ACTIVE',
              },
            });
          }

          const defaultShift = await this.prisma.shift.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          });

          const rolePrefix = user.role === UserRole.ADMIN ? 'ADM' : 'HR';
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const nameParts = (user.email.split('@')[0] || 'Administrator')
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
              : '(Staff)';

          const createdEmp = await this.prisma.employee.create({
            data: {
              userId: user.id,
              employeeId: `EMP-${rolePrefix}-${randomSuffix}`,
              firstName: firstName || 'Administrator',
              lastName: lastName || '',
              email: user.email.trim().toLowerCase(),
              departmentId: dept.id,
              shiftId: defaultShift?.id || null,
              position: user.role === UserRole.ADMIN ? 'System Administrator' : 'HR Specialist',
              joinDate: new Date(),
              employmentStatus: 'ACTIVE',
            },
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              departmentId: true,
              shiftId: true,
              position: true,
              userId: true,
            },
          });
          (user as any).employee = createdEmp;
        } catch (err) {
          console.error('Auto-provisioning employee in JwtStrategy failed:', err);
        }
      }
    }

    return user;
  }
}
