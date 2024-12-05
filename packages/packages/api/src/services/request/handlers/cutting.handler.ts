import { BaseRequestHandler, StepValidation } from './base.handler';
import { APIError } from '../../../utils/errors';
import { Prisma, RequestType, RequestStatus } from '@prisma/client';

interface ValidationResponse<T> {
  success: boolean;
  data: T;
}

interface CuttingData {
  materialId: string;
  wastePercentage: number;
  piecesCount: number;
}

export class CuttingRequestHandler extends BaseRequestHandler {
  protected steps: string[] = ['MATERIAL_VALIDATION', 'CUTTING_PROCESS', 'CUTTING_COMPLETE'];
  
  protected stepTransitions: Record<string, string[]> = {
    'MATERIAL_VALIDATION': ['CUTTING_PROCESS'],
    'CUTTING_PROCESS': ['CUTTING_COMPLETE'],
    'CUTTING_COMPLETE': []
  };

  protected stepValidations: Record<string, StepValidation> = {
    'MATERIAL_VALIDATION': {
      step: 'MATERIAL_VALIDATION',
      validate: async (data: { requestId: string; materialId: string; operatorId: string }) => {
        await this.validateMaterial(data.requestId, data.materialId, data.operatorId);
        return true;
      },
      errorMessage: 'Invalid material validation'
    },
    'CUTTING_PROCESS': {
      step: 'CUTTING_PROCESS',
      validate: async () => true,
      errorMessage: 'Cutting process failed'
    },
    'CUTTING_COMPLETE': {
      step: 'CUTTING_COMPLETE',
      validate: async () => true,
      errorMessage: 'Cutting completion failed'
    }
  };

  constructor() {
    super('CuttingRequestHandler');
  }

  protected async findExactSKU(): Promise<null> {
    return null;
  }

  protected async findUniversalSKU(): Promise<null> {
    return null;
  }

  async validateMaterial(
    requestId: string,
    materialId: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'CUTTING') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid cutting request');
      }

      // Check material exists and is available
      const material = await tx.inventoryItem.findUnique({
        where: { id: materialId }
      });

      if (!material) {
        throw new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found');
      }

      if (material.status1 !== 'AVAILABLE' || material.status2 !== 'RAW') {
        throw new APIError(400, 'MATERIAL_UNAVAILABLE', 'Material is not available for cutting');
      }

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'MATERIAL_VALIDATION',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            material_id: material.id,
            status: material.status1
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
      throw this.handleError(error, 'Material validation failed');
    });
  }

  async processCutting(
    requestId: string,
    cuttingData: CuttingData,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'CUTTING') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid cutting request');
      }

      // Check material exists and is available
      const material = await tx.inventoryItem.findUnique({
        where: { id: cuttingData.materialId }
      });

      if (!material) {
        throw new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found');
      }

      // Validate waste percentage
      if (cuttingData.wastePercentage < 0 || cuttingData.wastePercentage > 100) {
        throw new APIError(400, 'INVALID_WASTE', 'Waste percentage must be between 0 and 100');
      }

      // Update material status
      await tx.inventoryItem.update({
        where: { id: material.id },
        data: { 
          status1: 'IN_USE',
          status2: 'CUTTING'
        }
      });

      // Update batch status
      await (tx as any).batch.update({
        where: { id: request.batch_id },
        data: { status: 'IN_PROGRESS' }
      });

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'CUTTING_PROCESS',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            material_id: material.id,
            waste_percentage: cuttingData.wastePercentage,
            pieces_count: cuttingData.piecesCount
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
      throw this.handleError(error, 'Cutting process failed');
    });
  }

  async completeCutting(
    requestId: string,
    materialId: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'CUTTING') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid cutting request');
      }

      // Check material exists and is in cutting
      const material = await tx.inventoryItem.findUnique({
        where: { id: materialId }
      });

      if (!material) {
        throw new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found');
      }

      if (material.status1 !== 'IN_USE' || material.status2 !== 'CUTTING') {
        throw new APIError(400, 'INVALID_MATERIAL_STATUS', 'Material must be in cutting status');
      }

      // Update material status
      await tx.inventoryItem.update({
        where: { id: material.id },
        data: { 
          status1: 'COMPLETED',
          status2: 'CUT'
        }
      });

      // Update batch status
      await (tx as any).batch.update({
        where: { id: request.batch_id },
        data: { status: 'COMPLETED' }
      });

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'CUTTING_COMPLETE',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            material_id: material.id,
            status: 'COMPLETED'
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
      if (error instanceof APIError) {
        throw error;
      }
      throw this.handleError(error, 'Cutting completion failed');
    });
  }
} 