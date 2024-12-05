import { BaseRequestHandler, StepValidation } from './base.handler';
import { APIError } from '../../../utils/errors';
import { Prisma, RequestType, RequestStatus } from '@prisma/client';

interface OrderData {
  orderId: string;
  itemCount: number;
}

interface ValidationResponse<T> {
  success: boolean;
  data: T;
}

export class PackingRequestHandler extends BaseRequestHandler {
  protected steps: string[] = ['ORDER_VALIDATION', 'ITEM_SCAN', 'BIN_ASSIGNMENT', 'PACKING_COMPLETE'];
  
  protected stepTransitions: Record<string, string[]> = {
    'ORDER_VALIDATION': ['ITEM_SCAN'],
    'ITEM_SCAN': ['BIN_ASSIGNMENT'],
    'BIN_ASSIGNMENT': ['PACKING_COMPLETE'],
    'PACKING_COMPLETE': []
  };

  protected stepValidations: Record<string, StepValidation> = {
    'ORDER_VALIDATION': {
      step: 'ORDER_VALIDATION',
      validate: async (data: { requestId: string; orderData: OrderData; operatorId: string }) => {
        await this.validateOrder(data.requestId, data.orderData, data.operatorId);
        return true;
      },
      errorMessage: 'Invalid order validation'
    },
    'ITEM_SCAN': {
      step: 'ITEM_SCAN',
      validate: async () => true,
      errorMessage: 'Invalid item scan'
    },
    'BIN_ASSIGNMENT': {
      step: 'BIN_ASSIGNMENT',
      validate: async () => true,
      errorMessage: 'Invalid bin assignment'
    },
    'PACKING_COMPLETE': {
      step: 'PACKING_COMPLETE',
      validate: async () => true,
      errorMessage: 'Packing completion failed'
    }
  };

  constructor() {
    super('PackingRequestHandler');
  }

  protected async findExactSKU(): Promise<null> {
    return null;
  }

  protected async findUniversalSKU(): Promise<null> {
    return null;
  }

  async validateOrder(
    requestId: string,
    orderData: OrderData,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'PACKING') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid packing request');
      }

      // Check order exists and is ready
      const order = await (tx as any).order.findUnique({
        where: { id: orderData.orderId }
      });

      if (!order) {
        throw new APIError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (order.status !== 'READY_FOR_PACKING') {
        throw new APIError(400, 'INVALID_ORDER_STATUS', 'Order is not ready for packing');
      }

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'ORDER_VALIDATION',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            order_id: order.id,
            item_count: orderData.itemCount
          } as Prisma.InputJsonValue,
          startedAt: new Date(),
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        data: request
      };
    }).catch(error => {
      if (error instanceof APIError) {
        throw error;
      }
      throw this.handleError(error, 'Order validation failed');
    });
  }

  async validateItemScan(
    requestId: string,
    itemId: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'PACKING') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid packing request');
      }

      // Check item exists and is ready
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      if (item.status1 !== 'AVAILABLE' || item.status2 !== 'READY_FOR_PACKING') {
        throw new APIError(400, 'ITEM_NOT_READY', 'Item is not ready for packing');
      }

      // Check order exists and is in progress
      const order = await (tx as any).order.findUnique({
        where: { id: request.order_id }
      });

      if (!order) {
        throw new APIError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'ITEM_SCAN',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            item_id: item.id,
            order_id: order.id,
            status: item.status1
          } as Prisma.InputJsonValue,
          startedAt: new Date(),
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        data: request
      };
    }).catch(error => {
      if (error instanceof APIError) {
        throw error;
      }
      throw this.handleError(error, 'Item scan validation failed');
    });
  }

  async assignBin(
    requestId: string,
    binId: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'PACKING') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid packing request');
      }

      // Check item exists
      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Check bin exists and has capacity
      const bin = await tx.bin.findUnique({
        where: { id: binId }
      });

      if (!bin) {
        throw new APIError(404, 'BIN_NOT_FOUND', 'Bin not found');
      }

      if (bin.current_count >= bin.capacity) {
        throw new APIError(400, 'BIN_FULL', 'Bin capacity exceeded');
      }

      // Update bin count
      await tx.bin.update({
        where: { id: bin.id },
        data: { current_count: bin.current_count + 1 }
      });

      // Assign item to bin
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { bin_id: bin.id }
      });

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'BIN_ASSIGNMENT',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            bin_id: bin.id,
            item_id: item.id,
            current_count: bin.current_count + 1
          } as Prisma.InputJsonValue,
          startedAt: new Date(),
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        data: request
      };
    }).catch(error => {
      if (error instanceof APIError) {
        throw error;
      }
      throw this.handleError(error, 'Bin assignment failed');
    });
  }
} 