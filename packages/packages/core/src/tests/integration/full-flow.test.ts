import { PrismaClient } from '@prisma/client';
import { CustomerService } from '../../services/customer.service';
import { OrderAcceptanceService } from '../../services/order-acceptance.service';
import { InventoryAssignmentService } from '../../services/inventory-assignment.service';
import { WashRequestService } from '../../services/wash-request.service';
import { QCService } from '../../services/qc.service';
import { PackingService } from '../../services/packing.service';
import { ShippingService } from '../../services/shipping.service';
import { EventLoggerService } from '../../services/event-logger.service';

describe('End to End Order Flow', () => {
  const prisma = new PrismaClient();
  const eventLogger = new EventLoggerService(prisma);
  
  // Initialize services
  const customerService = new CustomerService(prisma);
  const orderService = new OrderAcceptanceService(prisma, eventLogger);
  const inventoryService = new InventoryAssignmentService(prisma);
  const washService = new WashRequestService(prisma, eventLogger);
  const qcService = new QCService(prisma, eventLogger);
  const packingService = new PackingService(prisma, eventLogger);
  const shippingService = new ShippingService(prisma, eventLogger);

  const TEST_ACTOR = 'test-actor-id';

  beforeAll(async () => {
    // Clean up database
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.inventoryItem.deleteMany();
  });

  it('should process an order from creation to shipping', async () => {
    // 1. Create Customer
    const customer = await customerService.createCustomer({
      email: 'test@example.com',
      profile: {
        firstName: 'Test',
        lastName: 'Customer',
        phoneNumber: '123-456-7890'
      }
    });
    expect(customer.success).toBe(true);
    
    // 2. Create Order
    const order = await orderService.processOrder({
      shopifyId: 'TEST-1234',
      customerId: customer.data.id,
      orderItems: [{
        targetSKU: 'ST-32-X-34-IND',
        quantity: 1
      }]
    });
    expect(order.success).toBe(true);
    
    // 3. Track Inventory Assignment
    const assignment = await inventoryService.assignInventoryToOrder(
      order.data.id,
      TEST_ACTOR
    );
    expect(assignment.success).toBe(true);
    
    if (assignment.action === 'direct_assignment') {
      // 4. Create Wash Request
      const washRequest = await washService.createWashRequest({
        itemId: assignment.itemId!,
        orderId: order.data.id,
        actorId: TEST_ACTOR
      });
      expect(washRequest.success).toBe(true);

      // 5. Complete Wash
      await washService.completeWash({
        requestId: washRequest.data.id,
        actorId: TEST_ACTOR
      });

      // 6. Create QC Request
      const qcRequest = await qcService.createQCRequest({
        itemId: assignment.itemId!,
        priority: 'MEDIUM',
        actorId: TEST_ACTOR
      });
      expect(qcRequest.success).toBe(true);

      // 7. Pass QC
      await qcService.completeQC({
        requestId: qcRequest.data.id,
        passed: true,
        notes: 'Passed QC inspection',
        actorId: TEST_ACTOR
      });

      // 8. Create Packing Request
      const packingRequest = await packingService.createPackingRequest({
        itemIds: [assignment.itemId!],
        orderId: order.data.id,
        instructions: {
          packingType: 'SINGLE',
          requiresBox: true
        },
        actorId: TEST_ACTOR
      });
      expect(packingRequest.success).toBe(true);

      // 9. Complete Packing
      await packingService.validatePackingStep({
        requestId: packingRequest.data.id,
        step: 'itemsVerified',
        actorId: TEST_ACTOR
      });

      // 10. Create Shipping Label
      const shipping = await shippingService.createLabel({
        orderId: order.data.id,
        carrier: 'USPS',
        service: 'Priority',
        packageDetails: {
          weight: 1,
          dimensions: {
            length: 12,
            width: 8,
            height: 4
          }
        },
        actorId: TEST_ACTOR
      });
      expect(shipping.success).toBe(true);

      // 11. Mark as Shipped
      const shipped = await shippingService.markAsShipped({
        orderId: order.data.id,
        trackingNumber: shipping.data.trackingNumber,
        carrier: 'USPS',
        shippedAt: new Date(),
        actorId: TEST_ACTOR
      });
      expect(shipped.success).toBe(true);

      // 12. Verify Final Order Status
      const finalOrder = await prisma.order.findUnique({
        where: { id: order.data.id },
        include: {
          order_items: true,
          events: true
        }
      });

      expect(finalOrder?.status).toBe('SHIPPED');
    }
  });
}); 