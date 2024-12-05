import { BaseService } from '../base/base.service';
import { APIError } from '../../utils/errors';
import { Prisma } from '@prisma/client';
import { SKUService } from '../sku/sku.service';
import { BinService } from '../bin/bin.service';

// Use string literal type to match schema
type OrderStatus = 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

interface FulfillmentResult {
  orderId: string;
  status: OrderStatus;
  items: Array<{
    sku: string;
    quantity: number;
    binId?: string;
  }>;
  shippingDetails?: {
    courier: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
  };
}

export class OrderFulfillmentService extends BaseService {
  private skuService: SKUService;
  private binService: BinService;

  constructor() {
    super('OrderFulfillmentService');
    this.skuService = new SKUService();
    this.binService = new BinService();
  }

  async processOrder(orderId: string): Promise<FulfillmentResult> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          order_items: {
            select: {
              id: true,
              target_sku: true,
              quantity: true,
              status: true
            }
          }
        }
      });

      if (!order) {
        throw new APIError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (order.status !== 'NEW') {
        throw new APIError(400, 'INVALID_ORDER_STATUS', 'Order is already being processed');
      }

      const processedItems = await Promise.all(
        order.order_items.map(async (item) => {
          const matchedSKU = await this.skuService.findMatchingSKU(item.target_sku);
          if (!matchedSKU) {
            throw new APIError(404, 'SKU_NOT_FOUND', `No matching SKU found for ${item.target_sku}`);
          }

          const bin = await this.binService.allocateBin(matchedSKU.sku, item.quantity);

          return {
            sku: matchedSKU.sku,
            quantity: item.quantity,
            binId: bin.id
          };
        })
      );

      const shippingDetails = this.mockCourierIntegration();

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING' as OrderStatus,
          metadata: {
            shipping: shippingDetails
          }
        }
      });

      return {
        orderId: updatedOrder.id,
        status: updatedOrder.status as OrderStatus,
        items: processedItems,
        shippingDetails
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, 'PROCESSING_ERROR', 'Failed to process order');
    }
  }

  private mockCourierIntegration() {
    return {
      courier: 'MOCK_COURIER',
      trackingNumber: `TRACK-${Math.random().toString(36).substring(7)}`,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    };
  }

  protected async findExactSKU(): Promise<null> {
    return null;
  }

  protected async findUniversalSKU(): Promise<null> {
    return null;
  }
} 