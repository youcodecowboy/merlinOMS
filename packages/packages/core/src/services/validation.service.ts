import { PrismaClient } from '@prisma/client';
import { 
  ValidationResult, 
  RequestType,
  RequestStatus,
  SKUComponents
} from '@app/types';
import { SKUService } from './sku.service';

export class ValidationService {
  constructor(
    private prisma: PrismaClient,
    private skuService: SKUService
  ) {}

  // SKU Validation Rules
  async validateSKUAssignment(params: {
    currentSKU: string;
    targetSKU: string;
  }): Promise<ValidationResult> {
    const { currentSKU, targetSKU } = params;
    const errors: string[] = [];

    // 1. Immutable Component Validation
    const current = this.skuService.parseSKU(currentSKU);
    const target = this.skuService.parseSKU(targetSKU);

    if (!this.skuService.isSkuComponents(current) || !this.skuService.isSkuComponents(target)) {
      errors.push('Invalid SKU format');
      return { valid: false, errors };
    }

    // Style/Waist/Shape must match exactly
    if (current.style !== target.style) {
      errors.push('Style code mismatch - cannot be transformed');
    }
    if (current.waist !== target.waist) {
      errors.push('Waist size mismatch - cannot be transformed');
    }
    if (current.shape !== target.shape) {
      errors.push('Shape mismatch - cannot be transformed');
    }

    // 2. Length Validation
    const currentLength = parseInt(current.length, 10);
    const targetLength = parseInt(target.length, 10);
    if (currentLength < targetLength) {
      errors.push('Current length is shorter than target length - cannot be transformed');
    }

    // 3. Wash Group Validation
    if (!this.skuService.canFulfill(currentSKU, targetSKU)) {
      errors.push('Incompatible wash groups');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Status Transition Validation
  async validateStatusTransition(params: {
    itemId: string;
    newStatus1?: string;
    newStatus2?: string;
  }): Promise<ValidationResult> {
    const { itemId, newStatus1, newStatus2 } = params;
    const errors: string[] = [];

    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        order_assignment: true,
        requests: {
          where: {
            status: 'PENDING'
          }
        }
      }
    });

    if (!item) {
      errors.push('Item not found');
      return { valid: false, errors };
    }

    // STATUS1 Transition Rules
    if (newStatus1) {
      const validTransitions: Record<string, string[]> = {
        'PRODUCTION': ['STOCK'],
        'STOCK': ['WASH'],
        'WASH': ['STOCK']
      };

      if (!validTransitions[item.status1]?.includes(newStatus1)) {
        errors.push(`Invalid STATUS1 transition from ${item.status1} to ${newStatus1}`);
      }
    }

