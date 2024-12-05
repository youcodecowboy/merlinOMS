import request from 'supertest';
import express from 'express';
import { prismaMock } from '../../../jest.setup';
import { orderRoutes } from '../order.routes';
import { createMockUser, createMockOrder } from '../../utils/__tests__/test-helpers';
import { errorMiddleware } from '../../middleware/error.middleware';
import { Prisma, OrderStatus } from '@prisma/client';
import { OrderFulfillmentService } from '../../services/order/order-fulfillment.service';

// Mock auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = createMockUser();
    next();
  })
}));

// Mock OrderFulfillmentService
jest.mock('../../services/order/order-fulfillment.service');

describe('Order Routes', () => {
  let app: express.Express;
  let mockOrderService: jest.Mocked<OrderFulfillmentService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/orders', orderRoutes);
    app.use(errorMiddleware);
    jest.clearAllMocks();

    mockOrderService = new OrderFulfillmentService() as jest.Mocked<OrderFulfillmentService>;
    (OrderFulfillmentService as jest.Mock).mockImplementation(() => mockOrderService);
  });

  describe('POST /orders', () => {
    const validOrderData = {
      shopify_id: 'SHOP-123',
      customer_id: 'CUST-123',
      items: [
        {
          target_sku: 'TEST-SKU-001',
          quantity: 2
        }
      ]
    };

    it('should create order successfully', async () => {
      // Mock customer check
      prismaMock.customer.findUnique.mockResolvedValue({
        id: 'CUST-123',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Use createMockOrder helper with proper types
      const mockOrder = {
        id: 'order-123',
        shopify_id: 'SHOP-123',
        customer_id: 'CUST-123',
        status: 'NEW' as const,
        metadata: {} as Prisma.JsonValue,
        created_at: new Date(),
        updated_at: new Date(),
        order_items: [
          {
            id: 'item-1',
            order_id: 'order-123',
            target_sku: 'TEST-SKU-001',
            quantity: 2,
            status: 'NEW',
            assigned_item_id: null,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      };

      prismaMock.order.create.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/orders')
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('NEW');
      expect(response.body.order_items).toHaveLength(1);
    });

    it('should reject non-existent customer', async () => {
      prismaMock.customer.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/orders')
        .send(validOrderData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          shopify_id: '',
          items: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /orders', () => {
    it('should list orders with pagination', async () => {
      const mockOrders = [
        {
          id: 'order-123',
          shopify_id: 'SHOP-123',
          customer_id: 'CUST-123',
          status: OrderStatus.NEW,
          metadata: {} as Prisma.JsonValue,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'order-124',
          shopify_id: 'SHOP-124', 
          customer_id: 'CUST-124',
          status: OrderStatus.PROCESSING,
          metadata: {} as Prisma.JsonValue,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.order.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/orders')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter orders by status', async () => {
      const mockOrders = [
        { ...createMockOrder(), status: 'NEW' as const }
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);
      prismaMock.order.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/orders')
        .query({ status: 'NEW' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('NEW');
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order details', async () => {
      const mockOrder = {
        id: 'order-123',
        shopify_id: 'SHOP-123',
        customer_id: 'CUST-123',
        status: OrderStatus.NEW,
        metadata: {} as Prisma.JsonValue,
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

      const response = await request(app)
        .get(`/orders/${mockOrder.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mockOrder.id);
      expect(response.body.order_items).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/orders/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('PUT /orders/:id/status', () => {
    it('should process order using OrderFulfillmentService', async () => {
      const mockOrder = createMockOrder({ id: 'order-123' });
      
      // Mock the service response with proper shape
      const mockServiceResponse = {
        orderId: mockOrder.id,
        status: OrderStatus.PROCESSING,
        items: [],
        shippingDetails: {
          courier: 'MOCK_COURIER'
        }
      };

      // Setup the mock service
      const mockService = new OrderFulfillmentService() as jest.Mocked<OrderFulfillmentService>;
      mockService.processOrder = jest.fn().mockResolvedValue(mockServiceResponse);
      (OrderFulfillmentService as jest.Mock).mockImplementation(() => mockService);

      const response = await request(app)
        .put(`/orders/${mockOrder.id}/status`)
        .send({ status: 'PROCESSING' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockServiceResponse); // Compare full response
      expect(mockService.processOrder).toHaveBeenCalledWith(mockOrder.id);
    });

    it('should update order status directly for non-processing status', async () => {
      const mockOrder = createMockOrder({ id: 'order-123' });
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'COMPLETED'
      });

      const response = await request(app)
        .put(`/orders/${mockOrder.id}/status`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
      expect(mockOrderService.processOrder).not.toHaveBeenCalled();
    });

    it('should validate status value', async () => {
      const response = await request(app)
        .put('/orders/order-123/status')
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
}); 