import { PrismaClient } from '@prisma/client';

export type EventType = 
  | 'ITEM_ASSIGNED'
  | 'WASH_REQUEST_CREATED'
  | 'PRODUCTION_REQUEST_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'REQUEST_STATUS_CHANGED'
  | 'ITEM_STATUS_CHANGED';

interface EventMetadata {
  [key: string]: any;
}

interface EventParams {
  type: EventType;
  actorId: string;
  itemId?: string;
  orderId?: string;
  requestId?: string;
  metadata: EventMetadata;
}

export class EventLoggerService {
  constructor(private prisma: PrismaClient) {}

  async logEvent(params: EventParams) {
    return this.prisma.event.create({
      data: {
        type: params.type,
        actor: { connect: { id: params.actorId } },
        ...(params.itemId && { item: { connect: { id: params.itemId } } }),
        ...(params.orderId && { order: { connect: { id: params.orderId } } }),
        ...(params.requestId && { request: { connect: { id: params.requestId } } }),
        metadata: params.metadata
      }
    });
  }
} 