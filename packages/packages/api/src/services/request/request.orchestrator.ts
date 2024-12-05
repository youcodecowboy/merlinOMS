import { BaseService } from '../base/base.service';
import { PrismaClient, RequestType, RequestStatus } from '@prisma/client';
import { APIError } from '../../utils/errors';
import { z } from 'zod';

const createRequestSchema = z.object({
  type: z.nativeEnum(RequestType),
  itemId: z.string().optional(),
  orderId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export class RequestOrchestratorService extends BaseService {
  private readonly ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
    PENDING: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED', 'FAILED'],
    COMPLETED: [],
    FAILED: ['PENDING'] // Allow retry
  };

  constructor() {
    super('RequestOrchestratorService');
  }

  async createRequest(data: z.infer<typeof createRequestSchema>, userId: string) {
    const validatedData = this.validateInput(createRequestSchema, data);

    return this.withTransaction(async (tx) => {
      // Validate references
      if (validatedData.itemId) {
        await this.exists(tx.inventoryItem, { id: validatedData.itemId }, 'Item not found');
      }
      if (validatedData.orderId) {
        await this.exists(tx.order, { id: validatedData.orderId }, 'Order not found');
      }

      // Create request
      const request = await tx.request.create({
        data: {
          ...validatedData,
          status: RequestStatus.PENDING,
          timeline: {
            create: {
              step: 'CREATED',
              status: RequestStatus.PENDING,
              operator_id: userId,
              metadata: validatedData.metadata
            }
          }
        },
        include: {
          timeline: true
        }
      });

      // Log action
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
    newStatus: RequestStatus,
    userId: string,
    metadata?: Record<string, any>
  ) {
    return this.withTransaction(async (tx) => {
      // Validate transition
      const request = await this.validateStatusTransition(
        tx.request,
        requestId,
        'status',
        newStatus,
        this.ALLOWED_TRANSITIONS
      );

      // Update request
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          timeline: {
            create: {
              step: `STATUS_${newStatus}`,
              status: newStatus,
              operator_id: userId,
              metadata
            }
          }
        },
        include: {
          timeline: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });

      // Track status change
      await this.trackStatusChange(
        'request',
        requestId,
        request.status,
        newStatus,
        userId,
        metadata
      );

      return this.formatResponse(updatedRequest);
    });
  }

  async getRequestTimeline(requestId: string) {
    const timeline = await this.prisma.requestTimeline.findMany({
      where: { request_id: requestId },
      orderBy: { created_at: 'asc' },
      include: {
        operator: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!timeline.length) {
      throw new APIError(404, 'NOT_FOUND', 'Request timeline not found');
    }

    return this.formatResponse(timeline);
  }

  async assignOperator(requestId: string, operatorId: string, assignerId: string) {
    return this.withTransaction(async (tx) => {
      // Validate request and operator
      await this.exists(tx.request, { id: requestId }, 'Request not found');
      await this.exists(tx.user, { id: operatorId }, 'Operator not found');

      // Create timeline entry
      const timeline = await tx.requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'OPERATOR_ASSIGNED',
          status: RequestStatus.PENDING,
          operator_id: operatorId,
          metadata: {
            assigned_by: assignerId,
            assigned_at: new Date()
          }
        }
      });

      // Log action
      await this.logAction(
        'OPERATOR_ASSIGNED',
        assignerId,
        'request',
        requestId,
        { operator_id: operatorId }
      );

      return this.formatResponse(timeline);
    });
  }
} 