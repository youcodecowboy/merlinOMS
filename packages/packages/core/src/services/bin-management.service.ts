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

interface BinCreationParams {
  type: BinType;
  zone: LocationZone;
  shelf: string;
  rack: string;
  position: string;
  capacity: number;
}

export class BinManagementService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private validation: ValidationService
  ) {}

  private generateBinCode(): string {
    // Generate random 3 digits
    const randomDigits = Math.floor(Math.random() * 900 + 100).toString();
    return `BIN${randomDigits}`;
  }

  private generateBinSKU(params: {
    binCode: string;
    zone: LocationZone;
    shelf: string;
    rack: string;
    position: string;
  }): string {
    const { binCode, zone, shelf, rack, position } = params;
    return `${binCode}-${zone}-${shelf}-${rack}-${position}`;
  }

  async createBin(params: BinCreationParams): Promise<ServiceResponse<any>> {
    const { type, zone, shelf, rack, position, capacity } = params;

    return this.prisma.$transaction(async (tx) => {
      // Generate bin code
      const binCode = await this.generateBinCode();

      // Generate bin SKU
      const binSKU = this.generateBinSKU({
        binCode,
        zone,
        shelf,
        rack,
        position
      });

      // Generate QR code
      const qrCode = await this.generateQRCode(binSKU);

      // Create bin
      const bin = await tx.bin.create({
        data: {
          code: binCode,
          sku: binSKU,
          qr_code: qrCode,
          type,
          zone,
          capacity,
          metadata: {
            shelf,
            rack,
            position,
            created_at: new Date(),
            last_audit: null
          }
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'BIN_CREATED',
        actorId: 'SYSTEM',
        metadata: {
          bin_id: bin.id,
          bin_code: binCode,
          bin_sku: binSKU,
          type,
          zone,
          capacity
        }
      });

      return {
        success: true,
        data: bin
      };
    });
  }

  async validateBinScan(params: {
    binSKU: string;
    scannedQR: string;
    actorId: string;
  }): Promise<{
    valid: boolean;
    bin?: any;
    error?: string;
  }> {
    const { binSKU, scannedQR, actorId } = params;

    const bin = await this.prisma.bin.findFirst({
      where: {
        sku: binSKU,
        qr_code: scannedQR,
        is_active: true
      }
    });

    if (!bin) {
      await this.eventLogger.logEvent({
        type: 'BIN_SCAN_FAILED',
        actorId,
        metadata: {
          bin_sku: binSKU,
          scanned_qr: scannedQR,
          reason: 'Invalid bin or QR code mismatch'
        }
      });

      return {
        valid: false,
        error: 'Invalid bin or QR code mismatch'
      };
    }

    await this.eventLogger.logEvent({
      type: 'BIN_SCAN_SUCCESSFUL',
      actorId,
      metadata: {
        bin_id: bin.id,
        bin_sku: binSKU,
        current_count: bin.current_count,
        capacity: bin.capacity
      }
    });

    return {
      valid: true,
      bin
    };
  }

  async deactivateBin(params: {
    binId: string;
    reason: string;
    actorId: string;
  }) {
    const { binId, reason, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const bin = await tx.bin.findUnique({
        where: { id: binId },
        include: {
          items: true
        }
      });

      if (!bin) {
        throw new Error('Bin not found');
      }

      if (bin.current_count > 0) {
        throw new Error('Cannot deactivate bin with items');
      }

      await tx.bin.update({
        where: { id: binId },
        data: {
          is_active: false,
          metadata: {
            ...bin.metadata,
            deactivated_at: new Date(),
            deactivated_by: actorId,
            deactivation_reason: reason
          }
        }
      });

      await this.eventLogger.logEvent({
        type: 'BIN_DEACTIVATED',
        actorId,
        metadata: {
          bin_id: binId,
          bin_sku: bin.sku,
          reason
        }
      });
    });
  }

  async getBinContents(binId: string): Promise<any> {
    const bin = await this.prisma.bin.findUnique({
      where: { id: binId },
      include: {
        items: {
          select: {
            id: true,
            sku: true,
            status1: true,
            status2: true
          }
        },
        bin_history: {
          orderBy: {
            created_at: 'desc'
          },
          take: 10
        }
      }
    });

    if (!bin) {
      throw new Error('Bin not found');
    }

    return {
      bin_details: {
        id: bin.id,
        sku: bin.sku,
        type: bin.type,
        capacity: bin.capacity,
        current_count: bin.current_count,
        is_active: bin.is_active
      },
      items: bin.items,
      recent_history: bin.bin_history
    };
  }
} 