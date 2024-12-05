import { BaseRequestHandler, StepValidation } from './base.handler';
import { APIError } from '../../../utils/errors';
import { Prisma, RequestType, RequestStatus } from '@prisma/client';
import { metrics } from '../../../utils/metrics';

interface DestinationData {
  qrCode: string;
  type: 'ZONE' | 'BIN';
}

interface ValidationResponse<T> {
  success: boolean;
  data: T;
}

export class MoveRequestHandler extends BaseRequestHandler {
  protected steps: string[] = ['ITEM_SCAN', 'DESTINATION_SCAN', 'MOVE_COMPLETE'];
  
  protected stepTransitions: Record<string, string[]> = {
    'ITEM_SCAN': ['DESTINATION_SCAN'],
    'DESTINATION_SCAN': ['MOVE_COMPLETE'],
    'MOVE_COMPLETE': []
  };

  protected stepValidations: Record<string, StepValidation> = {
    'ITEM_SCAN': {
      step: 'ITEM_SCAN',
      validate: async (data: { requestId: string; scannedItemQR: string; operatorId: string }) => {
        await this.validateItemScan(data.requestId, data.scannedItemQR, data.operatorId);
        return true;
      },
      errorMessage: 'Invalid item scan'
    },
    'DESTINATION_SCAN': {
      step: 'DESTINATION_SCAN',
      validate: async (data: { requestId: string; destination: DestinationData; operatorId: string }) => {
        await this.validateDestinationScan(data.requestId, data.destination, data.operatorId);
        return true;
      },
      errorMessage: 'Invalid destination scan'
    },
    'MOVE_COMPLETE': {
      step: 'MOVE_COMPLETE',
      validate: async () => true,
      errorMessage: 'Move completion failed'
    }
  };

  constructor() {
    super('MoveRequestHandler');
  }

  // Implement abstract methods from BaseService
  protected async findExactSKU(sku: string, uncommittedOnly: boolean): Promise<any> {
    return null; // Not used in MoveRequestHandler
  }

  protected async findUniversalSKU(sku: string, uncommittedOnly: boolean): Promise<any> {
    return null; // Not used in MoveRequestHandler
  }

  // Step validation methods
  async validateItemScan(
    requestId: string,
    scannedItemQR: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'MOVE') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid move request');
      }

      // Then check item
      const item = await tx.inventoryItem.findUnique({
        where: { qr_code: scannedItemQR }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      if (item.status1 !== 'AVAILABLE') {
        throw new APIError(400, 'ITEM_UNAVAILABLE', 'Item is not available for move');
      }

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'ITEM_VALIDATED',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            item_id: item.id,
            location: item.location
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
      // Re-throw APIErrors directly
      if (error instanceof APIError) {
        throw error;
      }
      // Handle other errors
      throw this.handleError(error, 'Item validation failed');
    });
  }

  async validateDestinationScan(
    requestId: string,
    destinationData: DestinationData,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'MOVE') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid move request');
      }

      // Validate location format
      const locationPattern = /^[A-Z0-9-]+$/;
      if (!locationPattern.test(destinationData.qrCode)) {
        throw new APIError(400, 'INVALID_LOCATION', 'Invalid location format');
      }

      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'DESTINATION_VALIDATED',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            destination: destinationData.qrCode,
            type: destinationData.type
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
      // Re-throw APIErrors directly
      if (error instanceof APIError) {
        throw error;
      }
      // Handle other errors
      throw this.handleError(error, 'Destination validation failed');
    });
  }

  async completeMove(
    requestId: string,
    newLocation: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'MOVE') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid move request');
      }

      // Check item exists
      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Validate location format
      const locationPattern = /^[A-Z0-9-]+$/;
      if (!locationPattern.test(newLocation)) {
        throw new APIError(400, 'INVALID_LOCATION', 'Invalid location format');
      }

      // Update item location
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { location: newLocation }
      });

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'MOVE_COMPLETE',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            old_location: item.location,
            new_location: newLocation
          } as Prisma.InputJsonValue,
          startedAt: new Date(),
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Update request status
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: { status: 'COMPLETED' as RequestStatus }
      });

      return {
        success: true,
        data: updatedRequest
      };
    }).catch(error => {
      // Re-throw APIErrors directly
      if (error instanceof APIError) {
        throw error;
      }
      // Handle other errors
      throw this.handleError(error, 'Move completion failed');
    });
  }
} 