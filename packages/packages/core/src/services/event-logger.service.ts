import { PrismaClient } from '@prisma/client';
import { EventType, EventMetadata } from '@app/types';

export class EventLoggerService {
  constructor(private prisma: PrismaClient) {}

  async logEvent(params: {
    type: EventType;
    actorId: string;
    itemId?: string;
    orderId?: string;
    requestId?: string;
    metadata: EventMetadata;
  }) {
    return this.prisma.event.create({
      data: {
        type: params.type,
        actor: { connect: { id: params.actorId } },
        item: params.itemId ? { connect: { id: params.itemId } } : undefined,
        order: params.orderId ? { connect: { id: params.orderId } } : undefined,
        request: params.requestId ? { connect: { id: params.requestId } } : undefined,
        metadata: params.metadata
      }
    });
  }
} 