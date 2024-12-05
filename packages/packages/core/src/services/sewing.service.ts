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

interface SewingDefect {
  type: string;
  severity: string;
  location: string;
}

export class SewingService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private notification: NotificationService
  ) {}

  async startBatch(params: {
    cuttingBatchId: string;
    operatorId: string;
    machineId: string;
  }): Promise<ServiceResponse<any>> {
    const { cuttingBatchId, operatorId, machineId } = params;

    return this.prisma.$transaction(async (tx) => {
      // Get cutting batch
      const cuttingBatch = await tx.cuttingBatch.findUnique({
        where: { id: cuttingBatchId },
        include: { items: true }
      });

      if (!cuttingBatch) {
        throw new Error('Cutting batch not found');
      }

      // Create sewing batch
      const sewingBatch = await tx.sewingBatch.create({
        data: {
          status: 'IN_PROGRESS',
          cutting_batch_id: cuttingBatchId,
          operator_id: operatorId,
          machine_id: machineId,
          metadata: {
            started_at: new Date(),
            pieces_completed: 0,
            defects: []
          }
        }
      });

      // Update items status
      await tx.inventoryItem.updateMany({
        where: { id: { in: cuttingBatch.items.map(i => i.id) } },
        data: { 
          status1: 'SEWING',
          status2: 'IN_PROGRESS'
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'SEWING_BATCH_STARTED',
        actorId: operatorId,
        metadata: {
          batch_id: sewingBatch.id,
          cutting_batch_id: cuttingBatchId,
          machine_id: machineId,
          piece_count: cuttingBatch.items.length
        }
      });

      return {
        success: true,
        data: sewingBatch
      };
    });
  }

  async completePiece(params: {
    pieceId: string;
    operatorId: string;
    defects?: SewingDefect[];
  }): Promise<ServiceResponse<any>> {
    const { pieceId, operatorId, defects } = params;

    return this.prisma.$transaction(async (tx) => {
      const piece = await tx.inventoryItem.findUnique({
        where: { id: pieceId },
        include: { sewing_batch: true }
      });

      if (!piece) throw new Error('Piece not found');

      // Update piece status
      await tx.inventoryItem.update({
        where: { id: pieceId },
        data: {
          status1: defects?.length ? 'QC' : 'STOCK',
          status2: defects?.length ? 'DEFECT' : 'COMPLETED',
          metadata: {
            ...piece.metadata,
            sewing_completed_at: new Date(),
            sewing_completed_by: operatorId,
            sewing_defects: defects
          }
        }
      });

      // Update batch metrics
      await tx.sewingBatch.update({
        where: { id: piece.sewing_batch_id },
        data: {
          metadata: {
            ...piece.sewing_batch.metadata,
            pieces_completed: piece.sewing_batch.metadata.pieces_completed + 1,
            defects: [
              ...(piece.sewing_batch.metadata.defects || []),
              ...(defects || [])
            ]
          }
        }
      });

      // Create QC request if defects found
      if (defects?.length) {
        await tx.request.create({
          data: {
            type: 'QC',
            status: 'PENDING',
            item_id: pieceId,
            metadata: {
              defects,
              source: 'SEWING',
              priority: 'HIGH'
            }
          }
        });
      }

      // Log event
      await this.eventLogger.logEvent({
        type: 'SEWING_PIECE_COMPLETED',
        actorId: operatorId,
        itemId: pieceId,
        metadata: {
          has_defects: !!defects?.length,
          defect_count: defects?.length || 0
        }
      });

      return {
        success: true,
        data: {
          status: defects?.length ? 'SENT_TO_QC' : 'COMPLETED'
        }
      };
    });
  }

  async getOperatorQueue(operatorId: string): Promise<ServiceResponse<any>> {
    const batches = await this.prisma.sewingBatch.findMany({
      where: {
        operator_id: operatorId,
        status: 'IN_PROGRESS'
      },
      include: {
        items: true,
        cutting_batch: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    return {
      success: true,
      data: batches
    };
  }
} 