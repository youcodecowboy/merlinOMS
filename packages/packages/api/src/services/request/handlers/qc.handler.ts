import { BaseRequestHandler, StepValidation } from './base.handler';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { APIError } from '../../../utils/errors';
import { z } from 'zod';

export enum QCStep {
  CREATED = 'CREATED',
  MEASUREMENTS_REQUIRED = 'MEASUREMENTS_REQUIRED',
  MEASUREMENTS_VALIDATED = 'MEASUREMENTS_VALIDATED',
  VISUAL_INSPECTION_REQUIRED = 'VISUAL_INSPECTION_REQUIRED',
  VISUAL_INSPECTION_PASSED = 'VISUAL_INSPECTION_PASSED',
  DEFECT_DETECTED = 'DEFECT_DETECTED',
  BIN_ASSIGNMENT_REQUIRED = 'BIN_ASSIGNMENT_REQUIRED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

const STEP_TRANSITIONS: Record<QCStep, QCStep[]> = {
  [QCStep.CREATED]: [QCStep.MEASUREMENTS_REQUIRED],
  [QCStep.MEASUREMENTS_REQUIRED]: [QCStep.MEASUREMENTS_VALIDATED, QCStep.DEFECT_DETECTED],
  [QCStep.MEASUREMENTS_VALIDATED]: [QCStep.VISUAL_INSPECTION_REQUIRED],
  [QCStep.VISUAL_INSPECTION_REQUIRED]: [QCStep.VISUAL_INSPECTION_PASSED, QCStep.DEFECT_DETECTED],
  [QCStep.VISUAL_INSPECTION_PASSED]: [QCStep.BIN_ASSIGNMENT_REQUIRED],
  [QCStep.BIN_ASSIGNMENT_REQUIRED]: [QCStep.COMPLETED],
  [QCStep.DEFECT_DETECTED]: [QCStep.FAILED],
  [QCStep.COMPLETED]: [], // Terminal state
  [QCStep.FAILED]: [] // Terminal state - requires recovery request
};

const measurementsSchema = z.object({
  waist: z.number(),
  hip: z.number(),
  thigh: z.number(),
  inseam: z.number()
});

const visualInspectionSchema = z.object({
  passed: z.boolean(),
  notes: z.string().optional(),
  defectDetails: z.object({
    type: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    description: z.string()
  }).optional()
});

const binAssignmentSchema = z.object({
  binQrCode: z.string(),
  notes: z.string().optional()
});

interface SizeChart {
  waist: { min: number; target: number; max: number };
  hip: { min: number; target: number; max: number };
  thigh: { min: number; target: number; max: number };
  inseam: { min: number; target: number; max: number };
}

export class QCRequestHandler extends BaseRequestHandler {
  protected steps = Object.values(QCStep);
  protected stepTransitions = STEP_TRANSITIONS;
  protected stepValidations: Record<string, StepValidation> = {};

  constructor() {
    super('QCRequestHandler');
  }

  async validateMeasurements(
    requestId: string,
    measurements: z.infer<typeof measurementsSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        QCStep.MEASUREMENTS_REQUIRED
      );

      // Get the item and its target size chart
      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Get size chart based on SKU
      const sizeChart = await this.getSizeChart(item.sku);
      const validationResults = this.validateAgainstSizeChart(measurements, sizeChart);

      if (!validationResults.passed) {
        // Create recovery request for wash defect
        const recoveryRequest = await tx.request.create({
          data: {
            type: 'WASH',
            status: RequestStatus.PENDING,
            item_id: item.id,
            metadata: {
              original_qc_request: requestId,
              defect_type: 'MEASUREMENTS',
              measurements: validationResults.details
            }
          }
        });

        // Update QC request as failed
        const updatedRequest = await tx.request.update({
          where: { id: requestId },
          data: {
            status: RequestStatus.FAILED,
            timeline: {
              create: {
                step: QCStep.DEFECT_DETECTED,
                status: RequestStatus.FAILED,
                operator_id: operatorId,
                metadata: {
                  measurements,
                  validation_results: validationResults,
                  recovery_request_id: recoveryRequest.id
                }
              }
            }
          }
        });

        return this.formatResponse({
          qcRequest: updatedRequest,
          recoveryRequest,
          measurementResults: validationResults
        });
      }

