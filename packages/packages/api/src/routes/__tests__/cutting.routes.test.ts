import request from 'supertest';
import express, { Express } from 'express';
import { prismaMock } from '../../../jest.setup';
import { cuttingRoutes } from '../cutting.routes';
import { createMockUser, createMockRequest, createMockInventoryItem, createMockBatch } from '../../utils/__tests__/test-helpers';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { CuttingRequestHandler } from '../../services/request/handlers/cutting.handler';

// Mock the auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = createMockUser();
    next();
  })
}));

// Mock the CuttingRequestHandler
jest.mock('../../services/request/handlers/cutting.handler', () => {
  return {
    CuttingRequestHandler: jest.fn().mockImplementation(() => ({
      validateMaterial: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      })),
      processCutting: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      })),
      completeCutting: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      }))
    }))
  };
});

describe('Cutting Routes', () => {
  let app: Express;
  let mockHandler: jest.Mocked<CuttingRequestHandler>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/cutting', cuttingRoutes);
    app.use(errorMiddleware);
    jest.clearAllMocks();

    mockHandler = new CuttingRequestHandler() as jest.Mocked<CuttingRequestHandler>;
  });

  describe('POST /cutting/create', () => {
    it('should create cutting request successfully', async () => {
      // Arrange
      const mockBatch = createMockBatch({
        status: 'READY_FOR_CUTTING',
        style: 'ST-001'
      });
      const mockRequest = createMockRequest({
        type: 'CUTTING',
        status: 'PENDING',
        metadata: {
          batch_id: mockBatch.id,
          style: mockBatch.style,
          quantity: 50
        }
      });

      prismaMock.batch.findUnique.mockResolvedValue(mockBatch);
      prismaMock.request.create.mockResolvedValue(mockRequest);

      // Act
      const response = await request(app)
        .post('/cutting/create')
        .send({
          batchId: mockBatch.id,
          style: mockBatch.style,
          quantity: 50
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: mockRequest.id,
        type: 'CUTTING',
        status: 'PENDING',
        metadata: expect.objectContaining({
          batch_id: mockBatch.id,
          style: mockBatch.style,
          quantity: 50
        })
      });
    });

    it('should reject invalid batch status', async () => {
      // Arrange
      const mockBatch = createMockBatch({
        status: 'IN_PROGRESS',
        style: 'ST-001'
      });

      prismaMock.batch.findUnique.mockResolvedValue(mockBatch);

      // Act
      const response = await request(app)
        .post('/cutting/create')
        .send({
          batchId: mockBatch.id,
          style: mockBatch.style,
          quantity: 50
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_BATCH_STATUS',
          message: 'Batch is not ready for cutting'
        }
      });
    });

    it('should validate request body', async () => {
      // Act
      const response = await request(app)
        .post('/cutting/create')
        .send({
          batchId: '',
          style: '',
          quantity: -1
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

  describe('PUT /cutting/:id/validate-material', () => {
    it('should validate material successfully', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockMaterial = createMockInventoryItem({
        status1: 'AVAILABLE',
        status2: 'RAW'
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);

      // Act
      const response = await request(app)
        .put(`/cutting/${mockRequest.id}/validate-material`)
        .send({
          materialId: mockMaterial.id
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        request: expect.any(Object)
      });
    });

    it('should reject unavailable material', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockMaterial = createMockInventoryItem({
        status1: 'IN_USE',
        status2: 'PROCESSING'
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);

      // Act
      const response = await request(app)
        .put(`/cutting/${mockRequest.id}/validate-material`)
        .send({
          materialId: mockMaterial.id
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'MATERIAL_UNAVAILABLE',
          message: 'Material is not available for cutting'
        }
      });
    });
  });

  describe('PUT /cutting/:id/process', () => {
    it('should process cutting successfully', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockMaterial = createMockInventoryItem({
        status1: 'AVAILABLE',
        status2: 'RAW'
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);

      // Act
      const response = await request(app)
        .put(`/cutting/${mockRequest.id}/process`)
        .send({
          materialId: mockMaterial.id,
          wastePercentage: 5,
          piecesCount: 10
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        request: expect.any(Object)
      });
    });

    it('should reject invalid waste percentage', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockMaterial = createMockInventoryItem({
        status1: 'AVAILABLE',
        status2: 'RAW'
      });

      prismaMock.request.findUnique.mockResolvedValue(mockRequest);
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);

      // Act
      const response = await request(app)
        .put(`/cutting/${mockRequest.id}/process`)
        .send({
          materialId: mockMaterial.id,
          wastePercentage: 101, // Invalid percentage
          piecesCount: 10
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Waste percentage must be between 0 and 100'
        }
      });
    });
  });
}); 