import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeMetadata(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeMetadata(item));
    }

    const sensitiveKeys = new Set([
      'password',
      'passwordhash',
      'token',
      'accesstoken',
      'access_token',
      'authtoken',
      'auth_token',
      'secret',
      'jwtsecret',
      'jwt_secret',
    ]);

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (
        typeof value === 'string' &&
        (value.startsWith('data:image/') || value.length > 500)
      ) {
        sanitized[key] = '[TRUNCATED_DATA]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  async log(params: {
    userId?: string;
    action: string;
    details?: string;
    metadata?: any;
    ipAddress?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          details: params.details,
          metadata: params.metadata ? this.sanitizeMetadata(params.metadata) : undefined,
          ipAddress: params.ipAddress,
        },
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
      return null;
    }
  }

  async findAll(limit: number = 50) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
      },
    });
  }
}
