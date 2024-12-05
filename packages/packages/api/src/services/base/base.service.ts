import { PrismaClient, Prisma } from '@prisma/client';
import { APIError } from '../../utils/errors';
import { auditLogger } from '../../utils/audit-logger';
import logger from '../../utils/logger';
import { z } from 'zod';

export interface TransactionOptions {
  maxRetries?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

// Define interface for audit log entries
interface AuditLogEntry {
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  timestamp?: Date;
}

export abstract class BaseService {
  protected prisma: PrismaClient;
  protected serviceName: string;

  constructor(serviceName: string) {
    this.prisma = new PrismaClient();
    this.serviceName = serviceName;
    logger.info(`Initializing ${serviceName}`);
  }

  protected async withTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    options: TransactionOptions = {},
    errorMessage = 'Operation failed'
  ): Promise<T> {
    const startTime = Date.now();
    let attempts = 0;
    const maxRetries = options.maxRetries || 3;

    while (attempts < maxRetries) {
      try {
        const result = await this.prisma.$transaction(
          operation,
          {
            maxWait: options.timeout || 5000,
            timeout: options.timeout || 10000,
            isolationLevel: options.isolationLevel || 'ReadCommitted'
          }
        );

        logger.info(`${this.serviceName} transaction completed`, {
          duration: Date.now() - startTime,
          attempt: attempts + 1
        });

        return result;
      } catch (error) {
        attempts++;
        
        logger.warn(`${this.serviceName} transaction failed, attempt ${attempts}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });

        if (attempts === maxRetries) {
          throw this.handleError(error, errorMessage);
        }

        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 100));
      }
    }

    throw new APIError(500, 'TRANSACTION_FAILED', 'Transaction failed after max retries');
  }

  protected handleError(error: unknown, message: string): never {
    if (error instanceof APIError) {
      // Log API errors at warn level
      logger.warn(`${this.serviceName} API Error:`, {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }

    // Log unknown errors at error level
    logger.error(`${this.serviceName} Unexpected Error:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    throw new APIError(500, 'SERVICE_ERROR', message);
  }

  protected async logAction(
    action: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        action,
        userId,
        resourceType,
        resourceId,
        details,
        timestamp: new Date()
      };

      await auditLogger.log(logEntry);

      logger.info(`${this.serviceName} Action Logged:`, {
        action,
        resourceType,
        resourceId
      });
    } catch (error) {
      logger.error(`${this.serviceName} Audit Log Failed:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        action,
        resourceType,
        resourceId
      });
    }
  }

  protected validateInput<T>(schema: z.ZodSchema<T>, data: unknown, context?: Record<string, any>): T {
    try {
      const result = schema.parse(data);
      
      logger.debug(`${this.serviceName} Input Validation:`, {
        schema: schema.description || 'Unknown Schema',
        context
      });

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn(`${this.serviceName} Validation Error:`, {
          issues: error.issues,
          context
        });

        throw new APIError(400, 'VALIDATION_ERROR', 
          error.issues.map(i => i.message).join(', '));
      }

      throw this.handleError(error, 'Validation failed');
    }
  }

  protected formatResponse<T>(data: T) {
    return {
      success: true,
      data
    };
  }

  protected async exists(
    model: any,
    where: Record<string, any>,
    errorMessage: string
  ): Promise<void> {
    const exists = await model.findFirst({ where });
    if (!exists) {
      throw new APIError(404, 'NOT_FOUND', errorMessage);
    }
  }

  protected async validateSKU(sku: string): Promise<boolean> {
    // SKU format: ST-32-X-32-IND
    const skuPattern = /^[A-Z]{2}-\d{2}-[A-Z]-\d{2}-[A-Z]{3}$/;
    return skuPattern.test(sku);
  }

  protected abstract findExactSKU(sku: string, uncommittedOnly: boolean): Promise<any>;
  protected abstract findUniversalSKU(sku: string, uncommittedOnly: boolean): Promise<any>;

  protected async findMatchingSKU(targetSKU: string, uncommittedOnly = true): Promise<any> {
    const exactMatch = await this.findExactSKU(targetSKU, uncommittedOnly);
    if (exactMatch) return exactMatch;
    return this.findUniversalSKU(targetSKU, uncommittedOnly);
  }

  protected getWashGroup(washCode: string): 'LIGHT' | 'DARK' {
    const lightWashes = ['STA', 'IND', 'RAW'];
    return lightWashes.includes(washCode) ? 'LIGHT' : 'DARK';
  }

  protected async validateStatusTransition<T extends { status: string }>(
    model: any,
    id: string,
    currentStatus: string,
    newStatus: string,
    allowedTransitions: Record<string, string[]>
  ): Promise<T> {
    const item = await model.findUnique({ where: { id } });
    if (!item) {
      throw new APIError(404, 'NOT_FOUND', 'Item not found');
    }

    if (!allowedTransitions[item.status]?.includes(newStatus)) {
      throw new APIError(400, 'INVALID_TRANSITION', 
        `Cannot transition from ${item.status} to ${newStatus}`);
    }

    return item;
  }

  protected async trackStatusChange(
    entityType: string,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction(
      'STATUS_CHANGE',
      userId,
      entityType,
      entityId,
      {
        oldStatus,
        newStatus,
        ...metadata
      }
    );
  }
} 