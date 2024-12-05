import { OrderFulfillmentService } from '../order-fulfillment.service';
import { prismaMock } from '../../../../jest.setup';
import { APIError } from '../../../utils/errors';
import { OrderStatus } from '@prisma/client';
import { SKUService } from '../../sku/sku.service';
import { BinService } from '../../bin/bin.service';

// Mock SKU and Bin services
jest.mock('../../sku/sku.service');
jest.mock('../../bin/bin.service');

describe('OrderFulfillmentService', () => {
  let service: OrderFulfillmentService;
  let mockSKUService: jest.Mocked<SKUService>;
  let mockBinService: jest.Mocked<BinService>;

  beforeEach(() => {
    service = new OrderFulfillmentService();
    (service as any).prisma = prismaMock;

    // Setup service mocks
    mockSKUService = new SKUService() as jest.Mocked<SKUService>;
    mockBinService = new BinService() as jest.Mocked<BinService>;
    
    // Inject mocked services
    (service as any).skuService = mockSKUService;
    (service as any).binService = mockBinService;

    // Setup default successful responses
    (mockSKUService.findMatchingSKU as jest.Mock).mockResolvedValue({ sku: 'TEST-SKU-001' });
    (mockBinService.allocateBin as jest.Mock).mockResolvedValue({ id: 'bin-123', code: 'BIN-001' });

    jest.clearAllMocks();
  });

  describe('processOrder', () => {
    it('should process order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        shopify_id: 'SHOP-123',
        customer_id: 'CUST-123',
        status: OrderStatus.NEW,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
        order_items: [
          {
            id: 'item-1',
            order_id: 'order-123',
            target_sku: 'TEST-SKU-001',
            quantity: 2,
            status: OrderStatus.NEW,
            assigned_item_id: null,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PROCESSING
      });

      const result = await service.processOrder('order-123');

      expect(result.status).toBe(OrderStatus.PROCESSING);
      expect(result.items).toHaveLength(1);
      expect(result.shippingDetails).toBeDefined();
      expect(result.shippingDetails?.courier).toBe('MOCK_COURIER');
    });

    it('should throw error for non-existent order', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(service.processOrder('non-existent'))
        .rejects
        .toThrow(new APIError(404, 'ORDER_NOT_FOUND', 'Order not found'));
    });

    it('should throw error for already processed order', async () => {
      const mockOrder = {
        id: 'order-123',
        status: OrderStatus.PROCESSING,
        shopify_id: 'shop-123',
        customer_id: 'cust-123',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
        order_items: []
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.processOrder(mockOrder.id))
        .rejects
        .toThrow(new APIError(400, 'INVALID_ORDER_STATUS', 'Order is already being processed'));
    });

    it('should handle SKU matching failure', async () => {
      const mockOrder = {
        id: 'order-123',
        status: OrderStatus.NEW,
        shopify_id: 'shop-123',
        customer_id: 'cust-123',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
        order_items: [
          {
            id: 'item-1',
            order_id: 'order-123',
            target_sku: 'INVALID-SKU',
            quantity: 1,
            status: OrderStatus.NEW,
            assigned_item_id: null,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      };

      // Setup SKU service to return null for this test
      (mockSKUService.findMatchingSKU as jest.Mock).mockResolvedValue(null);

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.processOrder(mockOrder.id))
        .rejects
        .toThrow(new APIError(404, 'SKU_NOT_FOUND', 'No matching SKU found for INVALID-SKU'));
    });
  });
}); 