import { PrismaClient } from '@prisma/client';
import { EventLoggerService } from './event-logger.service';
import { QRCodeService } from './qr-code.service';
import { WaitlistService } from './waitlist.service';
import { LocationManagementService } from './location-management.service';
import { ValidationService } from './validation.service';

interface QRActivationResult {
  success: boolean;
  action: 'WAITLIST_ASSIGNMENT' | 'STOCK_PLACEMENT' | 'QC_INITIATION';
  itemId: string;
  requestId?: string;
  binId?: string;
  message: string;
}

export class QRActivationService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private qrService: QRCodeService,
    private waitlistService: WaitlistService,
    private locationService: LocationManagementService,
    private validation: ValidationService
  ) {}

  async activateQR(params: {
    scannedQR: string;
    actorId: string;
  }): Promise<QRActivationResult> {
    const { scannedQR, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Validate QR code
      const qrValidation = await this.qrService.validateQRCode({
        scannedData: scannedQR,
        expectedType: 'INVENTORY_ITEM',
        actorId
      });

      if (!qrValidation.valid) {
        throw new Error('Invalid QR code');
      }

      const item = await tx.inventoryItem.findUnique({
        where: { id: qrValidation.metadata.entityId },
        include: {
          order_assignment: true
        }
      });

      if (!item) {
        throw new Error('Item not found');
      }

      // Handle initial activation (new item)
      if (!item.status1) {
        return this.handleInitialActivation(item, actorId);
      }

      // Handle post-wash activation
      if (item.status1 === 'WASH') {
        return this.handlePostWashActivation(item, actorId);
      }

      throw new Error('Invalid activation state');
    });
  }

  private async handleInitialActivation(item: any, actorId: string): Promise<QRActivationResult> {
    // Check waitlist for this SKU
    const waitlistedOrder = await this.waitlistService.getNextWaitlistedOrder(item.sku);

    if (waitlistedOrder) {
      // Assign to waitlisted order
      await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          status1: 'STOCK',
          status2: 'ASSIGNED',
          order_assignment: {
            connect: { id: waitlistedOrder.id }
          }
        }
      });

      // Create wash request
      const washRequest = await this.prisma.request.create({
        data: {
          type: 'WASH',
          status: 'PENDING',
          item_id: item.id,
          order_id: waitlistedOrder.id,
          metadata: {
            activation_type: 'INITIAL',
            assigned_from_waitlist: true
          }
        }
      });

      // Log events
      await this.eventLogger.logEvent({
        type: 'ITEM_ASSIGNED',
        actorId,
        itemId: item.id,
        orderId: waitlistedOrder.id,
        metadata: {
          activation_type: 'INITIAL',
          from_waitlist: true
        }
      });

      return {
        success: true,
        action: 'WAITLIST_ASSIGNMENT',
        itemId: item.id,
        requestId: washRequest.id,
        message: 'Item assigned from waitlist and wash request created'
      };

    } else {
      // Assign to stock
      const targetBin = await this.locationService.getTargetBin({
        sku: item.sku,
        status: 'STOCK'
      });

      if (!targetBin) {
        throw new Error('No available bin found for stock placement');
      }

      // Create move request
      const moveRequest = await this.prisma.request.create({
        data: {
          type: 'MOVE',
          status: 'PENDING',
          item_id: item.id,
          metadata: {
            target_bin_id: targetBin.id,
            activation_type: 'INITIAL'
          }
        }
      });

      // Update item status
      await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          status1: 'STOCK',
          status2: 'UNCOMMITTED'
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'ITEM_STATUS_CHANGED',
        actorId,
        itemId: item.id,
        metadata: {
          activation_type: 'INITIAL',
          new_status1: 'STOCK',
          new_status2: 'UNCOMMITTED',
          target_bin: targetBin.id
        }
      });

      return {
        success: true,
        action: 'STOCK_PLACEMENT',
        itemId: item.id,
        requestId: moveRequest.id,
        binId: targetBin.id,
        message: 'Item activated and move request created'
      };
    }
  }

  private async handlePostWashActivation(item: any, actorId: string): Promise<QRActivationResult> {
    // Validate item is in WASH status
    if (item.status1 !== 'WASH') {
      throw new Error('Item not in WASH status');
    }

    // Create QC request
    const qcRequest = await this.prisma.request.create({
      data: {
        type: 'QC',
        status: 'PENDING',
        item_id: item.id,
        order_id: item.order_assignment?.id,
        metadata: {
          activation_type: 'POST_WASH',
          previous_status: 'WASH'
        }
      }
    });

    // Update item status
    await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        status1: 'QC',
        metadata: {
          ...item.metadata,
          wash_completed_at: new Date(),
          wash_completed_by: actorId
        }
      }
    });

    // Log event
    await this.eventLogger.logEvent({
      type: 'ITEM_STATUS_CHANGED',
      actorId,
      itemId: item.id,
      metadata: {
        activation_type: 'POST_WASH',
        previous_status: 'WASH',
        new_status: 'QC',
        qc_request_id: qcRequest.id
      }
    });

    return {
      success: true,
      action: 'QC_INITIATION',
      itemId: item.id,
      requestId: qcRequest.id,
      message: 'Post-wash activation completed and QC request created'
    };
  }

  async validateActivation(params: {
    itemId: string;
    actorId: string;
  }): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const { itemId, actorId } = params;

    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        order_assignment: true,
        requests: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          }
        }
      }
    });

    if (!item) {
      return { valid: false, errors: ['Item not found'] };
    }

    const errors: string[] = [];

    // Check for active requests
    if (item.requests.length > 0) {
      errors.push('Item has active requests');
    }

    // Validate status transitions
    if (item.status1 === 'WASH') {
      // Validate wash completion
      const washRequest = item.requests.find(r => r.type === 'WASH');
      if (washRequest && washRequest.status !== 'COMPLETED') {
        errors.push('Wash request not completed');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
} 