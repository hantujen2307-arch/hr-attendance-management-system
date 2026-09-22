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

    // If user.employee relation is not populated directly, resolve by email or userId
    if (!user.employee && user.email) {
      const matchedEmployee = await this.prisma.employee.findFirst({
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
