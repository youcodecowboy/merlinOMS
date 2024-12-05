import { BaseRequestHandler, StepValidation } from './base.handler';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { APIError } from '../../../utils/errors';
import { SKUService } from '../../sku/sku.service';
import { z } from 'zod';
import { BinService } from '../../bin/bin.service';

export enum FinishingStep {
  CREATED = 'CREATED',
  BUTTON_REQUIRED = 'BUTTON_REQUIRED',
  BUTTON_COMPLETED = 'BUTTON_COMPLETED',
  NAMETAG_REQUIRED = 'NAMETAG_REQUIRED',
  NAMETAG_COMPLETED = 'NAMETAG_COMPLETED',
  HEM_REQUIRED = 'HEM_REQUIRED',
  HEM_COMPLETED = 'HEM_COMPLETED',
  FINAL_QC_REQUIRED = 'FINAL_QC_REQUIRED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

const STEP_TRANSITIONS: Record<FinishingStep, FinishingStep[]> = {
  [FinishingStep.CREATED]: [FinishingStep.BUTTON_REQUIRED],
  [FinishingStep.BUTTON_REQUIRED]: [FinishingStep.BUTTON_COMPLETED, FinishingStep.FAILED],
  [FinishingStep.BUTTON_COMPLETED]: [FinishingStep.NAMETAG_REQUIRED],
  [FinishingStep.NAMETAG_REQUIRED]: [FinishingStep.NAMETAG_COMPLETED, FinishingStep.FAILED],
  [FinishingStep.NAMETAG_COMPLETED]: [FinishingStep.HEM_REQUIRED],
  [FinishingStep.HEM_REQUIRED]: [FinishingStep.HEM_COMPLETED, FinishingStep.FAILED],
  [FinishingStep.HEM_COMPLETED]: [FinishingStep.FINAL_QC_REQUIRED],
  [FinishingStep.FINAL_QC_REQUIRED]: [FinishingStep.COMPLETED, FinishingStep.FAILED],
  [FinishingStep.COMPLETED]: [], // Terminal state
  [FinishingStep.FAILED]: [FinishingStep.CREATED] // Allow retry
};

const buttonCompletionSchema = z.object({
  buttonColor: z.string(),
  quantity: z.number().min(1),
  notes: z.string().optional()
});

const nametagCompletionSchema = z.object({
  style: z.string(),
  placement: z.string(),
  notes: z.string().optional()
});

const hemCompletionSchema = z.object({
  finalLength: z.number(),
  notes: z.string().optional()
});

const finalQCSchema = z.object({
  measurements: z.object({
    waist: z.number(),
    hip: z.number(),
    thigh: z.number(),
    inseam: z.number()
  }),
  components: z.object({
    buttonsVerified: z.boolean(),
    nametagVerified: z.boolean(),
    hemVerified: z.boolean()
  }),
  notes: z.string().optional()
});

export class FinishingRequestHandler extends BaseRequestHandler {
  private skuService: SKUService;
  private binService: BinService;

  protected steps = Object.values(FinishingStep);
  protected stepTransitions = STEP_TRANSITIONS;
  protected stepValidations: Record<string, StepValidation> = {};

  constructor() {
    super('FinishingRequestHandler');
    this.skuService = new SKUService();
    this.binService = new BinService();
  }

  async completeButtons(
    requestId: string,
    buttonData: z.infer<typeof buttonCompletionSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        FinishingStep.BUTTON_REQUIRED
      );

      // Get the item and order details
      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! },
        include: {
          order_assignment: {
            include: {
              order: true
            }
          }
        }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Validate button color against order specifications
      const orderSpecs = item.order_assignment?.order?.metadata?.specifications;
      if (orderSpecs?.buttonColor && orderSpecs.buttonColor !== buttonData.buttonColor) {
        throw new APIError(400, 'INVALID_BUTTON_COLOR', 
          `Button color does not match order specification: ${orderSpecs.buttonColor}`);
      }

