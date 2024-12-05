import { PrismaClient } from '@prisma/client';
import { EventLoggerService } from './event-logger.service';

export class WaitlistService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService
  ) {}

  async addToWaitlist(params: {
    orderId: string;
    sku: string;
    actorId: string;
  }) {
    const { orderId, sku, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Find production items of this SKU
      const productionItems = await tx.inventoryItem.findMany({
        where: {
          sku,
          status1: 'PRODUCTION',
          status2: 'UNCOMMITTED'
        },
        orderBy: {
          created_at: 'asc'
        },
        take: 1
      });

      if (productionItems.length > 0) {
        // Soft commit the first available production item
        await tx.inventoryItem.update({
          where: { id: productionItems[0].id },
          data: {
            status2: 'COMMITTED',
            metadata: {
              ...productionItems[0].metadata,
              waitlisted_order_id: orderId,
              waitlisted_at: new Date()
            }
          }
        });

        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'WAITLISTED',
            metadata: {
              committed_item_id: productionItems[0].id,
              position: 1 // First in line for this item
            }
          }
        });

        // Log event
        await this.eventLogger.logEvent({
          type: 'ITEM_STATUS_CHANGED',
          actorId,
          itemId: productionItems[0].id,
          orderId,
          metadata: {
            previous_status: 'UNCOMMITTED',
            new_status: 'COMMITTED',
            reason: 'Waitlist soft commitment'
          }
        });
      } else {
        // No production items available, add to general waitlist
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'WAITLISTED',
            metadata: {
              waitlisted_sku: sku,
              waitlisted_at: new Date()
            }
          }
        });
      }
    });
  }

  async processProductionCompletion(params: {
    itemId: string;
    actorId: string;
  }) {
    const { itemId, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!item) throw new Error('Item not found');

      // Update item status from PRODUCTION to STOCK
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          status1: 'STOCK'
        }
      });

      // If item was committed (has waitlisted order)
      if (item.status2 === 'COMMITTED' && item.metadata.waitlisted_order_id) {
        const orderId = item.metadata.waitlisted_order_id;

        // Create hard assignment
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            status2: 'ASSIGNED',
            order_assignment: {
              connect: { id: orderId }
            }
          }
        });

        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'ASSIGNED',
            assigned_item_id: itemId
          }
        });

        // Create wash request
        const washRequest = await tx.washRequest.create({
          data: {
            status: 'PENDING',
            item_id: itemId,
            order_id: orderId,
            actor_id: actorId,
            current_step: 'FIND_UNIT',
            steps_completed: {}
          }
        });

        // Log events
        await this.eventLogger.logEvent({
          type: 'ITEM_STATUS_CHANGED',
          actorId,
          itemId,
          orderId,
          metadata: {
            previous_status: 'COMMITTED',
            new_status: 'ASSIGNED',
            reason: 'Production completion'
          }
        });

        await this.eventLogger.logEvent({
          type: 'WASH_REQUEST_CREATED',
          actorId,
          itemId,
          orderId,
          requestId: washRequest.id,
          metadata: {
            from_waitlist: true
          }
        });
      }
    });
  }
} 