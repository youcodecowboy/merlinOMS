import request from 'supertest';
import express, { Express } from 'express';
import { prismaMock } from '../../../jest.setup';
import { moveRoutes } from '../move.routes';
import { createMockUser, createMockRequest, createMockInventoryItem } from '../../utils/__tests__/test-helpers';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { MoveRequestHandler } from '../../services/request/handlers/move.handler';

// Mock the auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = createMockUser();
    next();
  })
}));

// Mock the MoveRequestHandler class
jest.mock('../../services/request/handlers/move.handler', () => {
  return {
    MoveRequestHandler: jest.fn().mockImplementation(() => ({
      validateItemScan: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      })),
      validateDestinationScan: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      }))
    }))
  };
});

describe('Move Routes', () => {
  let app: Express;
  let mockHandler: jest.Mocked<MoveRequestHandler>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/move', moveRoutes);
    app.use(errorMiddleware);
    jest.clearAllMocks();

    // Get instance of mocked handler
    mockHandler = new MoveRequestHandler() as jest.Mocked<MoveRequestHandler>;
  });

  describe('POST /move/create', () => {
    it('should create move request successfully', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockItem = createMockInventoryItem({
        status1: 'AVAILABLE',
        location: 'WAREHOUSE-A'
      });
      const mockRequest = createMockRequest({
        type: 'MOVE',
        status: 'PENDING',
        item_id: mockItem.id
      });

      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);
      prismaMock.request.create.mockResolvedValue(mockRequest);

      // Act
      const response = await request(app)
        .post('/move/create')
        .send({
          itemId: mockItem.id,
          destinationZone: 'ZONE-B'
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: mockRequest.id,
        type: 'MOVE',
        status: 'PENDING',
        item_id: mockItem.id
      });
    });

    it('should reject unavailable item', async () => {
      // Arrange
      const unavailableItem = createMockInventoryItem({
        status1: 'IN_USE',
        location: 'WAREHOUSE-A'
      });

      prismaMock.inventoryItem.findUnique.mockResolvedValue(unavailableItem);

      // Act
      const response = await request(app)
        .post('/move/create')
        .send({
          itemId: unavailableItem.id,
          destinationZone: 'ZONE-B'
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'ITEM_UNAVAILABLE',
          message: 'Item is not available for move'
        }
      });
    });

    it('should validate request body', async () => {
      // Act
      const response = await request(app)
        .post('/move/create')
        .send({
          itemId: '',
          destinationZone: ''
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

  describe('PUT /move/:id/scan-item', () => {
    it('should validate item scan successfully', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockItem = createMockInventoryItem({
        qr_code: 'ITEM-123'
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);

      // Act
      const response = await request(app)
        .put(`/move/${mockRequest.id}/scan-item`)
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

    it('should reject invalid item scan', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put(`/move/${mockRequest.id}/scan-item`)
        .send({
          itemQrCode: 'INVALID-QR'
        });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found'
        }
      });
    });
  });

  describe('PUT /move/:id/scan-destination', () => {
    it('should validate destination scan successfully', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      prismaMock.request.findUnique.mockResolvedValue(mockRequest);

      // Act
      const response = await request(app)
        .put(`/move/${mockRequest.id}/scan-destination`)
        .send({
          destinationQrCode: 'ZONE-B1',
          type: 'ZONE'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        request: expect.any(Object)
      });
    });

    it('should reject invalid destination format', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      prismaMock.request.findUnique.mockResolvedValue(mockRequest);

      // Act
      const response = await request(app)
        .put(`/move/${mockRequest.id}/scan-destination`)
        .send({
          destinationQrCode: 'invalid location',
          type: 'ZONE'
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid location format'
        }
      });
    });
  });
}); 