import { PrismaClient } from '@prisma/client';
import { EventLoggerService } from './event-logger.service';
import { generateQRCode, generateUniqueId } from '../utils/identifier';
import { createQRCodePDF } from '../utils/pdf';

export class ProductionRequestService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService
  ) {}

  async acceptProductionRequest(params: {
    requestId: string;
    adjustedQuantity?: number;
    actorId: string;
  }) {
    const { requestId, adjustedQuantity, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Get production request
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: {
          order: true
        }
      });

      if (!request || request.type !== 'PATTERN') {
        throw new Error('Invalid production request');
      }

      const quantity = adjustedQuantity || request.metadata.quantity;
      const universalSku = request.metadata.universal_sku;

      // Create production batch
      const batch = await tx.productionBatch.create({
        data: {
          sku: universalSku,
          quantity,
          status: 'CREATED',
          metadata: {
            original_request_id: requestId,
            order_ids: request.metadata.order_ids
          }
        }
      });

      // Generate inventory items
      const inventoryItems = await Promise.all(
        Array.from({ length: quantity }).map(async () => {
          const itemId = generateUniqueId(); // Generate 8-digit alphanumeric ID
          const qrCode = await generateQRCode(itemId);

          return tx.inventoryItem.create({
            data: {
              id: itemId,
              sku: universalSku,
              status1: 'PRODUCTION',
              status2: 'UNCOMMITTED',
              location: 'PENDING_PRODUCTION',
              production_batch: {
                connect: { id: batch.id }
              },
              qr_code: qrCode
            }
          });
        })
      );

      // Generate QR code PDF
      const pdfUrl = await createQRCodePDF({
        batchId: batch.id,
        items: inventoryItems.map(item => ({
          id: item.id,
          qrCode: item.qr_code
        }))
      });

      // Create pattern request
      const patternRequest = await tx.patternRequest.create({
        data: {
          status: 'PENDING',
          sku: universalSku,
          quantity,
          production_batch: {
            connect: { id: batch.id }
          },
          metadata: {
            pdf_url: pdfUrl
          }
        }
      });

      // Update production request status
      await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...request.metadata,
            production_batch_id: batch.id,
            pattern_request_id: patternRequest.id
          }
        }
      });

      // Log events
      await this.eventLogger.logEvent({
        type: 'PRODUCTION_REQUEST_ACCEPTED',
        actorId,
        requestId,
        metadata: {
          quantity,
          universal_sku: universalSku,
          batch_id: batch.id
        }
      });

      return {
        batchId: batch.id,
        patternRequestId: patternRequest.id,
        pdfUrl,
        itemIds: inventoryItems.map(item => item.id)
      };
    });
  }
} 