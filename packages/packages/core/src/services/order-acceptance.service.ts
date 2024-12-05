import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  ValidationResult,
  RequestType,
  RequestStatus,
  EventType
} from '@app/types';
import { TypeValidator } from '@app/utils';
import { EventLoggerService } from './event-logger.service';
import { ValidationService } from './validation.service';
import { SKUService } from './sku.service';
import { InventoryAssignmentService } from './inventory-assignment.service';

interface OrderCreationParams {
  shopifyId: string;
  customerId: string;
  orderItems: Array<{
    targetSKU: string;
    quantity: number;
  }>;
  metadata?: Record<string, any>;
}

export class OrderAcceptanceService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private validation: ValidationService,
    private skuService: SKUService,
    private inventoryAssignment: InventoryAssignmentService
  ) {}

  async processOrder(params: OrderCreationParams): Promise<ServiceResponse<any>> {
    const { shopifyId, customerId, orderItems, metadata } = params;

    return this.prisma.$transaction(async (tx) => {
      // Validate order data
      const validation = await this.validation.validateOrder({
        shopifyId,
        customerId,
        orderItems
      });

      if (!validation.valid) {
        throw new Error(`Invalid order data: ${validation.errors.join(', ')}`);
      }

      // Create order
      const order = await tx.order.create({
        data: {
          shopify_id: shopifyId,
          status: 'PENDING_ASSIGNMENT',
          customer: { connect: { id: customerId } },
          metadata: metadata || {},
          order_items: {
            create: orderItems.map(item => ({
              target_sku: item.targetSKU,
              status: 'PENDING'
            }))
          }
        },
        include: {
          order_items: true,
          customer: true
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'ORDER_CREATED',
        actorId: 'SYSTEM',
        orderId: order.id,
        metadata: {
          shopify_id: shopifyId,
          customer_id: customerId,
          items_count: orderItems.length
        }
      });

      // Try immediate inventory assignment
      const assignment = await this.inventoryAssignment.assignInventoryToOrder(
        order.id,
        'SYSTEM'
      );

      if (assignment.success) {
        await this.eventLogger.logEvent({
          type: 'INVENTORY_ASSIGNED',
          actorId: 'SYSTEM',
          orderId: order.id,
          itemId: assignment.itemId,
          metadata: {
            assignment_type: assignment.action
          }
        });
      }

      return {
        success: true,
        data: order,
        metadata: {
          assignment_result: assignment
        }
      };
    });
  }

  // ... rest of the service methods
} 