      // Update request timeline
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          timeline: {
            create: {
              step: FinishingStep.BUTTON_COMPLETED,
              status: RequestStatus.PENDING,
              operator_id: operatorId,
              metadata: {
                button_color: buttonData.buttonColor,
                quantity: buttonData.quantity,
                completed_at: new Date(),
                notes: buttonData.notes
              }
            }
          }
        }
      });

      return this.formatResponse(updatedRequest);
    });
  }

  async completeNametag(
    requestId: string,
    nametagData: z.infer<typeof nametagCompletionSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        FinishingStep.NAMETAG_REQUIRED
      );

      // Get the item and order details
      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! },
        include: {
          order_assignment: {
            include: {
              order: true
            }
          }
        }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Validate nametag style against order specifications
      const orderSpecs = item.order_assignment?.order?.metadata?.specifications;
      if (orderSpecs?.nametagStyle && orderSpecs.nametagStyle !== nametagData.style) {
        throw new APIError(400, 'INVALID_NAMETAG_STYLE', 
          `Nametag style does not match order specification: ${orderSpecs.nametagStyle}`);
      }

      // Update request timeline
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          timeline: {
            create: {
              step: FinishingStep.NAMETAG_COMPLETED,
              status: RequestStatus.PENDING,
              operator_id: operatorId,
              metadata: {
                style: nametagData.style,
                placement: nametagData.placement,
                completed_at: new Date(),
                notes: nametagData.notes
              }
            }
          }
        }
      });

      return this.formatResponse(updatedRequest);
    });
  }

  async completeHem(
    requestId: string,
    hemData: z.infer<typeof hemCompletionSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        FinishingStep.HEM_REQUIRED
      );

      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Update SKU with final length
      const newSKU = await this.skuService.updateSKULength(item.sku, hemData.finalLength);

      // Update item SKU
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          sku: newSKU,
          metadata: {
            ...item.metadata,
            final_length: hemData.finalLength,
            hem_completed_at: new Date()
          }
        }
      });

      // Update request timeline
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          timeline: {
            create: {
              step: FinishingStep.HEM_COMPLETED,
              status: RequestStatus.PENDING,
              operator_id: operatorId,
              metadata: {
                final_length: hemData.finalLength,
                original_sku: item.sku,
                new_sku: newSKU,
                completed_at: new Date(),
                notes: hemData.notes
              }
            }
          }
        }
      });

      return this.formatResponse(updatedRequest);
    });
  }

  async completeFinalQC(
    requestId: string,
    qcData: z.infer<typeof finalQCSchema>,
    operatorId: string
  ) {
    return this.withTransaction(async (tx) => {
      const request = await this.validateStep(
        tx,
        requestId,
        FinishingStep.FINAL_QC_REQUIRED
      );

      // Get the item and its order details
      const item = await tx.inventoryItem.findUnique({
        where: { id: request.item_id! },
        include: {
          order_assignment: {
            include: {
              order: {
                include: {
                  order_items: true
                }
              }
            }
          }
        }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      const order = item.order_assignment?.order;
      if (!order) {
        throw new APIError(400, 'NO_ORDER', 'Item is not assigned to an order');
      }

      // Complete the finishing request
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.COMPLETED,
          timeline: {
            create: {
              step: FinishingStep.COMPLETED,
              status: RequestStatus.COMPLETED,
              operator_id: operatorId,
              metadata: {
                qc_data: qcData,
                completed_at: new Date()
              }
            }
          }
        }
      });

      // Check if this is a solo order or part of a multi-unit order
      const isSoloOrder = order.order_items.length === 1;
      const isLastItemInOrder = await this.isLastFinishedItem(tx, order.id, item.id);

      // Get or create pre-packing bin
      const prePackingBin = await this.getPrePackingBin(tx, order.id);

      // Assign item to pre-packing bin using BinService
      await this.binService.assignItemToBin(
        item.id,
        prePackingBin.id,
        operatorId,
        {
          request_id: requestId,
          qc_data: qcData,
          is_solo_order: isSoloOrder,
          is_last_item: isLastItemInOrder
        }
      );

      return this.formatResponse({
        finishingRequest: updatedRequest,
        moveRequest: null,
        packingRequest: null
      });
    });
  }

  private async isLastFinishedItem(
    tx: PrismaClient,
    orderId: string,
    currentItemId: string
  ): Promise<boolean> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            assigned_item: true
          }
        }
      }
    });

    if (!order) return false;

    // Count items that haven't completed finishing
    const unfinishedItems = order.order_items.filter(orderItem => {
      const item = orderItem.assigned_item;
      return item && 
             item.id !== currentItemId && 
             !item.metadata?.finishing_completed;
    });

    return unfinishedItems.length === 0;
  }

  private async getPrePackingBin(
    tx: PrismaClient,
    orderId: string
  ): Promise<any> {
    // Try to find existing pre-packing bin for this order
    const existingBin = await tx.bin.findFirst({
      where: {
        type: BinType.PACKING,
        metadata: {
          path: ['order_id'],
          equals: orderId
        },
        is_active: true
      }
    });

    if (existingBin) {
      // Validate bin using BinService
      return this.binService.validateBin(
        existingBin.qr_code,
        BinType.PACKING,
        true
      );
    }

    // Get order details for capacity planning
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        order_items: true
      }
    });

    if (!order) {
      throw new APIError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Create new pre-packing bin with appropriate capacity
    const newBin = await tx.bin.create({
      data: {
        code: `PPK-${orderId.slice(0, 8)}`,
        type: BinType.PACKING,
        zone: 'PRE_PACKING',
        capacity: Math.max(order.order_items.length, 5), // Minimum capacity of 5
        sku: 'PPK-UNIVERSAL',
        qr_code: `PPK-${orderId}`,
        metadata: {
          order_id: orderId,
          pre_packing: true,
          created_at: new Date()
        }
      }
    });

    return newBin;
  }
} 