    // STATUS2 Transition Rules
    if (newStatus2) {
      const validTransitions: Record<string, string[]> = {
        'UNCOMMITTED': ['COMMITTED', 'ASSIGNED'],
        'COMMITTED': ['ASSIGNED', 'UNCOMMITTED'],
        'ASSIGNED': ['UNCOMMITTED']
      };

      if (!validTransitions[item.status2]?.includes(newStatus2)) {
        errors.push(`Invalid STATUS2 transition from ${item.status2} to ${newStatus2}`);
      }

      // Additional STATUS2 Rules
      if (newStatus2 === 'ASSIGNED' && item.status1 !== 'STOCK') {
        errors.push('Can only ASSIGN items with STATUS1 = STOCK');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Bin Assignment Validation
  async validateBinAssignment(params: {
    itemId: string;
    binId: string;
  }): Promise<ValidationResult> {
    const errors: string[] = [];

    const [item, bin] = await Promise.all([
      this.prisma.inventoryItem.findUnique({ where: { id: params.itemId } }),
      this.prisma.bin.findUnique({ where: { id: params.binId } })
    ]);

    if (!item || !bin) {
      errors.push('Item or bin not found');
      return { valid: false, errors };
    }

    // Bin Capacity Check
    if (bin.current_count >= bin.capacity) {
      errors.push('Bin is at maximum capacity');
    }

    // Bin Type Validation
    if (bin.type === 'WASH' && item.status1 !== 'STOCK') {
      errors.push('Only STOCK items can be placed in wash bins');
    }

    // Bin Activity Check
    if (!bin.is_active) {
      errors.push('Bin is not active');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Request Creation Validation
  async validateRequestCreation(params: {
    type: RequestType;
    itemId: string;
    orderId: string;
  }): Promise<ValidationResult> {
    const errors: string[] = [];

    const [item, order] = await Promise.all([
      this.prisma.inventoryItem.findUnique({ 
        where: { id: params.itemId },
        include: { requests: true }
      }),
      this.prisma.order.findUnique({ 
        where: { id: params.orderId }
      })
    ]);

    if (!item || !order) {
      errors.push('Item or order not found');
      return { valid: false, errors };
    }

    // Check for existing active requests
    const hasActiveRequest = item.requests.some(r => 
      r.type === params.type && ['PENDING', 'IN_PROGRESS'].includes(r.status)
    );

    if (hasActiveRequest) {
      errors.push(`Active ${params.type} request already exists for this item`);
    }

    // Request-specific validations
    switch (params.type) {
      case 'WASH':
        if (item.status1 !== 'STOCK' || item.status2 !== 'ASSIGNED') {
          errors.push('Wash requests require STOCK/ASSIGNED status');
        }
        break;

      case 'PATTERN':
        if (item.status1 !== 'PRODUCTION') {
          errors.push('Pattern requests require PRODUCTION status');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // SKU Component Validation Constants
  private readonly SKU_RULES = {
    waist: {
      min: 23,
      max: 48
    },
    length: {
      min: 24,
      max: 36
    },
    shapes: ['X', 'Y'],
    washes: {
      washed: ['IND', 'STA', 'ONX', 'JAG'],
      unwashed: ['RAW', 'BRW']
    }
  } as const;

  // Order Validation
  async validateOrder(order: any): Promise<ValidationResult> {
    const errors: string[] = [];

    // Customer validation
    if (!order.customer_id) {
      errors.push('Order must have a customer');
    }

    // Order items validation
    if (!order.order_items || order.order_items.length === 0) {
      errors.push('Order must contain at least one item');
    }

    // Validate each order item
    if (order.order_items) {
      for (const item of order.order_items) {
        const skuValidation = await this.validateSKUComponents(item.target_sku);
        if (!skuValidation.valid) {
          errors.push(`Invalid SKU for order item: ${skuValidation.errors.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Enhanced SKU Component Validation
  async validateSKUComponents(sku: string): Promise<ValidationResult> {
    const components = this.skuService.parseSKU(sku);
    if (!this.skuService.isSkuComponents(components)) {
      return { valid: false, errors: ['Invalid SKU format'] };
    }

    const errors: string[] = [];

    // Waist validation
    const waistSize = parseInt(components.waist, 10);
    if (waistSize < this.SKU_RULES.waist.min || waistSize > this.SKU_RULES.waist.max) {
      errors.push(`Waist size must be between ${this.SKU_RULES.waist.min} and ${this.SKU_RULES.waist.max}`);
    }

    // Length validation
    const length = parseInt(components.length, 10);
    if (length < this.SKU_RULES.length.min || length > this.SKU_RULES.length.max) {
      errors.push(`Length must be between ${this.SKU_RULES.length.min} and ${this.SKU_RULES.length.max}`);
    }

    // Shape validation
    if (!this.SKU_RULES.shapes.includes(components.shape)) {
      errors.push(`Shape must be one of: ${this.SKU_RULES.shapes.join(', ')}`);
    }

    // Wash validation
    const allWashes = [...this.SKU_RULES.washes.washed, ...this.SKU_RULES.washes.unwashed];
    if (!allWashes.includes(components.wash)) {
      errors.push(`Wash must be one of: ${allWashes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Inventory Item Validation
  async validateInventoryItem(item: any): Promise<ValidationResult> {
    const errors: string[] = [];

    // QR Code uniqueness
    if (item.qr_code) {
      const existingItem = await this.prisma.inventoryItem.findFirst({
        where: {
          qr_code: item.qr_code,
          id: { not: item.id } // Exclude current item for updates
        }
      });

      if (existingItem) {
        errors.push('QR code must be unique');
      }
    } else {
      errors.push('QR code is required');
    }

    // SKU validation
    const skuValidation = await this.validateSKUComponents(item.sku);
    if (!skuValidation.valid) {
      errors.push(...skuValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Status Change Validation
  async validateStatusChange(params: {
    entityType: 'order' | 'inventory_item' | 'request';
    entityId: string;
    currentStatus: string;
    newStatus: RequestStatus;
    context?: Record<string, any>;
  }): Promise<ValidationResult> {
    const { entityType, entityId, currentStatus, newStatus, context } = params;
    const errors: string[] = [];

    // Define valid status transitions
    const validTransitions: Record<string, Record<string, string[]>> = {
      order: {
        'RECEIVED': ['PENDING_ASSIGNMENT'],
        'PENDING_ASSIGNMENT': ['ASSIGNED', 'PENDING_PRODUCTION'],
        'PENDING_PRODUCTION': ['IN_PRODUCTION'],
        'IN_PRODUCTION': ['COMPLETED'],
        // Add more order status transitions...
      },
      inventory_item: {
        'PRODUCTION': ['STOCK'],
        'STOCK': ['WASH'],
        'WASH': ['STOCK'],
        // Add more inventory status transitions...
      },
      request: {
        'PENDING': ['IN_PROGRESS', 'FAILED'],
        'IN_PROGRESS': ['COMPLETED', 'FAILED'],
        // Add more request status transitions...
      }
    };

    // Validate status transition
    if (!validTransitions[entityType][currentStatus]?.includes(newStatus)) {
      errors.push(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Context-specific validations
    if (context) {
      switch (entityType) {
        case 'order':
          if (newStatus === 'PENDING_PRODUCTION' && !context.production_request_id) {
            errors.push('Production request ID required for PENDING_PRODUCTION status');
          }
          break;
        case 'inventory_item':
          if (newStatus === 'ASSIGNED' && !context.order_id) {
            errors.push('Order ID required for ASSIGNED status');
          }
          break;
        // Add more context-specific validations...
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
} 