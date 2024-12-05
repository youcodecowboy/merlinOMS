import { PrismaClient } from '@prisma/client';
import { TestFactories } from '../factories';
import { OrderAcceptanceService } from '../../services/order-acceptance.service';
import { InventoryAssignmentService } from '../../services/inventory-assignment.service';
import { WaitlistService } from '../../services/waitlist.service';

describe('Order Flow Integration Tests', () => {
  let prisma: PrismaClient;
  let factories: TestFactories;
  let orderAcceptance: OrderAcceptanceService;
  let inventoryAssignment: InventoryAssignmentService;
  let waitlist: WaitlistService;

  beforeAll(async () => {
    prisma = new PrismaClient();
    factories = new TestFactories();
    // Initialize services...
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.order.deleteMany(),
      prisma.inventoryItem.deleteMany(),
      prisma.customer.deleteMany()
    ]);
  });

  test('Complete order flow with available inventory', async () => {
    // Create test data
    const order = factories.createRandomOrder();
    const inventoryItem = factories.createRandomInventoryItem();
    
    // Create inventory
    await prisma.inventoryItem.create({
      data: inventoryItem
    });

    // Process order
    const createdOrder = await orderAcceptance.processOrder(order);
    const assignment = await inventoryAssignment.assignInventoryToOrder(
      createdOrder.id,
      'test-actor'
    );

    // Assertions
    expect(assignment.success).toBe(true);
    expect(assignment.action).toBe('direct_assignment');

    // Verify status updates
    const updatedItem = await prisma.inventoryItem.findFirst({
      where: { id: assignment.itemId }
    });
    expect(updatedItem?.status2).toBe('ASSIGNED');
  });

  test('Order flow with waitlist creation', async () => {
    // Create order without matching inventory
    const order = factories.createRandomOrder();
    
    // Process order
    const createdOrder = await orderAcceptance.processOrder(order);
    const assignment = await inventoryAssignment.assignInventoryToOrder(
      createdOrder.id,
      'test-actor'
    );

    // Verify waitlist
    const waitlistEntry = await waitlist.getWaitlistedOrder(createdOrder.id);
    expect(waitlistEntry).toBeTruthy();
  });
}); 