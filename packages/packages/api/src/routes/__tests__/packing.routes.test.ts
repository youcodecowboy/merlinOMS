import request from 'supertest';
import express, { Express } from 'express';
import { prismaMock } from '../../../jest.setup';
import { packingRoutes } from '../packing.routes';
import { 
  createMockUser, 
  createMockRequest, 
  createMockInventoryItem,
  createMockOrder,
  createMockBin 
} from '../../utils/__tests__/test-helpers';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { PackingRequestHandler } from '../../services/request/handlers/packing.handler';

// Mock the auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = createMockUser();
    next();
  })
}));

// Mock the PackingRequestHandler
jest.mock('../../services/request/handlers/packing.handler', () => {
  return {
    PackingRequestHandler: jest.fn().mockImplementation(() => ({
      validateOrder: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      })),
      validateItemScan: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      })),
      assignBin: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      }))
    }))
  };
});

describe('Packing Routes', () => {
  let app: Express;
  let mockHandler: jest.Mocked<PackingRequestHandler>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/packing', packingRoutes);
    app.use(errorMiddleware);
    jest.clearAllMocks();

    mockHandler = new PackingRequestHandler() as jest.Mocked<PackingRequestHandler>;
  });

  describe('POST /packing/create', () => {
    it('should create packing request successfully', async () => {
      // Arrange
      const mockOrder = createMockOrder({
        status: 'READY_FOR_PACKING'
      });
      const mockRequest = createMockRequest({
        type: 'PACKING',
        status: 'PENDING',
        metadata: {
          order_id: mockOrder.id,
          items_count: 5
        }
      });

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.request.create.mockResolvedValue(mockRequest);

      // Act
      const response = await request(app)
        .post('/packing/create')
        .send({
          orderId: mockOrder.id,
          itemsCount: 5
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: mockRequest.id,
        type: 'PACKING',
        status: 'PENDING',
        metadata: expect.objectContaining({
          order_id: mockOrder.id,
          items_count: 5
        })
      });
    });

    it('should reject invalid order status', async () => {
      // Arrange
      const mockOrder = createMockOrder({
        status: 'IN_PROGRESS'
      });

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      // Act
      const response = await request(app)
        .post('/packing/create')
        .send({
          orderId: mockOrder.id,
          itemsCount: 5
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_ORDER_STATUS',
          message: 'Order is not ready for packing'
        }
      });
    });

    it('should validate request body', async () => {
      // Act
      const response = await request(app)
        .post('/packing/create')
        .send({
          orderId: '',
          itemsCount: -1
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('required')
        }
      });
    });
  });

  describe('PUT /packing/:id/scan-item', () => {
    it('should validate item scan successfully', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockItem = createMockInventoryItem({
        status1: 'READY_FOR_PACKING',
        qr_code: 'ITEM-123'
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);

      // Act
      const response = await request(app)
        .put(`/packing/${mockRequest.id}/scan-item`)
        .send({
          itemQrCode: mockItem.qr_code
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        request: expect.any(Object)
      });
    });

    it('should reject item not ready for packing', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockItem = createMockInventoryItem({
        status1: 'IN_USE',
        qr_code: 'ITEM-123'
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);

      // Act
      const response = await request(app)
        .put(`/packing/${mockRequest.id}/scan-item`)
        .send({
          itemQrCode: mockItem.qr_code
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'ITEM_NOT_READY',
          message: 'Item is not ready for packing'
        }
      });
    });
  });

  describe('PUT /packing/:id/assign-bin', () => {
    it('should assign bin successfully', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockBin = createMockBin({
        capacity: 10,
        current_count: 5
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.bin.findUnique.mockResolvedValue(mockBin);

      // Act
      const response = await request(app)
        .put(`/packing/${mockRequest.id}/assign-bin`)
        .send({
          binId: mockBin.id
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        request: expect.any(Object)
      });
    });

    it('should reject full bin', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockBin = createMockBin({
        capacity: 10,
        current_count: 10
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.bin.findUnique.mockResolvedValue(mockBin);

      // Act
      const response = await request(app)
        .put(`/packing/${mockRequest.id}/assign-bin`)
        .send({
          binId: mockBin.id
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'BIN_FULL',
          message: 'Bin capacity exceeded'
        }
      });
    });
  });
}); 