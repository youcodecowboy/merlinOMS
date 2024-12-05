import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  RequestType,
  RequestStatus,
  EventType,
  LocationZone
} from '@app/types';
import { EventLoggerService } from './event-logger.service';
import { LocationManagementService } from './location-management.service';
import { QRCodeService } from './qr-code.service';

interface PackingInstructions {
  packingType: 'SINGLE' | 'MULTI';
  requiresBox: boolean;
  specialInstructions?: string[];
}

interface PackingValidation {
  itemsVerified: boolean;
  qrCodesScanned: boolean;
  measurementsConfirmed: boolean;
  packagingChecked: boolean;
}

export class PackingService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private locationService: LocationManagementService,
    private qrService: QRCodeService
  ) {}

  async createPackingRequest(params: {
    itemIds: string[];
    orderId: string;
    instructions: PackingInstructions;
    actorId: string;
  }): Promise<ServiceResponse<any>> {
    const { itemIds, orderId, instructions, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Validate all items are ready for packing
      const items = await tx.inventoryItem.findMany({
        where: {
          id: { in: itemIds },
          status1: 'STOCK',
          status2: 'ASSIGNED'
        }
      });

      if (items.length !== itemIds.length) {
        throw new Error('Some items are not ready for packing');
      }

      // Create packing request
      const request = await tx.request.create({
        data: {
          type: 'PACKING',
          status: 'PENDING',
          order_id: orderId,
          metadata: {
            items: itemIds,
            instructions,
            validation: {
              itemsVerified: false,
              qrCodesScanned: false,
              measurementsConfirmed: false,
              packagingChecked: false
            }
          }
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'PACKING_REQUEST_CREATED',
        actorId,
        requestId: request.id,
        orderId,
        metadata: {
          item_count: itemIds.length,
          instructions
        }
      });

      return {
        success: true,
        data: request
      };
    });
  }

  async validatePackingStep(params: {
    requestId: string;
    step: keyof PackingValidation;
    actorId: string;
  }): Promise<ServiceResponse<any>> {
    const { requestId, step, actorId } = params;

    const request = await this.prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!request || request.type !== 'PACKING') {
      throw new Error('Invalid packing request');
    }

    const validation = request.metadata.validation as PackingValidation;
    validation[step] = true;

    // Update request
    await this.prisma.request.update({
      where: { id: requestId },
      data: {
        metadata: {
          ...request.metadata,
          validation
        }
      }
    });

    // Log event
    await this.eventLogger.logEvent({
      type: 'PACKING_STEP_VALIDATED',
      actorId,
      requestId,
      metadata: {
        step,
        validation
      }
    });

    // Check if all steps are validated
    const allValidated = Object.values(validation).every(v => v);
    if (allValidated) {
      await this.completePackingRequest({
        requestId,
        actorId
      });
    }

    return {
      success: true,
      data: validation
    };
  }

  private async completePackingRequest(params: {
    requestId: string;
    actorId: string;
  }) {
    const { requestId, actorId } = params;

    await this.prisma.$transaction(async (tx) => {
      const request = await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          metadata: {
            completed_at: new Date(),
            completed_by: actorId
          }
        }
      });

      // Update items status
      await tx.inventoryItem.updateMany({
        where: {
          id: { in: request.metadata.items }
        },
        data: {
          status1: 'PACKED'
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'PACKING_REQUEST_COMPLETED',
        actorId,
        requestId,
        metadata: {
          item_count: request.metadata.items.length
        }
      });
    });
  }
} 