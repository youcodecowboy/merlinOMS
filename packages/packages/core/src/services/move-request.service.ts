import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  ValidationResult,
  RequestType,
  RequestStatus,
  EventType,
  LocationZone
} from '@app/types';
import { TypeValidator } from '@app/utils';
import { EventLoggerService } from './event-logger.service';
import { ValidationService } from './validation.service';
import { LocationManagementService } from './location-management.service';

interface MoveRequestParams {
  itemId: string;
  targetBinId: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  reason?: string;
  actorId: string;
}

export class MoveRequestService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private validation: ValidationService,
    private locationService: LocationManagementService
  ) {}

  async createMoveRequest(params: MoveRequestParams): Promise<ServiceResponse<any>> {
    const { itemId, targetBinId, priority = 'MEDIUM', reason, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Validate location assignment
      const locationValidation = await this.locationService.validateLocation({
        binId: targetBinId,
        itemId,
        actorId
      });

      if (!locationValidation.valid) {
        throw new Error(`Invalid location assignment: ${locationValidation.errors.join(', ')}`);
      }

      // Create move request
      const moveRequest = await tx.request.create({
        data: {
          type: 'MOVE',
          status: 'PENDING',
          item: { connect: { id: itemId } },
          metadata: {
            target_bin_id: targetBinId,
            priority,
            reason,
            validation_timestamp: new Date(),
            validated_by: actorId
          }
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'MOVE_REQUEST_CREATED',
        actorId,
        itemId,
        requestId: moveRequest.id,
        metadata: {
          target_bin_id: targetBinId,
          priority,
          reason
        }
      });

      return {
        success: true,
        data: moveRequest
      };
    });
  }

  // ... rest of the service methods
} 