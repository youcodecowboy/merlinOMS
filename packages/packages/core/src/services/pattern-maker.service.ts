import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  RequestType,
  RequestStatus,
  EventType,
  ProductionStage
} from '@app/types';
import { EventLoggerService } from './event-logger.service';

interface PatternSpecs {
  style: string;
  size: string;
  shape: string;
  measurements: Record<string, number>;
  notes?: string;
}

interface PatternValidation {
  valid: boolean;
  errors: string[];
  measurements?: Record<string, {
    value: number;
    inTolerance: boolean;
    tolerance: number;
  }>;
}

export class PatternMakerService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService
  ) {}

  async createCuttingRequest(params: {
    patternRequestIds: string[];
    actorId: string;
    notes?: string;
  }) {
    const { patternRequestIds, actorId, notes } = params;

    return this.prisma.$transaction(async (tx) => {
      // Get all pattern requests
      const patternRequests = await tx.patternRequest.findMany({
        where: {
          id: { in: patternRequestIds },
          status: 'PENDING'
        },
        include: {
          production_batch: true
        }
      });

      if (patternRequests.length !== patternRequestIds.length) {
        throw new Error('Some pattern requests are invalid or already processed');
      }

      // Create cutting request
      const cuttingRequest = await tx.cuttingRequest.create({
        data: {
          status: 'PENDING_PICKUP',
          pattern_requests: {
            connect: patternRequests.map(pr => ({ id: pr.id }))
          },
          metadata: {
            notes,
            total_quantity: patternRequests.reduce((sum, pr) => sum + pr.quantity, 0)
          }
        }
      });

      // Update pattern requests and batch status
      await tx.patternRequest.updateMany({
        where: { id: { in: patternRequestIds } },
        data: { 
          status: 'IN_CUTTING',
          cutting_request_id: cuttingRequest.id
        }
      });

      // Update batch status to PATTERN
      const batchIds = [...new Set(patternRequests.map(pr => pr.production_batch?.id).filter(Boolean))];
      for (const batchId of batchIds) {
        const batch = await tx.batch.update({
          where: { id: batchId },
          data: { status: 'PATTERN' }
        });

        // Create status history entry
        await tx.statusHistory.create({
          data: {
            entity_type: 'batch',
            entity_id: batchId,
            old_status: 'PENDING',
            new_status: 'PATTERN',
            changed_by: actorId,
            metadata: {
              cutting_request_id: cuttingRequest.id,
              notes: 'Pattern request accepted and cutting request created'
            }
          }
        });
      }

      // Create notification for cutting team
      await tx.notification.create({
        data: {
          type: 'CUTTING_PICKUP_READY',
          message: `Cutting request ${cuttingRequest.id} ready for pickup`,
          user: {
            connect: {
              role: 'CUTTING_TEAM'
            }
          }
        }
      });

      // Log events
      await this.eventLogger.logEvent({
        type: 'CUTTING_REQUEST_CREATED',
        actorId,
        metadata: {
          cutting_request_id: cuttingRequest.id,
          pattern_request_ids: patternRequestIds,
          total_quantity: cuttingRequest.metadata.total_quantity,
          batch_ids: batchIds
        }
      });

      return cuttingRequest;
    });
  }
} 