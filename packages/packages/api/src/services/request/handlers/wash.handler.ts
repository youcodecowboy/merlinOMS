import { BaseRequestHandler, StepValidation } from './base.handler';
import { PrismaClient, RequestStatus, BinType } from '@prisma/client';
import { APIError } from '../../../utils/errors';
import { SKUService } from '../../sku/sku.service';
import { BinService } from '../../bin/bin.service';
import { z } from 'zod';

export enum WashStep {
  CREATED = 'CREATED',
  ASSIGN_BIN = 'ASSIGN_BIN',
  BIN_ASSIGNED = 'BIN_ASSIGNED',
  READY_FOR_LAUNDRY = 'READY_FOR_LAUNDRY',
  AT_LAUNDRY = 'AT_LAUNDRY',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

const STEP_TRANSITIONS: Record<WashStep, WashStep[]> = {
  [WashStep.CREATED]: [WashStep.ASSIGN_BIN],
  [WashStep.ASSIGN_BIN]: [WashStep.BIN_ASSIGNED, WashStep.FAILED],
  [WashStep.BIN_ASSIGNED]: [WashStep.READY_FOR_LAUNDRY],
  [WashStep.READY_FOR_LAUNDRY]: [WashStep.AT_LAUNDRY, WashStep.FAILED],
  [WashStep.AT_LAUNDRY]: [WashStep.COMPLETED, WashStep.FAILED],
  [WashStep.COMPLETED]: [], // Terminal state
  [WashStep.FAILED]: [WashStep.CREATED] // Allow retry
};

const binAssignmentSchema = z.object({
  binQrCode: z.string(),
  operatorNotes: z.string().optional()
});

const laundryPickupSchema = z.object({
  binQrCode: z.string(),
  truckId: z.string(),
  driverName: z.string(),
  expectedReturnDate: z.date()
});

export class WashRequestHandler extends BaseRequestHandler {
  private skuService: SKUService;
  private binService: BinService;

  protected steps = Object.values(WashStep);
  protected stepTransitions = STEP_TRANSITIONS;
  protected stepValidations: Record<string, StepValidation> = {
    [WashStep.BIN_ASSIGNED]: {
      step: WashStep.BIN_ASSIGNED,
      validate: this.validateBinAssignment.bind(this),
      errorMessage: 'Invalid bin assignment'
    },
    [WashStep.AT_LAUNDRY]: {
      step: WashStep.AT_LAUNDRY,
      validate: this.validateLaundryPickup.bind(this),
      errorMessage: 'Invalid laundry pickup'
    }
  };

  constructor() {
    super('WashRequestHandler');
    this.skuService = new SKUService();
    this.binService = new BinService();
  }

  async assignToBin(
    requestId: string,
    binData: z.infer<typeof binAssignmentSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        WashStep.ASSIGN_BIN
      );

      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Validate bin using BinService
      const bin = await this.binService.validateBin(
        binData.binQrCode,
        BinType.WASH
      );

      // Validate wash group compatibility
      const itemWashGroup = this.skuService.getWashGroup(item.sku);
      const binWashGroup = this.skuService.getWashGroup(bin.sku);
      
      if (itemWashGroup !== binWashGroup) {
        throw new APIError(400, 'WASH_GROUP_MISMATCH', 
          `Item wash group (${itemWashGroup}) does not match bin wash group (${binWashGroup})`);
      }

      // Assign item to bin using BinService
      await this.binService.assignItemToBin(
        item.id,
        bin.id,
        operatorId,
        {
          request_id: requestId,
          wash_group: binWashGroup,
          notes: binData.operatorNotes
        }
      );

      // Update request timeline
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          timeline: {
            create: {
              step: WashStep.BIN_ASSIGNED,
              status: RequestStatus.PENDING,
              operator_id: operatorId,
              metadata: {
                bin_id: bin.id,
                bin_code: bin.code,
                wash_group: binWashGroup,
                assigned_at: new Date(),
                notes: binData.operatorNotes
              }
            }
          }
        }
      });

      return this.formatResponse(updatedRequest);
    });
  }

  async processBinForLaundry(
    binQrCode: string,
    pickupData: z.infer<typeof laundryPickupSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      // Get the bin and its items
      const bin = await tx.bin.findFirst({
        where: {
          qr_code: binQrCode,
          type: BinType.WASH
        },
        include: {
          items: true
        }
      });

      if (!bin) {
        throw new APIError(404, 'BIN_NOT_FOUND', 'Invalid wash bin');
      }

      if (bin.current_count === 0) {
        throw new APIError(400, 'BIN_EMPTY', 'Bin is empty');
      }

      // Update all items in the bin
      await tx.inventoryItem.updateMany({
        where: {
          bin_id: bin.id
        },
        data: {
          location: 'AT_LAUNDRY',
          bin_id: null,
          status1: 'WASHING',
          status2: 'IN_PROGRESS'
        }
      });

      // Update all associated wash requests
      const requests = await tx.request.findMany({
        where: {
          type: 'WASH',
          item_id: {
            in: bin.items.map(item => item.id)
          },
          status: {
            not: RequestStatus.COMPLETED
          }
        }
      });

      // Update each request
      for (const request of requests) {
        await tx.request.update({
          where: { id: request.id },
          data: {
            status: RequestStatus.IN_PROGRESS,
            timeline: {
              create: {
                step: WashStep.AT_LAUNDRY,
                status: RequestStatus.IN_PROGRESS,
                operator_id: operatorId,
                metadata: {
                  pickup_data: pickupData,
                  previous_bin: bin.code
                }
              }
            }
          }
        });
      }

      // Reset bin count
      await tx.bin.update({
        where: { id: bin.id },
        data: {
          current_count: 0
        }
      });

      // Log bin history
      await tx.binHistory.create({
        data: {
          bin_id: bin.id,
          action: 'LAUNDRY_PICKUP',
          metadata: {
            item_count: bin.current_count,
            pickup_data: pickupData,
            operator_id: operatorId
          }
        }
      });

      return this.formatResponse({
        bin_code: bin.code,
        items_processed: bin.current_count,
        requests_updated: requests.length,
        pickup_details: pickupData
      });
    });
  }

  // ... rest of the handler implementation
} 