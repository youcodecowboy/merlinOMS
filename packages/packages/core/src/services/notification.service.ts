import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  NotificationType,
  UserRole,
  EventType
} from '@app/types';
import { TypeValidator } from '@app/utils';
import { EventLoggerService } from './event-logger.service';

interface NotificationCreationParams {
  type: NotificationType;
  message: string;
  userId?: string;
  userRole?: UserRole;
  requestId?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService
  ) {}

  async createNotification(params: NotificationCreationParams): Promise<ServiceResponse<any>> {
    const { type, message, userId, userRole, requestId, metadata } = params;

    return this.prisma.$transaction(async (tx) => {
      // If userRole is provided, send to all users with that role
      if (userRole) {
        const users = await tx.user.findMany({
          where: { role: userRole }
        });

        const notifications = await Promise.all(
          users.map(user =>
            tx.notification.create({
              data: {
                type,
                message,
                user: { connect: { id: user.id } },
                metadata: metadata || {}
              }
            })
          )
        );

        await this.eventLogger.logEvent({
          type: 'NOTIFICATION_CREATED',
          actorId: 'SYSTEM',
          metadata: {
            notification_type: type,
            user_role: userRole,
            recipients_count: users.length
          }
        });

        return {
          success: true,
          data: notifications
        };
      }

      // Single user notification
      if (!userId) {
        return {
          success: false,
          error: 'Either userId or userRole must be provided'
        };
      }

      const notification = await tx.notification.create({
        data: {
          type,
          message,
          user: { connect: { id: userId } },
          request: requestId ? { connect: { id: requestId } } : undefined,
          metadata: metadata || {}
        }
      });

      await this.eventLogger.logEvent({
        type: 'NOTIFICATION_CREATED',
        actorId: 'SYSTEM',
        metadata: {
          notification_type: type,
          user_id: userId,
          request_id: requestId
        }
      });

      return {
        success: true,
        data: notification
      };
    });
  }

  async markAsRead(params: {
    notificationId: string;
    userId: string;
  }): Promise<ServiceResponse<any>> {
    const { notificationId, userId } = params;

    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      return {
        success: false,
        error: 'Notification not found'
      };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });

    await this.eventLogger.logEvent({
      type: 'NOTIFICATION_ACKNOWLEDGED',
      actorId: userId,
      metadata: {
        notification_id: notificationId,
        notification_type: notification.type
      }
    });

    return {
      success: true,
      data: { acknowledged: true }
    };
  }

  async getUserNotifications(params: {
    userId: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ServiceResponse<any>> {
    const { userId, unreadOnly = false, limit = 20, offset = 0 } = params;

    const notifications = await this.prisma.notification.findMany({
      where: {
        user_id: userId,
        ...(unreadOnly ? { read: false } : {})
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit,
      skip: offset
    });

    const total = await this.prisma.notification.count({
      where: {
        user_id: userId,
        ...(unreadOnly ? { read: false } : {})
      }
    });

    return {
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          limit,
          offset
        }
      }
    };
  }
} 