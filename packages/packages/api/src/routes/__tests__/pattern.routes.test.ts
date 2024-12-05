import request from 'supertest';
import express, { Express } from 'express';
import { prismaMock } from '../../../jest.setup';
import { patternRoutes } from '../pattern.routes';
import { createMockUser, createMockRequest, createMockBatch } from '../../utils/__tests__/test-helpers';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { errorMiddleware } from '../../middleware/error.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { PatternRequestHandler } from '../../services/request/handlers/pattern.handler';

// Mock the auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = createMockUser();
    next();
  })
}));

// Mock the PatternRequestHandler
jest.mock('../../services/request/handlers/pattern.handler', () => {
  return {
    PatternRequestHandler: jest.fn().mockImplementation(() => ({
      validateBatch: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      })),
      processPattern: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      })),
      completePattern: jest.fn().mockImplementation(async () => ({
        success: true,
        data: createMockRequest()
      }))
    }))
  };
});

describe('Pattern Routes', () => {
  let app: Express;
  let mockHandler: jest.Mocked<PatternRequestHandler>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/pattern', patternRoutes);
    app.use(errorMiddleware);
    jest.clearAllMocks();

    mockHandler = new PatternRequestHandler() as jest.Mocked<PatternRequestHandler>;
  });

  describe('POST /pattern/create', () => {
    it('should create pattern request successfully', async () => {
      // Arrange
      const mockBatch = createMockBatch({
        status: 'READY',
        style: 'ST-001'
      });
      const mockRequest = createMockRequest({
        type: 'PATTERN',
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
        .post('/pattern/create')
        .send({
          batchId: mockBatch.id,
          style: mockBatch.style,
          quantity: 50
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: mockRequest.id,
        type: 'PATTERN',
        status: 'PENDING',
        metadata: expect.objectContaining({
          batch_id: mockBatch.id,
          style: mockBatch.style,
          quantity: 50
        })
      });
    });

    it('should reject invalid batch', async () => {
      // Arrange
      const mockBatch = createMockBatch({
        status: 'IN_PROGRESS',
        style: 'ST-001'
      });

      prismaMock.batch.findUnique.mockResolvedValue(mockBatch);

      // Act
      const response = await request(app)
        .post('/pattern/create')
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
          message: 'Batch is not ready for pattern'
        }
      });
    });

    it('should validate request body', async () => {
      // Act
      const response = await request(app)
        .post('/pattern/create')
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

  // Continue with more test cases...
}); 