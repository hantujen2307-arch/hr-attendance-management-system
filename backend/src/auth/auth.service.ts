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
      const matchedEmployee = await this.prisma.employee.findFirst({
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
      const matchedEmployee = await this.prisma.employee.findFirst({
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
      }
    }

    return user;
  }
}
