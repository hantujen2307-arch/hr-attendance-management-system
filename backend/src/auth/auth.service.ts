import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const emailNormalized = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: emailNormalized },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            position: true,
          },
        },
      },
    });

    if (!user) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        details: `Failed login attempt: account not found (${emailNormalized})`,
        metadata: { email: emailNormalized },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        details: `Failed login attempt: invalid password for ${emailNormalized}`,
        metadata: { email: emailNormalized },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    let employee = user.employee;
    if (!employee) {
      let matchedEmployee = await this.prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: { equals: emailNormalized, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          department: { select: { id: true, name: true } },
          position: true,
          userId: true,
        },
      });

      if (!matchedEmployee) {
        const username = emailNormalized.split('@')[0].trim();
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
              department: { select: { id: true, name: true } },
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
        employee = matchedEmployee;
      } else if (user.role === 'ADMIN' || user.role === 'HR') {
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

          const rolePrefix = user.role === 'ADMIN' ? 'ADM' : 'HR';
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
              email: emailNormalized,
              departmentId: dept.id,
              shiftId: defaultShift?.id || null,
              position: user.role === 'ADMIN' ? 'System Administrator' : 'HR Specialist',
              joinDate: new Date(),
              employmentStatus: 'ACTIVE',
            },
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
              position: true,
              userId: true,
            },
          });
          employee = createdEmp;
        } catch (err) {
          console.error('Auto-provisioning employee in AuthService login failed:', err);
        }
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: `User ${user.email} (${user.role}) logged in successfully`,
      metadata: { email: user.email, role: user.role },
      ipAddress,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        employee: {
          include: {
            department: true,
            shift: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.employee && user.email) {
      let matchedEmployee = await this.prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: { equals: user.email, mode: 'insensitive' } },
          ],
        },
        include: {
          department: true,
          shift: true,
        },
      });

      if (!matchedEmployee) {
        const username = user.email.split('@')[0].trim();
        if (username) {
          const unlinked = await this.prisma.employee.findFirst({
            where: {
              userId: null,
              email: { startsWith: username, mode: 'insensitive' },
            },
            include: {
              department: true,
              shift: true,
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
      } else if (user.role === 'ADMIN' || user.role === 'HR') {
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

          const rolePrefix = user.role === 'ADMIN' ? 'ADM' : 'HR';
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
              position: user.role === 'ADMIN' ? 'System Administrator' : 'HR Specialist',
              joinDate: new Date(),
              employmentStatus: 'ACTIVE',
            },
            include: {
              department: true,
              shift: true,
            },
          });
          (user as any).employee = createdEmp;
        } catch (err) {
          console.error('Auto-provisioning employee in getProfile failed:', err);
        }
      }
    }

    return user;
  }
}
