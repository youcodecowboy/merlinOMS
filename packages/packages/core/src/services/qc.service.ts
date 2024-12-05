import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  ValidationResult,
  RequestType,
  RequestStatus,
  EventType
} from '@app/types';
import { EventLoggerService } from './event-logger.service';
import { ValidationService } from './validation.service';

interface QCCheckpoint {
  name: string;
  required: boolean;
  measurements?: {
    type: string;
    target: number;
    tolerance: number;
  }[];
  validations: string[];
}

interface QCResult {
  checkpoint: string;
  passed: boolean;
  measurements?: Record<string, number>;
  notes?: string;
  images?: string[];
}

export class QCService {
  private readonly CHECKPOINTS: QCCheckpoint[] = [
    {
      name: 'measurements',
      required: true,
      measurements: [
        { type: 'waist', target: 32, tolerance: 0.5 },
        { type: 'length', target: 34, tolerance: 0.5 }
      ],
      validations: ['validateMeasurements']
    },
    // ... other checkpoints
  ];

  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private validation: ValidationService
  ) {}

  async createQCRequest(params: {
    itemId: string;
    batchId?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    actorId: string;
  }) {
    const { itemId, batchId, priority, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        include: { order_assignment: true }
      });

      if (!item) throw new Error('Item not found');

      const qcRequest = await tx.request.create({
        data: {
          type: 'QC',
          status: 'PENDING',
          item_id: itemId,
          order_id: item.order_assignment?.id,
          metadata: {
            batch_id: batchId,
            priority,
            measurements: {},
            visual_inspection: {},
            defects: []
          }
        }
      });

      await this.eventLogger.logEvent({
        type: 'QC_REQUEST_CREATED',
        actorId,
        itemId,
        requestId: qcRequest.id,
        metadata: {
          priority,
          batch_id: batchId
        }
      });

      return qcRequest;
    });
  }

  async recordMeasurements(params: {
    requestId: string;
    measurements: Measurement[];
    actorId: string;
  }) {
    const { requestId, measurements, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: { item: true }
      });

      if (!request || request.type !== 'QC') {
        throw new Error('Invalid QC request');
      }

      // Validate measurements against tolerances
      const failedMeasurements = measurements.filter(m => 
        m.value < m.tolerance.min || m.value > m.tolerance.max
      );

      // Update request with measurements
      await tx.request.update({
        where: { id: requestId },
        data: {
          metadata: {
            ...request.metadata,
            measurements: measurements.map(m => ({
              point: m.point,
              value: m.value,
              within_tolerance: !failedMeasurements.some(f => f.point === m.point),
              recorded_at: new Date(),
              recorded_by: actorId
            }))
          }
        }
      });

      // If any measurements failed, create defect report
      if (failedMeasurements.length > 0) {
        await this.reportDefect({
          requestId,
          defect: {
            category: 'MEASUREMENT',
            severity: 'HIGH',
            description: `Out of tolerance: ${failedMeasurements.map(m => m.point).join(', ')}`,
            location: 'Multiple points',
            recoverable: false
          },
          actorId
        });
      }

      await this.eventLogger.logEvent({
        type: 'QC_MEASUREMENTS_RECORDED',
        actorId,
        requestId,
        itemId: request.item_id,
        metadata: {
          measurements_count: measurements.length,
          failed_count: failedMeasurements.length
        }
      });
    });
  }

  async reportDefect(params: {
    requestId: string;
    defect: DefectReport;
    actorId: string;
  }) {
    const { requestId, defect, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: { item: true }
      });

      if (!request || request.type !== 'QC') {
        throw new Error('Invalid QC request');
      }

      // Update request with defect
      await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          metadata: {
            ...request.metadata,
            defects: [
              ...(request.metadata.defects || []),
              {
                ...defect,
                reported_at: new Date(),
                reported_by: actorId
              }
            ]
          }
        }
      });

      // Update item status
      await tx.inventoryItem.update({
        where: { id: request.item_id },
        data: {
          status1: 'DEFECTIVE',
          metadata: {
            ...request.item.metadata,
            defect_history: [
              ...(request.item.metadata.defect_history || []),
              {
                defect,
                reported_at: new Date(),
                reported_by: actorId,
                qc_request_id: requestId
              }
            ]
          }
        }
      });

      // Create recovery request if defect is recoverable
      if (defect.recoverable) {
        await tx.request.create({
          data: {
            type: 'RECOVERY',
            status: 'PENDING',
            item_id: request.item_id,
            metadata: {
              original_qc_request: requestId,
              defect_category: defect.category,
              recommended_action: defect.recommendedAction
            }
          }
        });
      }

      await this.eventLogger.logEvent({
        type: 'DEFECT_REPORTED',
        actorId,
        requestId,
        itemId: request.item_id,
        metadata: {
          defect_category: defect.category,
          severity: defect.severity,
          recoverable: defect.recoverable
        }
      });
    });
  }

  async completeQCRequest(params: {
    requestId: string;
    passed: boolean;
    notes?: string;
    actorId: string;
  }) {
    const { requestId, passed, notes, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: { item: true }
      });

      if (!request || request.type !== 'QC') {
        throw new Error('Invalid QC request');
      }

      // Update request status
      await tx.request.update({
        where: { id: requestId },
        data: {
          status: passed ? 'COMPLETED' : 'FAILED',
          metadata: {
            ...request.metadata,
            completed_at: new Date(),
            completed_by: actorId,
            passed,
            notes
          }
        }
      });

      // If passed, create finishing request
      if (passed) {
        await tx.request.create({
          data: {
            type: 'FINISHING',
            status: 'PENDING',
            item_id: request.item_id,
            metadata: {
              qc_request_id: requestId
            }
          }
        });
      }

      await this.eventLogger.logEvent({
        type: 'QC_REQUEST_COMPLETED',
        actorId,
        requestId,
        itemId: request.item_id,
        metadata: {
          passed,
          notes
        }
      });
    });
  }
} 