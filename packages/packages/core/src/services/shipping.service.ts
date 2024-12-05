import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  EventType,
  RequestStatus
} from '@app/types';
import { EventLoggerService } from './event-logger.service';
import { NotificationService } from './notification.service';

interface ShippingLabel {
  carrier: 'USPS' | 'UPS' | 'FEDEX';
  service: string;
  packageDetails: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
}

export class ShippingService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private notification: NotificationService
  ) {}

  async createLabel(params: {
    orderId: string;
    carrier: 'USPS' | 'UPS' | 'FEDEX';
    service: string;
    packageDetails: {
      weight: number;
      dimensions: {
        length: number;
        width: number;
        height: number;
      };
    };
    actorId: string;
  }): Promise<ServiceResponse<any>> {
    const { orderId, carrier, service, packageDetails, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Get order with items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            include: { profile: true }
          },
          order_items: {
            include: { assigned_item: true }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Validate order is ready for shipping
      if (order.status !== 'PACKED') {
        throw new Error('Order must be packed before shipping');
      }

      // Create shipping label through carrier API
      const labelData = await this.generateCarrierLabel({
        carrier,
        service,
        packageDetails,
        order
      });

      // Update order with shipping info
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'LABEL_CREATED',
          metadata: {
            ...order.metadata,
            shipping: {
              carrier,
              service,
              label_id: labelData.labelId,
              tracking_number: labelData.trackingNumber,
              label_created_at: new Date(),
              label_created_by: actorId,
              package_details: packageDetails
            }
          }
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'SHIPPING_LABEL_CREATED',
        actorId,
        orderId,
        metadata: {
          carrier,
          service,
          tracking_number: labelData.trackingNumber,
          package_details: packageDetails
        }
      });

      // Notify customer
      await this.notification.createNotification({
        type: 'LABEL_CREATED',
        message: `Shipping label created for order ${order.shopify_id}`,
        userId: order.customer_id,
        metadata: {
          carrier,
          tracking_number: labelData.trackingNumber
        }
      });

      return {
        success: true,
        data: {
          labelUrl: labelData.labelUrl,
          trackingNumber: labelData.trackingNumber
        }
      };
    });
  }

  async markAsShipped(params: {
    orderId: string;
    trackingNumber: string;
    carrier: string;
    shippedAt: Date;
    actorId: string;
  }): Promise<ServiceResponse<any>> {
    const { orderId, trackingNumber, carrier, shippedAt, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          order_items: {
            include: { assigned_item: true }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'SHIPPED',
          metadata: {
            ...order.metadata,
            shipping: {
              ...order.metadata.shipping,
              shipped_at: shippedAt,
              shipped_by: actorId
            }
          }
        }
      });

      // Update inventory items
      await tx.inventoryItem.updateMany({
        where: {
          id: {
            in: order.order_items.map(item => item.assigned_item?.id).filter(Boolean)
          }
        },
        data: {
          status1: 'SHIPPED',
          status2: 'COMPLETED'
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'ORDER_SHIPPED',
        actorId,
        orderId,
        metadata: {
          tracking_number: trackingNumber,
          carrier,
          shipped_at: shippedAt
        }
      });

      // Notify customer
      await this.notification.createNotification({
        type: 'ORDER_SHIPPED',
        message: `Your order ${order.shopify_id} has been shipped!`,
        userId: order.customer_id,
        metadata: {
          tracking_number: trackingNumber,
          carrier,
          shipped_at: shippedAt
        }
      });

      return {
        success: true,
        data: {
          status: 'SHIPPED',
          trackingNumber,
          carrier,
          shippedAt
        }
      };
    });
  }

  private async generateCarrierLabel(params: {
    carrier: string;
    service: string;
    packageDetails: any;
    order: any;
  }): Promise<{
    labelId: string;
    labelUrl: string;
    trackingNumber: string;
  }> {
    // TODO: Implement carrier-specific label generation
    // This is a mock implementation
    return {
      labelId: `LBL${Date.now()}`,
      labelUrl: `https://shipping.example.com/labels/LBL${Date.now()}.pdf`,
      trackingNumber: `TRK${Date.now()}`
    };
  }

  async getShippingQueue(): Promise<ServiceResponse<any>> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PACKED'
      },
      include: {
        customer: true,
        order_items: {
          include: { assigned_item: true }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    return {
      success: true,
      data: orders
    };
  }
} 