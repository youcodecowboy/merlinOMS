import { BaseRequestHandler, StepValidation } from './base.handler';
import { APIError } from '../../../utils/errors';
import { Prisma, RequestType, RequestStatus } from '@prisma/client';

interface BatchData {
  batchId: string;
  quantity: number;
  style: string;
}

interface ValidationResponse<T> {
  success: boolean;
  data: T;
}

export class PatternRequestHandler extends BaseRequestHandler {
  protected steps: string[] = ['BATCH_VALIDATION', 'PATTERN_PROCESS', 'PATTERN_COMPLETE'];
  
  protected stepTransitions: Record<string, string[]> = {
    'BATCH_VALIDATION': ['PATTERN_PROCESS'],
    'PATTERN_PROCESS': ['PATTERN_COMPLETE'],
    'PATTERN_COMPLETE': []
  };

  protected stepValidations: Record<string, StepValidation> = {
    'BATCH_VALIDATION': {
      step: 'BATCH_VALIDATION',
      validate: async (data: { requestId: string; batchData: BatchData; operatorId: string }) => {
        await this.validateBatch(data.requestId, data.batchData, data.operatorId);
        return true;
      },
      errorMessage: 'Invalid batch validation'
    },
    'PATTERN_PROCESS': {
      step: 'PATTERN_PROCESS',
      validate: async (data: { requestId: string; operatorId: string }) => {
        // Will implement next
        return true;
      },
      errorMessage: 'Pattern processing failed'
    },
    'PATTERN_COMPLETE': {
      step: 'PATTERN_COMPLETE',
      validate: async (data: { requestId: string; operatorId: string }) => {
        // Will implement next
        return true;
      },
      errorMessage: 'Pattern completion failed'
    }
  };

  constructor() {
    super('PatternRequestHandler');
  }

  protected async findExactSKU(): Promise<null> {
    return null;
  }

  protected async findUniversalSKU(): Promise<null> {
    return null;
  }

  async validateBatch(
    requestId: string,
    batchData: BatchData,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'PATTERN') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid pattern request');
      }

      // Check batch exists and is ready
      const batch = await (tx as any).batch.findUnique({
        where: { id: batchData.batchId }
      });

      if (!batch) {
        throw new APIError(404, 'BATCH_NOT_FOUND', 'Batch not found');
      }

      if (batch.status !== 'READY') {
        throw new APIError(400, 'INVALID_BATCH_STATUS', 'Batch is not ready for pattern');
      }

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'BATCH_VALIDATION',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            batch_id: batchData.batchId,
            quantity: batchData.quantity,
            style: batchData.style
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
      throw this.handleError(error, 'Batch validation failed');
    });
  }

  async processPattern(
    requestId: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'PATTERN') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid pattern request');
      }

      if (!request.batch_id) {
        throw new APIError(400, 'BATCH_REQUIRED', 'Pattern request requires a batch');
      }

      // Update batch status
      try {
        await (tx as any).batch.update({
          where: { id: request.batch_id },
          data: { status: 'IN_PROGRESS' }
        });
      } catch (error) {
        throw new APIError(500, 'BATCH_UPDATE_FAILED', 'Failed to update batch status');
      }

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'PATTERN_PROCESS',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            batch_id: request.batch_id,
            status: 'IN_PROGRESS'
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
      throw this.handleError(error, 'Pattern processing failed');
    });
  }

  async completePattern(
    requestId: string,
    operatorId: string
  ): Promise<ValidationResponse<any>> {
    return this.withTransaction(async (tx) => {
      // First check request
      const request = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!request || request.type !== 'PATTERN') {
        throw new APIError(404, 'INVALID_REQUEST', 'Invalid pattern request');
      }

      if (!request.batch_id) {
        throw new APIError(404, 'BATCH_NOT_FOUND', 'Batch not found');
      }

      // Check batch exists and is in progress
      const batch = await (tx as any).batch.findUnique({
        where: { id: request.batch_id }
      });

      if (!batch) {
        throw new APIError(404, 'BATCH_NOT_FOUND', 'Batch not found');
      }

      if (batch.status !== 'IN_PROGRESS') {
        throw new APIError(400, 'INVALID_BATCH_STATUS', 'Batch must be in progress to complete');
      }

      // Update batch status
      await (tx as any).batch.update({
        where: { id: batch.id },
        data: { status: 'COMPLETED' }
      });

      // Create timeline entry
      await (tx as any).requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'PATTERN_COMPLETE',
          status: 'COMPLETED',
          operator_id: operatorId,
          metadata: {
            batch_id: batch.id,
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
      throw this.handleError(error, 'Pattern completion failed');
    });
  }
} 