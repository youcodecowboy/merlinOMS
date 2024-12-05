import { CuttingRequestHandler } from '../cutting.handler';
import { prismaMock } from '../../../../../jest.setup';
import { 
  createMockRequest, 
  createMockUser, 
  createMockRequestTimeline,
  createMockBatch,
  createMockInventoryItem 
} from '../../../../utils/__tests__/test-helpers';
import { RequestType, RequestStatus, Prisma } from '@prisma/client';
import { APIError } from '../../../../utils/errors';

describe('CuttingRequestHandler', () => {
  let handler: CuttingRequestHandler;

  beforeEach(() => {
    handler = new CuttingRequestHandler();
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
    describe('MATERIAL_VALIDATION step', () => {
      const mockOperator = createMockUser();
      const mockBatch = createMockBatch({
        id: 'BATCH-123',
        status: 'READY_FOR_CUTTING'
      });
      const mockMaterial = createMockInventoryItem({
        id: 'MATERIAL-123',
        status1: 'AVAILABLE',
        status2: 'RAW'
      });
      const mockRequest = createMockRequest({
        type: 'CUTTING' as RequestType,
        status: 'PENDING' as RequestStatus,
        batch_id: mockBatch.id
      });

      it('should validate material successfully', async () => {
        // Arrange
        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'MATERIAL_VALIDATION',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);
        (prismaMock as any).batch.findUnique.mockResolvedValue(mockBatch);
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.validateMaterial(
          mockRequest.id,
          mockMaterial.id,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(prismaMock.request.findUnique).toHaveBeenCalledWith({
          where: { id: mockRequest.id }
        });
        expect(prismaMock.inventoryItem.findUnique).toHaveBeenCalledWith({
          where: { id: mockMaterial.id }
        });
        expect((prismaMock as any).requestTimeline.create).toHaveBeenCalled();
      });

      it('should reject invalid request type', async () => {
        // Arrange
        const invalidRequest = createMockRequest({
          type: 'MOVE' as RequestType
        });

        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.validateMaterial(invalidRequest.id, mockMaterial.id, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid cutting request'));
      });

      it('should reject if material not found', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.validateMaterial(mockRequest.id, 'NON-EXISTENT', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found'));
      });

      it('should reject if material not available', async () => {
        // Arrange
        const unavailableMaterial = createMockInventoryItem({
          id: 'MATERIAL-123',
          status1: 'IN_USE',
          status2: 'RAW'
        });

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(unavailableMaterial);

        // Act & Assert
        await expect(
          handler.validateMaterial(mockRequest.id, unavailableMaterial.id, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'MATERIAL_UNAVAILABLE', 'Material is not available for cutting'));
      });
    });

    describe('CUTTING_PROCESS step', () => {
      const mockOperator = createMockUser();
      const mockBatch = createMockBatch({
        id: 'BATCH-123',
        status: 'READY_FOR_CUTTING'
      });
      const mockMaterial = createMockInventoryItem({
        id: 'MATERIAL-123',
        status1: 'AVAILABLE',
        status2: 'RAW'
      });
      const mockRequest = createMockRequest({
        type: 'CUTTING' as RequestType,
        status: 'PENDING' as RequestStatus,
        batch_id: mockBatch.id
      });

      it('should process cutting successfully', async () => {
        // Arrange
        const cuttingData = {
          materialId: mockMaterial.id,
          wastePercentage: 5,
          piecesCount: 10
        };

        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'CUTTING_PROCESS',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);
        prismaMock.inventoryItem.update.mockResolvedValue({
          ...mockMaterial,
          status1: 'IN_USE',
          status2: 'CUTTING'
        });
        (prismaMock as any).batch.update.mockResolvedValue({
          ...mockBatch,
          status: 'IN_PROGRESS'
        });
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.processCutting(
          mockRequest.id,
          cuttingData,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
          where: { id: mockMaterial.id },
          data: { status1: 'IN_USE', status2: 'CUTTING' }
        });
        expect((prismaMock as any).batch.update).toHaveBeenCalledWith({
          where: { id: mockBatch.id },
          data: { status: 'IN_PROGRESS' }
        });
        expect((prismaMock as any).requestTimeline.create).toHaveBeenCalled();
      });

      it('should reject invalid request type', async () => {
        // Arrange
        const invalidRequest = createMockRequest({
          type: 'MOVE' as RequestType
        });

        const cuttingData = {
          materialId: mockMaterial.id,
          wastePercentage: 5,
          piecesCount: 10
        };

        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.processCutting(invalidRequest.id, cuttingData, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid cutting request'));
      });

      it('should reject if material not found', async () => {
        // Arrange
        const cuttingData = {
          materialId: 'NON-EXISTENT',
          wastePercentage: 5,
          piecesCount: 10
        };

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.processCutting(mockRequest.id, cuttingData, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found'));
      });

      it('should reject invalid waste percentage', async () => {
        // Arrange
        const cuttingData = {
          materialId: mockMaterial.id,
          wastePercentage: 101, // Invalid percentage
          piecesCount: 10
        };

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);

        // Act & Assert
        await expect(
          handler.processCutting(mockRequest.id, cuttingData, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'INVALID_WASTE', 'Waste percentage must be between 0 and 100'));
      });
    });

    describe('CUTTING_COMPLETE step', () => {
      const mockOperator = createMockUser();
      const mockBatch = createMockBatch({
        id: 'BATCH-123',
        status: 'IN_PROGRESS'
      });
      const mockMaterial = createMockInventoryItem({
        id: 'MATERIAL-123',
        status1: 'IN_USE',
        status2: 'CUTTING'
      });
      const mockRequest = createMockRequest({
        type: 'CUTTING' as RequestType,
        status: 'PENDING' as RequestStatus,
        batch_id: mockBatch.id
      });

      it('should complete cutting successfully', async () => {
        // Arrange
        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'CUTTING_COMPLETE',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockMaterial);
        prismaMock.inventoryItem.update.mockResolvedValue({
          ...mockMaterial,
          status1: 'COMPLETED',
          status2: 'CUT'
        });
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
        const result = await handler.completeCutting(
          mockRequest.id,
          mockMaterial.id,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data.status).toBe('COMPLETED');
        expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
          where: { id: mockMaterial.id },
          data: { status1: 'COMPLETED', status2: 'CUT' }
        });
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
          handler.completeCutting(invalidRequest.id, mockMaterial.id, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid cutting request'));
      });

      it('should reject if material not found', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.completeCutting(mockRequest.id, 'NON-EXISTENT', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found'));
      });

      it('should reject if material not in cutting', async () => {
        // Arrange
        const wrongStatusMaterial = createMockInventoryItem({
          id: mockMaterial.id,
          status1: 'AVAILABLE',
          status2: 'RAW'
        });

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(wrongStatusMaterial);

        // Act & Assert
        await expect(
          handler.completeCutting(mockRequest.id, wrongStatusMaterial.id, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'INVALID_MATERIAL_STATUS', 'Material must be in cutting status'));
      });
    });
  });
}); 