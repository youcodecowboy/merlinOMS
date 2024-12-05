import { PrismaClient } from '@prisma/client';
import logger from './logger';

export interface AuditLog {
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ip?: string;
}

export class AuditLogger {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async log(data: AuditLog) {
    try {
      await this.prisma.event.create({
        data: {
          type: data.action,
          actor_id: data.userId,
          metadata: {
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            details: data.details,
            ip: data.ip
          }
        }
      });

      logger.info('Audit log created', { ...data });
    } catch (error) {
      logger.error('Failed to create audit log', { error, data });
    }
  }
}

export const auditLogger = new AuditLogger(); 