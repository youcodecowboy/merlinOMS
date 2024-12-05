import { PrismaClient, RequestStatus } from '@prisma/client';
import { APIError } from '../../../../utils/errors';

export interface StepValidationContext {
  tx: PrismaClient;
  requestId: string;
  operatorId: string;
  metadata?: Record<string, any>;
}

export interface StepValidator {
  validate: (context: StepValidationContext) => Promise<boolean>;
  errorMessage: string;
}

export class StepValidationBuilder {
  private validators: Map<string, StepValidator> = new Map();

  addValidator(step: string, validator: StepValidator): this {
    this.validators.set(step, validator);
    return this;
  }

  build(): Record<string, StepValidator> {
    return Object.fromEntries(this.validators);
  }
}

// Common validators that can be reused
export const commonValidators = {
  validateBinAssignment: async (context: StepValidationContext): Promise<boolean> => {
    const { tx, requestId, metadata } = context;
    const binQrCode = metadata?.binQrCode;

    if (!binQrCode) {
      throw new APIError(400, 'MISSING_BIN', 'Bin QR code is required');
    }

    const bin = await tx.bin.findFirst({
      where: {
        qr_code: binQrCode,
        is_active: true
      }
    });

    if (!bin) {
      throw new APIError(404, 'BIN_NOT_FOUND', 'Invalid bin');
    }

    if (bin.current_count >= bin.capacity) {
      throw new APIError(400, 'BIN_FULL', 'Bin is at capacity');
    }

    return true;
  },

  validateItemScan: async (context: StepValidationContext): Promise<boolean> => {
    const { tx, requestId, metadata } = context;
    const itemQrCode = metadata?.itemQrCode;

    if (!itemQrCode) {
      throw new APIError(400, 'MISSING_ITEM', 'Item QR code is required');
    }

    const request = await tx.request.findUnique({
      where: { id: requestId },
      include: { item: true }
    });

    if (!request?.item) {
      throw new APIError(404, 'REQUEST_NOT_FOUND', 'Request or item not found');
    }

    if (request.item.qr_code !== itemQrCode) {
      throw new APIError(400, 'ITEM_MISMATCH', 'Scanned item does not match request');
    }

    return true;
  }
}; 