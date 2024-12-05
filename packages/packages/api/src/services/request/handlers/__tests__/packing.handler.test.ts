import { PackingRequestHandler } from '../packing.handler';
import { prismaMock } from '../../../../../jest.setup';
import { 
  createMockRequest, 
  createMockUser, 
  createMockRequestTimeline,
  createMockInventoryItem,
  createMockBin 
} from '../../../../utils/__tests__/test-helpers';
import { RequestType, RequestStatus, Prisma } from '@prisma/client';
import { APIError } from '../../../../utils/errors';

describe('PackingRequestHandler', () => {
  let handler: PackingRequestHandler;

  beforeEach(() => {
    handler = new PackingRequestHandler();
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
    describe('ORDER_VALIDATION step', () => {
      const mockOperator = createMockUser();
      const mockItem = createMockInventoryItem({
        id: 'ITEM-123',
        status1: 'AVAILABLE',
        status2: 'READY_FOR_PACKING'
      });
      const mockRequest = createMockRequest({
        type: 'PACKING' as RequestType,
        status: 'PENDING' as RequestStatus,
        item_id: mockItem.id
      });

      it('should validate order successfully', async () => {
        // Arrange
        const orderData = {
          orderId: 'ORDER-123',
          itemCount: 5
        };

        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'ORDER_VALIDATION',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);
        (prismaMock as any).order.findUnique.mockResolvedValue({
          id: orderData.orderId,
          status: 'READY_FOR_PACKING'
        });
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.validateOrder(
          mockRequest.id,
          orderData,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(prismaMock.request.findUnique).toHaveBeenCalledWith({
          where: { id: mockRequest.id }
        });
        expect((prismaMock as any).order.findUnique).toHaveBeenCalledWith({
          where: { id: orderData.orderId }
        });
        expect((prismaMock as any).requestTimeline.create).toHaveBeenCalled();
      });

      it('should reject invalid request type', async () => {
        // Arrange
        const invalidRequest = createMockRequest({
          type: 'MOVE' as RequestType
        });

        const orderData = {
          orderId: 'ORDER-123',
          itemCount: 5
        };

        prismaMock.request.findUnique.mockResolvedValue(invalidRequest);

        // Act & Assert
        await expect(
          handler.validateOrder(invalidRequest.id, orderData, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid packing request'));
      });

      it('should reject if order not found', async () => {
        // Arrange
        const orderData = {
          orderId: 'NON-EXISTENT',
          itemCount: 5
        };

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).order.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.validateOrder(mockRequest.id, orderData, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'ORDER_NOT_FOUND', 'Order not found'));
      });

      it('should reject if order not ready for packing', async () => {
        // Arrange
        const orderData = {
          orderId: 'ORDER-123',
          itemCount: 5
        };

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        (prismaMock as any).order.findUnique.mockResolvedValue({
          id: orderData.orderId,
          status: 'COMPLETED'
        });

        // Act & Assert
        await expect(
          handler.validateOrder(mockRequest.id, orderData, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'INVALID_ORDER_STATUS', 'Order is not ready for packing'));
      });
    });

    describe('ITEM_SCAN step', () => {
      const mockOperator = createMockUser();
      const mockItem = createMockInventoryItem({
        id: 'ITEM-123',
        status1: 'AVAILABLE',
        status2: 'READY_FOR_PACKING'
      });
      const mockRequest = createMockRequest({
        type: 'PACKING' as RequestType,
        status: 'PENDING' as RequestStatus,
        order_id: 'ORDER-123'
      });

      it('should validate item scan successfully', async () => {
        // Arrange
        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'ITEM_SCAN',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);
        (prismaMock as any).order.findUnique.mockResolvedValue({
          id: mockRequest.order_id,
          status: 'IN_PROGRESS'
        });
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.validateItemScan(
          mockRequest.id,
          mockItem.id,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(prismaMock.request.findUnique).toHaveBeenCalledWith({
          where: { id: mockRequest.id }
        });
        expect(prismaMock.inventoryItem.findUnique).toHaveBeenCalledWith({
          where: { id: mockItem.id }
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
          handler.validateItemScan(invalidRequest.id, mockItem.id, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid packing request'));
      });

      it('should reject if item not found', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.validateItemScan(mockRequest.id, 'NON-EXISTENT', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'ITEM_NOT_FOUND', 'Item not found'));
      });

      it('should reject if item not ready for packing', async () => {
        // Arrange
        const unavailableItem = createMockInventoryItem({
          id: mockItem.id,
          status1: 'IN_USE',
          status2: 'PROCESSING'
        });

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(unavailableItem);

        // Act & Assert
        await expect(
          handler.validateItemScan(mockRequest.id, unavailableItem.id, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'ITEM_NOT_READY', 'Item is not ready for packing'));
      });
    });

    describe('BIN_ASSIGNMENT step', () => {
      const mockOperator = createMockUser();
      const mockItem = createMockInventoryItem({
        id: 'ITEM-123',
        status1: 'IN_PROGRESS',
        status2: 'PACKING',
        sku: 'SKU-001'
      });
      const mockBin = createMockBin({
        id: 'BIN-123',
        sku: 'SKU-001',
        capacity: 10,
        current_count: 5
      });
      const mockRequest = createMockRequest({
        type: 'PACKING' as RequestType,
        status: 'PENDING' as RequestStatus,
        item_id: mockItem.id
      });

      it('should assign bin successfully', async () => {
        // Arrange
        const mockTimeline = createMockRequestTimeline({
          request_id: mockRequest.id,
          step: 'BIN_ASSIGNMENT',
          operator_id: mockOperator.id
        });

        // Mock database calls
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.inventoryItem.findUnique.mockResolvedValue(mockItem);
        prismaMock.bin.findUnique.mockResolvedValue(mockBin);
        prismaMock.bin.update.mockResolvedValue({
          ...mockBin,
          current_count: mockBin.current_count + 1
        });
        prismaMock.inventoryItem.update.mockResolvedValue({
          ...mockItem,
          bin_id: mockBin.id
        });
        (prismaMock as any).requestTimeline.create.mockResolvedValue(mockTimeline);

        // Act
        const result = await handler.assignBin(
          mockRequest.id,
          mockBin.id,
          mockOperator.id
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(prismaMock.bin.update).toHaveBeenCalledWith({
          where: { id: mockBin.id },
          data: { current_count: mockBin.current_count + 1 }
        });
        expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
          where: { id: mockItem.id },
          data: { bin_id: mockBin.id }
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
          handler.assignBin(invalidRequest.id, mockBin.id, mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'INVALID_REQUEST', 'Invalid packing request'));
      });

      it('should reject if bin not found', async () => {
        // Arrange
        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.bin.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          handler.assignBin(mockRequest.id, 'NON-EXISTENT', mockOperator.id)
        ).rejects.toThrow(new APIError(404, 'BIN_NOT_FOUND', 'Bin not found'));
      });

      it('should reject if bin capacity exceeded', async () => {
        // Arrange
        const fullBin = createMockBin({
          id: mockBin.id,
          capacity: 10,
          current_count: 10
        });

        prismaMock.request.findUnique.mockResolvedValue(mockRequest);
        prismaMock.bin.findUnique.mockResolvedValue(fullBin);

        // Act & Assert
        await expect(
          handler.assignBin(mockRequest.id, fullBin.id, mockOperator.id)
        ).rejects.toThrow(new APIError(400, 'BIN_FULL', 'Bin capacity exceeded'));
      });
    });
  });
}); 