      // Measurements passed validation
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          timeline: {
            create: {
              step: QCStep.MEASUREMENTS_VALIDATED,
              status: RequestStatus.PENDING,
              operator_id: operatorId,
              metadata: {
                measurements,
                validation_results: validationResults
              }
            }
          }
        }
      });

      return this.formatResponse({
        request: updatedRequest,
        measurementResults: validationResults
      });
    });
  }

  async completeVisualInspection(
    requestId: string,
    inspectionData: z.infer<typeof visualInspectionSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        QCStep.VISUAL_INSPECTION_REQUIRED
      );

      if (!inspectionData.passed) {
        // Create recovery request for visual defect
        const recoveryRequest = await tx.request.create({
          data: {
            type: 'WASH',
            status: RequestStatus.PENDING,
            item_id: request.item_id!,
            metadata: {
              original_qc_request: requestId,
              defect_type: 'VISUAL',
              defect_details: inspectionData.defectDetails
            }
          }
        });

        // Update QC request as failed
        const updatedRequest = await tx.request.update({
          where: { id: requestId },
          data: {
            status: RequestStatus.FAILED,
            timeline: {
              create: {
                step: QCStep.DEFECT_DETECTED,
                status: RequestStatus.FAILED,
                operator_id: operatorId,
                metadata: {
                  inspection_results: inspectionData,
                  recovery_request_id: recoveryRequest.id
                }
              }
            }
          }
        });

        return this.formatResponse({
          qcRequest: updatedRequest,
          recoveryRequest
        });
      }

      // Visual inspection passed
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          timeline: {
            create: {
              step: QCStep.VISUAL_INSPECTION_PASSED,
              status: RequestStatus.PENDING,
              operator_id: operatorId,
              metadata: {
                inspection_results: inspectionData
              }
            }
          }
        }
      });

      return this.formatResponse(updatedRequest);
    });
  }

  async assignToFinishingBin(
    requestId: string,
    binData: z.infer<typeof binAssignmentSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        QCStep.BIN_ASSIGNMENT_REQUIRED
      );

      // Validate finishing bin
      const bin = await tx.bin.findFirst({
        where: {
          qr_code: binData.binQrCode,
          type: 'FINISHING',
          is_active: true
        }
      });

      if (!bin) {
        throw new APIError(404, 'BIN_NOT_FOUND', 'Invalid finishing bin');
      }

      // Create move request
      const moveRequest = await tx.request.create({
        data: {
          type: 'MOVE',
          status: RequestStatus.PENDING,
          item_id: request.item_id,
          metadata: {
            source_qc_request: requestId,
            destination_bin: bin.id,
            notes: binData.notes
          }
        }
      });

      // Complete QC request
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.COMPLETED,
          timeline: {
            create: {
              step: QCStep.COMPLETED,
              status: RequestStatus.COMPLETED,
              operator_id: operatorId,
              metadata: {
                finishing_bin: bin.code,
                move_request_id: moveRequest.id,
                completed_at: new Date()
              }
            }
          }
        }
      });

      return this.formatResponse({
        qcRequest: updatedRequest,
        moveRequest
      });
    });
  }

  private async getSizeChart(sku: string): Promise<SizeChart> {
    // TODO: Implement size chart lookup based on SKU
    // This would come from a configuration service or database
    return {
      waist: { min: 30, target: 32, max: 34 },
      hip: { min: 38, target: 40, max: 42 },
      thigh: { min: 22, target: 23, max: 24 },
      inseam: { min: 31, target: 32, max: 33 }
    };
  }

  private validateAgainstSizeChart(
    measurements: z.infer<typeof measurementsSchema>,
    sizeChart: SizeChart
  ) {
    const results = {
      passed: true,
      details: {} as Record<string, { 
        passed: boolean;
        value: number;
        target: number;
        deviation: number;
      }>
    };

    for (const [measure, value] of Object.entries(measurements)) {
      const spec = sizeChart[measure as keyof SizeChart];
      const deviation = Math.abs(value - spec.target);
      const passed = value >= spec.min && value <= spec.max;

      results.details[measure] = {
        passed,
        value,
        target: spec.target,
        deviation
      };

      if (!passed) results.passed = false;
    }

    return results;
  }
} 