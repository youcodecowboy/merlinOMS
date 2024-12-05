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
import { SKUService } from './sku.service';

export type FinishingOperation = 
  | 'HEM'
  | 'BUTTON'
  | 'NAMETAG'
  | 'PRESS'
  | 'FINAL_INSPECTION';

export type ButtonColor = 
  | 'WHITE'
  | 'BLACK'
  | 'MATTE_BLACK'
  | 'CREAM'
  | 'ELECTRIC_BLUE'
  | 'NAVY';

interface FinishingInstructions {
  buttonColor: ButtonColor;
  nametag?: string;
  targetLength: number;
  currentLength: number;
}

interface FinishingStep {
  operation: FinishingOperation;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
  measurements?: {
    hemLength?: number;
    confirmedBy?: string;
    confirmedAt?: Date;
  };
}

export class FinishingService {
  constructor(
    private prisma: PrismaClient,
    private eventLogger: EventLoggerService,
    private validation: ValidationService,
    private skuService: SKUService
  ) {}

  async createFinishingRequest(params: {
    itemId: string;
    qcRequestId: string;
    targetSKU: string;
    instructions: FinishingInstructions;
    actorId: string;
  }) {
    const { itemId, qcRequestId, targetSKU, instructions, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        include: {
          order_assignment: true
        }
      });

      if (!item) throw new Error('Item not found');

      // Validate SKU transformation
      const skuValidation = await this.validation.validateSKUAssignment({
        currentSKU: item.sku,
        targetSKU
      });

      if (!skuValidation.valid) {
        throw new Error(`Invalid SKU transformation: ${skuValidation.errors.join(', ')}`);
      }

      // Determine required operations
      const operations = this.determineRequiredOperations(instructions);

      // Create finishing request
      const request = await tx.request.create({
        data: {
          type: 'FINISHING',
          status: 'PENDING',
          item_id: itemId,
          order_id: item.order_assignment?.id,
          metadata: {
            qc_request_id: qcRequestId,
            current_sku: item.sku,
            target_sku: targetSKU,
            instructions: {
              buttonColor: instructions.buttonColor,
              nametag: instructions.nametag,
              targetLength: instructions.targetLength,
              currentLength: instructions.currentLength
            },
            operations: operations.map(op => ({
              operation: op,
              completed: false,
              measurements: op === 'HEM' ? {
                targetLength: instructions.targetLength,
                currentLength: instructions.currentLength
              } : undefined
            })),
            started_at: null,
            completed_at: null
          }
        }
      });

      // Log event
      await this.eventLogger.logEvent({
        type: 'FINISHING_REQUEST_CREATED',
        actorId,
        itemId,
        requestId: request.id,
        metadata: {
          current_sku: item.sku,
          target_sku: targetSKU,
          required_operations: operations,
          instructions
        }
      });

      return request;
    });
  }

  private determineRequiredOperations(
    instructions: FinishingInstructions
  ): FinishingOperation[] {
    const operations: FinishingOperation[] = [];

    // Always required
    operations.push('PRESS', 'FINAL_INSPECTION');

    // Button is always required (for hardware replacement)
    operations.push('BUTTON');

    // Add HEM if lengths don't match
    if (instructions.currentLength !== instructions.targetLength) {
      operations.push('HEM');
    }

    // Add NAMETAG if specified
    if (instructions.nametag) {
      operations.push('NAMETAG');
    }

    return operations;
  }

  async completeOperation(params: {
    requestId: string;
    operation: FinishingOperation;
    measurements?: {
      confirmedLength: number;
    };
    notes?: string;
    actorId: string;
  }) {
    const { requestId, operation, measurements, notes, actorId } = params;

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: { item: true }
      });

      if (!request || request.type !== 'FINISHING') {
        throw new Error('Invalid finishing request');
      }

      // Validate HEM measurements if provided
      if (operation === 'HEM' && measurements) {
        const targetLength = request.metadata.instructions.targetLength;
        if (measurements.confirmedLength !== targetLength) {
          throw new Error(`Hem length ${measurements.confirmedLength} does not match target length ${targetLength}`);
        }
      }

      const operations = request.metadata.operations as FinishingStep[];
      const operationIndex = operations.findIndex(op => op.operation === operation);

      if (operationIndex === -1) {
        throw new Error('Operation not found in request');
      }

      // Update operation status
      operations[operationIndex] = {
        ...operations[operationIndex],
        completed: true,
        completedBy: actorId,
        completedAt: new Date(),
        notes,
        measurements: operation === 'HEM' ? {
          hemLength: measurements?.confirmedLength,
          confirmedBy: actorId,
          confirmedAt: new Date()
        } : undefined
      };

      // Check if all operations are completed
      const allCompleted = operations.every(op => op.completed);

      // Update request
      await tx.request.update({
        where: { id: requestId },
        data: {
          status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          metadata: {
            ...request.metadata,
            operations,
            completed_at: allCompleted ? new Date() : null
          }
        }
      });

      // If HEM completed, update SKU with new length
      if (operation === 'HEM' && measurements) {
        const newSKU = this.updateSKULength(
          request.metadata.target_sku,
          measurements.confirmedLength
        );

        await tx.inventoryItem.update({
          where: { id: request.item_id },
          data: {
            sku: newSKU,
            metadata: {
              ...request.item.metadata,
              previous_sku: request.metadata.current_sku,
              hem_length: measurements.confirmedLength,
              hem_completed_at: new Date(),
              hem_completed_by: actorId
            }
          }
        });
      }

      // If all operations completed, create packing request
      if (allCompleted) {
        await tx.request.create({
          data: {
            type: 'PACKING',
            status: 'PENDING',
            item_id: request.item_id,
            order_id: request.order_id,
            metadata: {
              finishing_request_id: requestId
            }
          }
        });
      }

      // Log event
      await this.eventLogger.logEvent({
        type: allCompleted ? 'FINISHING_REQUEST_COMPLETED' : 'FINISHING_OPERATION_COMPLETED',
        actorId,
        itemId: request.item_id,
        requestId,
        metadata: {
          operation,
          measurements,
          notes,
          all_completed: allCompleted,
          remaining_operations: operations.filter(op => !op.completed).map(op => op.operation)
        }
      });
    });
  }

  private updateSKULength(sku: string, newLength: number): string {
    const parts = sku.split('-');
    parts[3] = newLength.toString().padStart(2, '0');
    return parts.join('-');
  }

  async getFinishingQueue(): Promise<any[]> {
    return this.prisma.request.findMany({
      where: {
        type: 'FINISHING',
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      include: {
        item: true,
        order: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });
  }

  async getOperationMetrics(timeRange?: { start: Date; end: Date }) {
    const requests = await this.prisma.request.findMany({
      where: {
        type: 'FINISHING',
        status: 'COMPLETED',
        ...(timeRange && {
          created_at: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        })
      }
    });

    const metrics = {
      totalCompleted: requests.length,
      operationCounts: {} as Record<FinishingOperation, number>,
      averageCompletionTime: 0
    };

    let totalTime = 0;

    requests.forEach(request => {
      const operations = request.metadata.operations as FinishingStep[];
      operations.forEach(op => {
        metrics.operationCounts[op.operation] = (metrics.operationCounts[op.operation] || 0) + 1;
      });

      if (request.metadata.completed_at) {
        totalTime += new Date(request.metadata.completed_at).getTime() - 
                    new Date(request.created_at).getTime();
      }
    });

    metrics.averageCompletionTime = totalTime / requests.length;

    return metrics;
  }
} 