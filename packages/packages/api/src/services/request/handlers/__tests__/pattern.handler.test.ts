import { PatternRequestHandler } from '../pattern.handler';
import { prismaMock } from '../../../../../jest.setup';
import { 
  createMockRequest, 
  createMockUser, 
  createMockRequestTimeline,
  createMockBatch 
} from '../../../../utils/__tests__/test-helpers';
import { RequestType, RequestStatus, Prisma } from '@prisma/client';
import { APIError } from '../../../../utils/errors';

describe('PatternRequestHandler', () => {
  let handler: PatternRequestHandler;

  beforeEach(() => {
    handler = new PatternRequestHandler();
    (handler as any).prisma = prismaMock;
    jest.clearAllMocks();

    // Setup standard transaction mock
    prismaMock.$transaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(prismaMock);
      }
      return callback;
    });
  });

  describe('Step Validation', () => {
    describe('BATCH_VALIDATION step', () => {
      const mockOperator = createMockUser();
      const mockBatch = createMockBatch({
        id: 'BATCH-123',
        status: 'READY'
      });
      const mockRequest = createMockRequest({
        type: 'PATTERN' as RequestType,
        status: 'PENDING' as RequestStatus,
        batch_id: mockBatch.id
      });

      it('should validate batch successfully', async () => {
        // Arrange
        const batchData = {
          batchId: mockBatch.id,
          quantity: 50,
          style: 'ST'
        };

        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'BATCH_VALIDATION',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).batch.findUnique.mockResolvedValue(mockBatch);
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.validateBatch(
          mockRequest.id,
          batchData,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(prismaMock.request.findUnique).toHaveBeenCalledWith({
          where: { id: mockRequest.id }
        });
        expect((prismaMock as any).requestTimeline.create).toHaveBeenCalled();
      });

      it('should reject invalid request type', async () => {
        // Arrange
        const invalidRequest = createMockRequest({
          type: 'MOVE' as RequestType
        });

        const batchData = {
          batchId: mockBatch.id,
          quantity: 50,
          style: 'ST'
        };

        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.validateBatch(invalidRequest.id, batchData, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid pattern request'));
      });

      it('should reject non-existent batch', async () => {
        // Arrange
        const batchData = {
          batchId: 'NON-EXISTENT',
          quantity: 50,
          style: 'ST'
        };

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).batch.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.validateBatch(mockRequest.id, batchData, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'BATCH_NOT_FOUND', 'Batch not found'));
      });

      it('should reject invalid batch status', async () => {
        // Arrange
        const inProgressBatch = createMockBatch({
          id: mockBatch.id,
          status: 'IN_PROGRESS'
        });

        const batchData = {
          batchId: mockBatch.id,
          quantity: 50,
          style: 'ST'
        };

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).batch.findUnique.mockResolvedValue(inProgressBatch);

        // Act & Assert
        await expect(
          handler.validateBatch(mockRequest.id, batchData, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'INVALID_BATCH_STATUS', 'Batch is not ready for pattern'));
      });
    });

    describe('PATTERN_PROCESS step', () => {
      const mockOperator = createMockUser();
      const mockBatch = createMockBatch({
        id: 'BATCH-123',
        status: 'READY'
      });
      const mockRequest = createMockRequest({
        type: 'PATTERN' as RequestType,
        status: 'PENDING' as RequestStatus,
        batch_id: mockBatch.id
      });

      it('should process pattern successfully', async () => {
        // Arrange
        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'PATTERN_PROCESS',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).batch.update.mockResolvedValue({
          ...mockBatch,
          status: 'IN_PROGRESS'
        });
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.processPattern(
          mockRequest.id,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect((prismaMock as any).batch.update).toHaveBeenCalledWith({
          where: { id: mockBatch.id },
          data: { status: 'IN_PROGRESS' }
        });
        expect((prismaMock as any).requestTimeline.create).toHaveBeenCalled();
      });

      // ... shall we continue with the error cases?
    });

    describe('PATTERN_COMPLETE step', () => {
      const mockOperator = createMockUser();
      const mockBatch = createMockBatch({
        id: 'BATCH-123',
        status: 'IN_PROGRESS'
      });
      const mockRequest = createMockRequest({
        type: 'PATTERN' as RequestType,
        status: 'PENDING' as RequestStatus,
        batch_id: mockBatch.id
      });

      it('should complete pattern successfully', async () => {
        // Arrange
        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'PATTERN_COMPLETE',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).batch.update.mockResolvedValue({
          ...mockBatch,
          status: 'COMPLETED'
        });
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);
        prismaMock.request.update.mockResolvedValue({
          ...mockRequest,
          status: 'COMPLETED' as RequestStatus
        });

        // Act
        const result = await handler.completePattern(
          mockRequest.id,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data.status).toBe('COMPLETED');
        expect((prismaMock as any).batch.update).toHaveBeenCalledWith({
          where: { id: mockBatch.id },
          data: { status: 'COMPLETED' }
        });
        expect((prismaMock as any).requestTimeline.create).toHaveBeenCalled();
        expect(prismaMock.request.update).toHaveBeenCalledWith({
          where: { id: mockRequest.id },
          data: { status: 'COMPLETED' }
        });
      });

      it('should reject invalid request type', async () => {
        // Arrange
        const invalidRequest = createMockRequest({
          type: 'MOVE' as RequestType
        });

        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.completePattern(invalidRequest.id, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid pattern request'));
      });

      it('should reject if batch not found', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).batch.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.completePattern(mockRequest.id, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'BATCH_NOT_FOUND', 'Batch not found'));
      });

      it('should reject if batch not in progress', async () => {
        // Arrange
        const readyBatch = createMockBatch({
          id: mockBatch.id,
          status: 'READY'
        });

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).batch.findUnique.mockResolvedValue(readyBatch);

        // Act & Assert
        await expect(
          handler.completePattern(mockRequest.id, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'INVALID_BATCH_STATUS', 'Batch must be in progress to complete'));
      });
    });
  });
}); 