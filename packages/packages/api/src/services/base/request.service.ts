import { BaseService } from './base.service';
import { RequestStatus, RequestType, PrismaClient } from '@prisma/client';
import { APIError } from '../../utils/errors';
import { z } from 'zod';

const createRequestSchema = z.object({
  type: z.nativeEnum(RequestType),
  itemId: z.string().optional(),
  orderId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export class RequestService extends BaseService {
  constructor() {
    super('RequestService');
  }

  async createRequest(data: z.infer<typeof createRequestSchema>, userId: string) {
    const validatedData = this.validateInput(createRequestSchema, data);

    return this.withTransaction(async (tx) => {
      // Validate references if provided
      if (validatedData.itemId) {
        await this.exists(
          tx.inventoryItem,
          { id: validatedData.itemId },
          'Item not found'
        );
      }

      if (validatedData.orderId) {
        await this.exists(
          tx.order,
          { id: validatedData.orderId },
          'Order not found'
        );
      }

      const request = await tx.request.create({
        data: {
          ...validatedData,
          status: RequestStatus.PENDING
        }
      });

      await this.logAction(
        'REQUEST_CREATED',
        userId,
        'request',
        request.id,
        validatedData
      );

      return this.formatResponse(request);
    });
  }

  async updateRequestStatus(
    requestId: string,
    status: RequestStatus,
    userId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await tx.request.update({
        where: { id: requestId },
        data: { status }
      });

      await this.logAction(
        'REQUEST_STATUS_UPDATED',
        userId,
        'request',
        requestId,
        { status }
      );

      return this.formatResponse(request);
    });
  }
} 