import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a notification for a specific user with strict idempotency protection.
   */
  async create(dto: CreateNotificationDto) {
    // 1. If idempotency key provided, check if already dispatched
    if (dto.idempotencyKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          idempotencyKey: dto.idempotencyKey,
          isRead: false,
        },
      });

      return notification;
    } catch (err: any) {
      // Catch unique constraint violation on idempotencyKey gracefully
      if (err.code === 'P2002' && dto.idempotencyKey) {
        const existing = await this.prisma.notification.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * Dispatches notifications to multiple users at once.
   */
  async createBulk(
    userIds: string[],
    data: Omit<CreateNotificationDto, 'userId'>,
  ) {
    if (!userIds || userIds.length === 0) return [];

    const uniqueUserIds = Array.from(new Set(userIds));

    const notifications = await Promise.all(
      uniqueUserIds.map((userId) =>
        this.create({
          ...data,
          userId,
          idempotencyKey: data.idempotencyKey
            ? `${data.idempotencyKey}_${userId}`
            : undefined,
        }),
      ),
    );

    return notifications;
  }

  /**
   * Retrieve paginated notifications belonging exclusively to the authenticated user.
   */
  async findAll(userId: string, query: QueryNotificationDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const isOnlyUnread = query.unreadOnly === true || query.isRead === false;
    const isOnlyRead = query.isRead === true;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(isOnlyUnread ? { isRead: false } : isOnlyRead ? { isRead: true } : {}),
      ...(query.type && query.type !== 'ALL' ? { type: query.type } : {}),
    };

    const [total, unreadCount, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        unreadCount,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Lightweight endpoint to retrieve unread notification count.
   */
  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }

  /**
   * Mark a single notification as read, validating user ownership.
   */
  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification with ID '${id}' not found`);
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Mark all notifications belonging to the user as read.
   */
  async markAllAsRead(userId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return {
      success: true,
      count: result.count,
    };
  }

  /**
   * Broadcast an announcement notification to target users (Admin/HR only).
   */
  async broadcast(dto: BroadcastNotificationDto, senderUser?: any) {
    const userWhere: Prisma.UserWhereInput = {};
    const effectiveRole = dto.targetRole || dto.role;
    if (effectiveRole && (effectiveRole as string) !== 'ALL') {
      userWhere.role = effectiveRole as UserRole;
    }

    const targetUsers = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    const userIds = targetUsers.map((u) => u.id);

    const created = await this.createBulk(userIds, {
      type: dto.type || 'SYSTEM',
      title: dto.title,
      message: dto.message,
      referenceType: 'SYSTEM',
    });

    await this.auditService.log({
      userId: senderUser?.id,
      action: 'NOTIFICATION_BROADCAST',
      details: `Broadcast notification sent to ${created.length} users: '${dto.title}'`,
      metadata: { targetRole: effectiveRole || 'ALL', count: created.length },
    });

    return {
      success: true,
      count: created.length,
      dispatchedCount: created.length,
    };
  }
}
