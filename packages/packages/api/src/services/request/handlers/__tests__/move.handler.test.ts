import { MoveRequestHandler } from '../move.handler';
import { prismaMock } from '../../../../../jest.setup';
import { 
  createMockRequest, 
  createMockInventoryItem, 
  createMockUser, 
  createMockRequestTimeline 
} from '../../../../utils/__tests__/test-helpers';
import { RequestType, RequestStatus, Prisma } from '@prisma/client';
import { APIError } from '../../../../utils/errors';

describe('MoveRequestHandler', () => {
  let handler: MoveRequestHandler;

  beforeEach(() => {
    handler = new MoveRequestHandler();
    (handler as any).prisma = prismaMock;
    jest.clearAllMocks();

    // Standard transaction mock following our patterns
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return callback(prismaMock);
    });
  });

  describe('Step Validation', () => {
    describe('ITEM_SCAN step', () => {
      const mockOperator = createMockUser();
      const mockRequest = createMockRequest({
        type: 'MOVE' as RequestType,
        status: 'PENDING' as RequestStatus
      });

      it('should validate when item is available', async () => {
        // Arrange
        const mockItem = createMockInventoryItem({
          status1: 'AVAILABLE',
          qr_code: 'ITEM-123'
        });

        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'ITEM_SCAN',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.validateItemScan(
          mockRequest.id,
          mockItem.qr_code!,
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
          type: 'WASH' as RequestType
        });
        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.validateItemScan(invalidRequest.id, 'any-qr', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid move request'));
      });

      it('should reject non-existent item', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.validateItemScan(mockRequest.id, 'invalid-qr', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'ITEM_NOT_FOUND', 'Item not found'));
      });

      it('should reject unavailable item', async () => {
        // Arrange
        const unavailableItem = createMockInventoryItem({
          status1: 'IN_USE',
          qr_code: 'ITEM-123'
        });
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(unavailableItem);

        // Act & Assert
        await expect(
          handler.validateItemScan(mockRequest.id, unavailableItem.qr_code!, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'ITEM_UNAVAILABLE', 'Item is not available for move'));
      });
    });

    describe('DESTINATION_SCAN step', () => {
      const mockOperator = createMockUser();
      const mockRequest = createMockRequest({
        type: 'MOVE' as RequestType,
        status: 'PENDING' as RequestStatus
      });

      it('should validate valid destination scan', async () => {
        // Arrange
        const validDestination = {
          qrCode: 'ZONE-A1',
          type: 'ZONE' as const
        };

        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'DESTINATION_SCAN',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.validateDestinationScan(
          mockRequest.id,
          validDestination,
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
          type: 'WASH' as RequestType
        });

        const validDestination = {
          qrCode: 'ZONE-A1',
          type: 'ZONE' as const
        };

        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.validateDestinationScan(invalidRequest.id, validDestination, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid move request'));
      });

      it('should reject invalid location format', async () => {
        // Arrange
        const invalidDestination = {
          qrCode: 'invalid location',
          type: 'ZONE' as const
        };

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);

        // Act & Assert
        await expect(
          handler.validateDestinationScan(mockRequest.id, invalidDestination, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'INVALID_LOCATION', 'Invalid location format'));
      });
    });

    describe('MOVE_COMPLETE step', () => {
      const mockOperator = createMockUser();
      const mockItem = createMockInventoryItem({
        status1: 'AVAILABLE',
        location: 'WAREHOUSE-A'
      });

      const mockRequest = createMockRequest({
        type: 'MOVE' as RequestType,
        status: 'PENDING' as RequestStatus,
        item_id: mockItem.id
      });

      it('should complete move successfully', async () => {
        // Arrange
        const newLocation = 'ZONE-B1';
        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'MOVE_COMPLETE',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);
        prismaMock.inventoryItem.update.mockResolvedValue({
          ...mockItem,
          location: newLocation,
          status1: 'AVAILABLE'
        });
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);
        prismaMock.request.update.mockResolvedValue({
          ...mockRequest,
          status: 'COMPLETED' as RequestStatus
        });

        // Act
        const result = await handler.completeMove(
          mockRequest.id,
          newLocation,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data.status).toBe('COMPLETED');
        expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
          where: { id: mockItem.id },
          data: { location: newLocation }
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
          type: 'WASH' as RequestType
        });

        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.completeMove(invalidRequest.id, 'ZONE-B1', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid move request'));
      });

      it('should reject if item not found', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.completeMove(mockRequest.id, 'ZONE-B1', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'ITEM_NOT_FOUND', 'Item not found'));
      });

      it('should reject invalid location format', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);

        // Act & Assert
        await expect(
          handler.completeMove(mockRequest.id, 'invalid location', mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'INVALID_LOCATION', 'Invalid location format'));
      });
    });
  });
}); 