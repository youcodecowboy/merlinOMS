import { PrismaClient } from '@prisma/client';
import { EventLoggerService } from './event-logger.service';
import { 
  ServiceResponse,
  ValidationResult,
  EventType,
  QRCodeType 
} from '@app/types';
import QRCode from 'qrcode';
import crypto from 'crypto';

interface QRPayload {
  id: string;
  type: QRCodeType;
  version: number;
  metadata: Record<string, any>;
  checksum: string;
}

export class QRCodeService {
  private readonly SECRET_KEY = process.env.QR_SECRET_KEY || 'your-secret-key';
  private readonly QR_VERSION = 1;

  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService
  ) {}

  async generateQRCode(params: {
    type: QRCodeType;
    entityId: string;
    actorId: string;
    expiresAt?: Date;
    additionalData?: Record<string, any>;
  }): Promise<{
    qrCode: string;
    qrImage: string;
    metadata: QRCodeMetadata;
  }> {
    const { type, entityId, actorId, expiresAt, additionalData } = params;

    // Create QR metadata
    const metadata: QRCodeMetadata = {
      type,
      entityId,
      version: this.QR_VERSION,
      createdAt: new Date(),
      expiresAt
    };

    // Generate unique identifier
    const uniqueId = crypto.randomBytes(16).toString('hex');

    // Create payload
    const payload = {
      id: uniqueId,
      metadata,
      data: additionalData,
      checksum: this.generateChecksum(uniqueId, metadata)
    };

    // Generate QR code
    const qrImage = await QRCode.toDataURL(JSON.stringify(payload), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });

    // Store QR code record
    await this.prisma.qrCode.create({
      data: {
        id: uniqueId,
        type,
        entity_id: entityId,
        metadata: metadata as any,
        created_by: actorId,
        expires_at: expiresAt
      }
    });

    // Log event
    await this.eventLogger.logEvent({
      type: 'QR_CODE_GENERATED',
      actorId,
      metadata: {
        qr_id: uniqueId,
        qr_type: type,
        entity_id: entityId,
        expires_at: expiresAt
      }
    });

    return {
      qrCode: uniqueId,
      qrImage,
      metadata
    };
  }

  async validateQRCode(params: {
    scannedData: string;
    expectedType?: QRCodeType;
    actorId: string;
  }): Promise<{
    valid: boolean;
    metadata?: QRCodeMetadata;
    error?: string;
  }> {
    try {
      // Parse scanned data
      const payload = JSON.parse(scannedData);
      
      // Verify checksum
      const expectedChecksum = this.generateChecksum(payload.id, payload.metadata);
      if (payload.checksum !== expectedChecksum) {
        throw new Error('Invalid QR code checksum');
      }

      // Get QR record from database
      const qrRecord = await this.prisma.qrCode.findUnique({
        where: { id: payload.id }
      });

      if (!qrRecord) {
        throw new Error('QR code not found in database');
      }

      // Validate type if expected type provided
      if (params.expectedType && qrRecord.type !== params.expectedType) {
        throw new Error(`Invalid QR code type. Expected: ${params.expectedType}, Got: ${qrRecord.type}`);
      }

      // Check expiration
      if (qrRecord.expires_at && qrRecord.expires_at < new Date()) {
        throw new Error('QR code has expired');
      }

      // Log validation
      await this.eventLogger.logEvent({
        type: 'QR_CODE_VALIDATED',
        actorId: params.actorId,
        metadata: {
          qr_id: payload.id,
          qr_type: qrRecord.type,
          entity_id: qrRecord.entity_id,
          validation_success: true
        }
      });

      return {
        valid: true,
        metadata: qrRecord.metadata as QRCodeMetadata
      };

    } catch (error) {
      // Log validation failure
      await this.eventLogger.logEvent({
        type: 'QR_CODE_VALIDATION_FAILED',
        actorId: params.actorId,
        metadata: {
          error: error.message,
          scanned_data: scannedData
        }
      });

      return {
        valid: false,
        error: error.message
      };
    }
  }

  private generateChecksum(id: string, metadata: QRCodeMetadata): string {
    const data = `${id}:${JSON.stringify(metadata)}:${this.SECRET_KEY}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async invalidateQRCode(params: {
    qrId: string;
    reason: string;
    actorId: string;
  }): Promise<void> {
    const { qrId, reason, actorId } = params;

    await this.prisma.$transaction(async (tx) => {
      // Update QR record
      await tx.qrCode.update({
        where: { id: qrId },
        data: {
          is_valid: false,
          metadata: {
            invalidated_at: new Date(),
            invalidated_by: actorId,
            invalidation_reason: reason
          }
        }
      });

      // Log invalidation
      await this.eventLogger.logEvent({
        type: 'QR_CODE_INVALIDATED',
        actorId,
        metadata: {
          qr_id: qrId,
          reason
        }
      });
    });
  }

  async getQRCodeHistory(qrId: string): Promise<any[]> {
    return this.prisma.event.findMany({
      where: {
        metadata: {
          path: ['qr_id'],
          equals: qrId
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }
} 