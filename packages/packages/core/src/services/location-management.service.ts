import { PrismaClient, BinType } from '@prisma/client';
import { 
  ServiceResponse,
  ValidationResult,
  LocationZone,
  EventType
} from '@app/types';
import { TypeValidator } from '@app/utils';
import { EventLoggerService } from './event-logger.service';
import { ValidationService } from './validation.service';

interface BinAssignmentCriteria {
  sku: string;
  quantity: number;
  preferredZone?: string;
  requireSingleSku?: boolean;
}

interface MoveOperation {
  itemId: string;
  targetBinId: string;
  reason: string;
}

export class LocationManagementService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private validation: ValidationService
  ) {}

  async findOptimalBin(params: BinAssignmentCriteria): Promise<string | null> {
    const { sku, quantity, preferredZone, requireSingleSku } = params;

    return this.prisma.$transaction(async (tx) => {
      // 1. Try to find existing bin with same SKU
      if (requireSingleSku !== false) { // Default to true
        const existingBin = await tx.bin.findFirst({
          where: {
            type: 'STORAGE',
            is_active: true,
            items: {
              some: { sku }
            },
            current_count: {
              lt: tx.bin.capacity
            }
          },
          orderBy: {
            current_count: 'desc' // Prefer fuller bins to consolidate
          }
        });

        if (existingBin && (existingBin.capacity - existingBin.current_count) >= quantity) {
          return existingBin.id;
        }
      }

      // 2. Try to find empty bin in preferred zone
      const emptyBin = await tx.bin.findFirst({
        where: {
          type: 'STORAGE',
          is_active: true,
          current_count: 0,
          zone: preferredZone,
        }
      });

      if (emptyBin) {
        return emptyBin.id;
      }

      // 3. Find bin with most available space
      const availableBin = await tx.bin.findFirst({
        where: {
          type: 'STORAGE',
          is_active: true,
          current_count: {
            lt: tx.bin.capacity
          }
        },
        orderBy: {
          current_count: 'asc'
        }
      });

      return availableBin?.id || null;
    });
  }

  async assignBin(params: {
    itemId: string;
    binId: string;
    actorId: string;
  }) {
    const { itemId, binId, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Validate assignment
      const validationResult = await this.validation.validateBinAssignment({
        itemId,
        binId
      });

      if (!validationResult.valid) {
        throw new Error(`Invalid bin assignment: ${validationResult.errors.join(', ')}`);
      }

      const [item, bin] = await Promise.all([
        tx.inventoryItem.findUnique({ where: { id: itemId } }),
        tx.bin.findUnique({ where: { id: binId } })
      ]);

      if (!item || !bin) {
        throw new Error('Item or bin not found');
      }

      // Update item location
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          bin_id: binId,
          location: `${bin.zone}-${bin.code}`
        }
      });

      // Update bin count
      await tx.bin.update({
        where: { id: binId },
        data: {
          current_count: { increment: 1 }
        }
      });

      // Create bin history record
      await tx.binHistory.create({
        data: {
          bin_id: binId,
          item_id: itemId,
          action: 'added'
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'ITEM_LOCATION_CHANGED',
        actorId,
        itemId,
        metadata: {
          previous_location: item.location,
          new_location: `${bin.zone}-${bin.code}`,
          bin_id: binId,
          reason: 'Initial bin assignment'
        }
      });
    });
  }

  async moveItem(params: {
    itemId: string;
    targetBinId: string;
    reason: string;
    actorId: string;
  }) {
    const { itemId, targetBinId, reason, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        include: { current_bin: true }
      });

      if (!item) throw new Error('Item not found');
      if (!item.current_bin) throw new Error('Item not currently in a bin');

      const targetBin = await tx.bin.findUnique({
        where: { id: targetBinId }
      });

      if (!targetBin) throw new Error('Target bin not found');

      // Validate move
      const validationResult = await this.validation.validateBinAssignment({
        itemId,
        binId: targetBinId
      });

      if (!validationResult.valid) {
        throw new Error(`Invalid move operation: ${validationResult.errors.join(', ')}`);
      }

      // Update previous bin count
      await tx.bin.update({
        where: { id: item.current_bin.id },
        data: {
          current_count: { decrement: 1 }
        }
      });

      // Create bin history record for removal
      await tx.binHistory.create({
        data: {
          bin_id: item.current_bin.id,
          item_id: itemId,
          action: 'removed'
        }
      });

      // Update item location
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          bin_id: targetBinId,
          location: `${targetBin.zone}-${targetBin.code}`
        }
      });

      // Update new bin count
      await tx.bin.update({
        where: { id: targetBinId },
        data: {
          current_count: { increment: 1 }
        }
      });

      // Create bin history record for addition
      await tx.binHistory.create({
        data: {
          bin_id: targetBinId,
          item_id: itemId,
          action: 'added'
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'ITEM_MOVED',
        actorId,
        itemId,
        metadata: {
          previous_bin: item.current_bin.id,
          new_bin: targetBinId,
          reason,
          previous_location: item.location,
          new_location: `${targetBin.zone}-${targetBin.code}`
        }
      });
    });
  }

  async handleProductionCompletion(params: {
    itemId: string;
    actorId: string;
  }) {
    const { itemId, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!item) throw new Error('Item not found');
      if (item.status1 !== 'PRODUCTION') {
        throw new Error('Item must be in PRODUCTION status');
      }

      // Find optimal bin
      const optimalBinId = await this.findOptimalBin({
        sku: item.sku,
        quantity: 1
      });

      if (!optimalBinId) {
        throw new Error('No available storage bins');
      }

      // Update item status and assign bin
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          status1: 'STOCK',
          bin_id: optimalBinId
        }
      });

      // Complete bin assignment
      await this.assignBin({
        itemId,
        binId: optimalBinId,
        actorId
      });
    });
  }

  async validateLocation(params: {
    binId: string;
    itemId: string;
    actorId: string;
  }): Promise<ValidationResult> {
    const { binId, itemId, actorId } = params;

    const [bin, item] = await Promise.all([
      this.prisma.bin.findUnique({ where: { id: binId } }),
      this.prisma.inventoryItem.findUnique({ where: { id: itemId } })
    ]);

    if (!bin || !item) {
      return {
        valid: false,
        errors: ['Bin or item not found']
      };
    }

    // Validate bin capacity
    if (bin.current_count >= bin.capacity) {
      return {
        valid: false,
        errors: ['Bin is at maximum capacity']
      };
    }

    // Validate bin type matches item status
    const validBinTypes = this.getValidBinTypes(item.status1);
    if (!validBinTypes.includes(bin.type)) {
      return {
        valid: false,
        errors: [`Invalid bin type for item status: ${item.status1}`]
      };
    }

    return {
      valid: true,
      errors: []
    };
  }

  private getValidBinTypes(itemStatus: string): BinType[] {
    switch (itemStatus) {
      case 'STOCK':
        return ['STORAGE', 'WASH'];
      case 'QC':
        return ['QC'];
      case 'PACKING':
        return ['PACKING'];
      default:
        return ['STORAGE'];
    }
  }
} 