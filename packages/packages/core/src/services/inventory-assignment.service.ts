import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  RequestType,
  RequestStatus,
  EventType
} from '@app/types';
import { SKUService } from './sku.service';
import { EventLoggerService } from './event-logger.service';

interface AssignmentResult {
  success: boolean;
  action: 'direct_assignment' | 'universal_assignment' | 'production_request';
  itemId?: string;
  message: string;
}

export class InventoryAssignmentService {
  constructor(
    private prisma: PrismaClient,
    private skuService: SKUService,
    private eventLogger: EventLoggerService
  ) {}

  async assignInventoryToOrder(orderId: string, actorId: string): Promise<{
    success: boolean;
    action: 'direct_assignment' | 'universal_assignment' | 'production_request';
    itemId?: string;
    message: string;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return {
        success: false,
        action: 'direct_assignment',
        message: 'Order not found'
      };
    }

    // Step 1: Try exact SKU match
    const exactMatch = await this.findExactMatch(order.target_sku);
    if (exactMatch) {
      await this.assignItemToOrder(exactMatch.id, orderId, actorId);
      return {
        success: true,
        action: 'direct_assignment',
        itemId: exactMatch.id,
        message: 'Exact SKU match found and assigned'
      };
    }

    // Step 2: Try universal SKU match
    const universalMatch = await this.findUniversalMatch(order.target_sku);
    if (universalMatch) {
      await this.assignItemToOrder(universalMatch.id, orderId, actorId);
      return {
        success: true,
        action: 'universal_assignment',
        itemId: universalMatch.id,
        message: 'Universal SKU match found and assigned'
      };
    }

    // Step 3: Create production request
    const universalSKU = this.skuService.getUniversalSKU(order.target_sku);
    if (!universalSKU) {
      return {
        success: false,
        action: 'production_request',
        message: 'Failed to generate universal SKU'
      };
    }

    await this.createPendingProduction(universalSKU, orderId, actorId);
    return {
      success: true,
      action: 'production_request',
      message: 'Created pending production request'
    };
  }

  private async findExactMatch(targetSKU: string) {
    return this.prisma.inventoryItem.findFirst({
      where: {
        sku: targetSKU,
        OR: [
          {
            status1: 'STOCK',
            status2: 'UNCOMMITTED'
          },
          {
            status1: 'PRODUCTION',
            status2: 'UNCOMMITTED'
          }
        ]
      },
      orderBy: {
        created_at: 'asc'
      }
    });
  }

  private async findUniversalMatch(targetSKU: string) {
    // Get all UNCOMMITTED items (both STOCK and PRODUCTION)
    const candidates = await this.prisma.inventoryItem.findMany({
      where: {
        OR: [
          {
            status1: 'STOCK',
            status2: 'UNCOMMITTED'
          },
          {
            status1: 'PRODUCTION',
            status2: 'UNCOMMITTED'
          }
        ]
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Find first candidate that can fulfill target SKU
    return candidates.find(item => 
      this.skuService.canFulfill(item.sku, targetSKU)
    );
  }

  private async assignItemToOrder(itemId: string, orderId: string, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!item) throw new Error('Item not found');

      if (item.status1 === 'PRODUCTION') {
        // For PRODUCTION items, do soft commitment
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { 
            status2: 'COMMITTED',
            metadata: {
              waitlisted_order_id: orderId,
              waitlisted_at: new Date()
            }
          }
        });

        // Update order status to PRODUCTION
        await tx.order.update({
          where: { id: orderId },
          data: { 
            status: 'IN_PRODUCTION',
            metadata: {
              committed_item_id: itemId,
              position: 1 // First in line for this item
            }
          }
        });

        // Log events
        await this.eventLogger.logEvent({
          type: 'ITEM_STATUS_CHANGED',
          actorId,
          itemId,
          orderId,
          metadata: {
            previous_status: 'UNCOMMITTED',
            new_status: 'COMMITTED',
            reason: 'Production item soft commitment'
          }
        });

      } else {
        // For STOCK items, do hard assignment and create wash request
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
        const washRequest = await tx.request.create({
          data: {
            type: 'WASH',
            status: 'PENDING',
            item_id: itemId,
            order_id: orderId,
            assigned_to: '2d40fc18-e02a-41f1-8c4e-92f770133029', // Warehouse user ID
            metadata: {
              order_item_id: orderItemId,
              requires_qr_scan: true,
              requires_bin_assignment: true,
              target_wash: targetWash,
              is_universal_match: isUniversalMatch,
              source: item.location || 'WAREHOUSE',
              sku: item.sku,
              target_sku: orderItem.target_sku,
              order_shopify_id: order.shopify_id,
              customer_name: order.customer?.profile?.metadata?.firstName 
                ? `${order.customer.profile.metadata.firstName} ${order.customer.profile.metadata.lastName}`
                : 'Unknown Customer',
              customer_email: order.customer?.email || 'unknown@example.com',
              assigned_at: new Date().toISOString()
            }
          }
        });

        // Log events
        await this.eventLogger.logEvent({
          type: 'ITEM_ASSIGNED',
          actorId,
          itemId,
          orderId,
          metadata: {
            previous_status: 'UNCOMMITTED',
            new_status: 'ASSIGNED'
          }
        });

        await this.eventLogger.logEvent({
          type: 'ORDER_STATUS_CHANGED',
          actorId,
          orderId,
          metadata: {
            previous_status: 'PENDING_ASSIGNMENT',
            new_status: 'ASSIGNED',
            reason: 'Item assigned'
          }
        });

        await this.eventLogger.logEvent({
          type: 'WASH_REQUEST_CREATED',
          actorId,
          itemId,
          orderId,
          requestId: washRequest.id,
          metadata: {
            wash_type: 'pending'
          }
        });
      }
    });
  }

  private async createPendingProduction(universalSKU: string, orderId: string, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      // Update order status to PENDING_PRODUCTION
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PENDING_PRODUCTION' }
      });

      // Check for existing pending production request
      const existingRequest = await tx.request.findFirst({
        where: {
          type: 'PATTERN',
          status: 'PENDING',
          metadata: {
            path: ['universal_sku'],
            equals: universalSKU
          }
        }
      });

      let productionRequest;
      if (existingRequest) {
        // Update existing request
        productionRequest = await tx.request.update({
          where: { id: existingRequest.id },
          data: {
            metadata: {
              ...existingRequest.metadata,
              order_ids: [...(existingRequest.metadata.order_ids || []), orderId],
              quantity: (existingRequest.metadata.quantity || 1) + 1
            }
          }
        });
      } else {
        // Create new production request
        productionRequest = await tx.request.create({
          data: {
            type: 'PATTERN',
            status: 'PENDING',
            order_id: orderId,
            metadata: {
              universal_sku: universalSKU,
              order_ids: [orderId],
              quantity: 1,
              requires_approval: true
            }
          }
        });
      }

      // Log events
      await this.eventLogger.logEvent({
        type: 'ORDER_STATUS_CHANGED',
        actorId,
        orderId,
        metadata: {
          previous_status: 'PENDING_ASSIGNMENT',
          new_status: 'PENDING_PRODUCTION',
          reason: 'No available inventory'
        }
      });

      await this.eventLogger.logEvent({
        type: 'PRODUCTION_REQUEST_CREATED',
        actorId,
        orderId,
        requestId: productionRequest.id,
        metadata: {
          universal_sku: universalSKU,
          quantity: productionRequest.metadata.quantity
        }
      });
    });
  }
} 