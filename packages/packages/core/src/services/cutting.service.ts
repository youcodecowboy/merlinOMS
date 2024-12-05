import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  RequestType,
  RequestStatus,
  EventType,
  ProductionStage
} from '@app/types';
import { EventLoggerService } from './event-logger.service';
import { NotificationService } from './notification.service';

interface CuttingBatchMetrics {
  fabricCode: string;
  shadeCode: string;
  layers: number;
  consumption: number;
  piecesCut: number;
  defectPieces: number;
  wastage: number;
}

export class CuttingService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private notification: NotificationService
  ) {}

  async createCuttingBatch(params: {
    cuttingRequestId: string;
    metrics: CuttingBatchMetrics;
    actorId: string;
  }): Promise<ServiceResponse<any>> {
    const { cuttingRequestId, metrics, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.cuttingBatch.create({
        data: {
          cutting_request_id: cuttingRequestId,
          fabric_code: metrics.fabricCode,
          shade_code: metrics.shadeCode,
          layers: metrics.layers,
          consumption: metrics.consumption,
          pieces_cut: metrics.piecesCut,
          defect_pieces: metrics.defectPieces,
          wastage: metrics.wastage,
          status: 'IN_PROGRESS',
          metadata: {
            started_at: new Date(),
            started_by: actorId
          }
        }
      });

      await this.eventLogger.logEvent({
        type: 'CUTTING_BATCH_CREATED',
        actorId,
        metadata: {
          batch_id: batch.id,
          cutting_request_id: cuttingRequestId,
          metrics
        }
      });

      return {
        success: true,
        data: batch
      };
    });
  }

  async completeCuttingBatch(params: {
    batchId: string;
    finalMetrics: CuttingBatchMetrics;
    actorId: string;
  }): Promise<ServiceResponse<any>> {
    const { batchId, finalMetrics, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.cuttingBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          pieces_cut: finalMetrics.piecesCut,
          defect_pieces: finalMetrics.defectPieces,
          wastage: finalMetrics.wastage,
          completed_at: new Date(),
          metadata: {
            completed_by: actorId,
            final_metrics: finalMetrics
          }
        }
      });

      // Notify pattern maker of completion
      await this.notification.createNotification({
        type: 'CUTTING_COMPLETED',
        message: `Cutting batch ${batch.id} completed`,
        userRole: 'PATTERN_MAKER',
        metadata: {
          batch_id: batch.id,
          metrics: finalMetrics
        }
      });

      await this.eventLogger.logEvent({
        type: 'CUTTING_BATCH_COMPLETED',
        actorId,
        metadata: {
          batch_id: batch.id,
          final_metrics: finalMetrics
        }
      });

      return {
        success: true,
        data: batch
      };
    });
  }
} 