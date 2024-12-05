import { BaseService } from '../base/base.service';
import { APIError } from '../../utils/errors';
import { Prisma } from '@prisma/client';
import { 
  validateSKU, 
  extractSKUComponents, 
  washGroupMappings,
  ValidationResult
} from './validation/sku-validation.rules';
import { metrics } from '../../utils/metrics';
import { redisService } from '../../utils/redis.service';
import { 
  calculateMatchScore, 
  MatchResult, 
  matchingPriority 
} from './matching/sku-matching.rules';

interface ProductionRequestData {
  sku: string;
  quantity: number;
  status: string;
  metadata?: Prisma.JsonValue;
}

export class SKUService extends BaseService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'sku';

  constructor() {
    super('SKUService');
  }

  private getCacheKey(type: string, value: string): string {
    return redisService.generateKey(this.CACHE_PREFIX, type, value);
  }

  async validateAndParseSKU(sku: string): Promise<ValidationResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('validation', sku);

    try {
      // Try to get from cache
      const cached = await redisService.get<ValidationResult>(cacheKey);
      if (cached) {
        metrics.incrementCounter('sku_validation_cache_hit');
        return cached;
      }

      metrics.incrementCounter('sku_validation_cache_miss');
      const result = validateSKU(sku);
      
      if (!result.isValid) {
        throw new APIError(400, 'INVALID_SKU', 
          result.errors?.join(', ') || 'Invalid SKU format');
      }

      // Cache the result
      await redisService.set(cacheKey, result, this.CACHE_TTL);

      // Track validation performance
      metrics.recordMetric('sku_validation_time', Date.now() - startTime);
      
      return result;
    } catch (error) {
      // Track validation failures
      metrics.incrementCounter('sku_validation_failures');
      throw this.handleError(error, 'SKU validation failed');
    }
  }

  async updateSKULength(sku: string, newLength: number): Promise<string> {
    return this.withTransaction(async (tx) => {
      const startTime = Date.now();
      
      try {
        // Validate original SKU
        const validation = await this.validateAndParseSKU(sku);
        if (!validation.components) {
          throw new APIError(400, 'INVALID_SKU', 'Could not parse SKU components');
        }

        const { style, waist, shape, wash } = validation.components;
        const lengthStr = newLength.toString().padStart(2, '0');

        // Create new SKU with updated length
        const newSKU = `${style}-${waist}-${shape}-${lengthStr}-${wash}`;

        // Validate new SKU
        await this.validateAndParseSKU(newSKU);

        // Invalidate related caches
        await redisService.invalidatePattern(`${this.CACHE_PREFIX}:*:${sku}`);
        await redisService.invalidatePattern(`${this.CACHE_PREFIX}:*:${newSKU}`);

        // Log the change
        await this.logAction(
          'SKU_LENGTH_UPDATE',
          'system',
          'sku',
          sku,
          {
            oldSku: sku,
            newSku: newSKU,
            oldLength: validation.components.length,
            newLength: lengthStr
          }
        );

        // Track performance
        metrics.recordMetric('sku_update_time', Date.now() - startTime);

        return newSKU;
      } catch (error) {
        metrics.incrementCounter('sku_update_failures');
        throw this.handleError(error, 'Failed to update SKU length');
      }
    });
  }

  getWashGroup(sku: string): 'LIGHT' | 'DARK' {
    try {
      const validation = validateSKU(sku);
      if (!validation.isValid || !validation.components) {
        throw new APIError(400, 'INVALID_SKU', 'Invalid SKU format');
      }

      const washCode = validation.components.wash;
      const washGroup = washGroupMappings[washCode as keyof typeof washGroupMappings];

      if (!washGroup) {
        throw new APIError(400, 'INVALID_WASH_CODE', `Unknown wash code: ${washCode}`);
      }

      return washGroup;
    } catch (error) {
      metrics.incrementCounter('wash_group_lookup_failures');
      throw this.handleError(error, 'Failed to determine wash group');
    }
  }

  async findMatchingSKU(targetSKU: string, uncommittedOnly = true): Promise<any> {
    return this.withTransaction(async (tx) => {
      try {
        // Validate target SKU
        const validation = await this.validateAndParseSKU(targetSKU);
        if (!validation.components) {
          throw new APIError(400, 'INVALID_SKU', 'Could not parse SKU components');
        }

        // First try exact match
        const exactMatch = await this.findExactSKU(targetSKU, uncommittedOnly);
        if (exactMatch) return exactMatch;

        // Try universal match
        const universalMatch = await this.findUniversalSKU(targetSKU, uncommittedOnly);
        if (universalMatch) return universalMatch;

        // Find potential matches with substitutions
        const matches = await this.findPotentialMatches(
          validation.components,
          uncommittedOnly
        );

        return matches.length > 0 ? matches[0] : null;
      } catch (error) {
        throw this.handleError(error, 'Failed to find matching SKU');
      }
    });
  }

  protected async findExactSKU(sku: string, uncommittedOnly: boolean): Promise<any> {
    return this.withTransaction(async (tx) => {
      const query = {
        where: {
          sku,
          ...(uncommittedOnly ? {
            order_assignment: null
          } : {})
        },
        orderBy: {
          created_at: 'asc' as const
        }
      };

      return tx.inventoryItem.findFirst(query);
    });
  }

  protected async findPotentialMatches(
    targetComponents: Record<string, string>,
    uncommittedOnly: boolean
  ): Promise<Array<any>> {
    return this.withTransaction(async (tx) => {
      // Get potential matches based on style and waist (these must match exactly)
      const candidates = await tx.inventoryItem.findMany({
        where: {
          sku: {
            startsWith: `${targetComponents.style}-${targetComponents.waist}`
          },
          ...(uncommittedOnly ? {
            order_assignment: null
          } : {})
        },
        orderBy: {
          created_at: 'asc'
        }
      });

      // Calculate match scores for each candidate
      const scoredMatches = candidates.map(item => {
        const itemComponents = extractSKUComponents(item.sku);
        const matchResult = calculateMatchScore(targetComponents, itemComponents);
        return {
          ...item,
          matchScore: matchResult.score,
          substitutions: matchResult.substitutions,
          adjustments: matchResult.adjustments
        };
      });

      // Sort by match score (highest first) and creation date
      return scoredMatches.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    });
  }

  public async validateSKUComponents(components: {
    style: string;
    waist: number;
    shape: string;
    length: number;
    wash: string;
  }): Promise<boolean> {
    const { style, waist, shape, length, wash } = components;
    
    // Validate style code
    if (!/^[A-Z]{2}$/.test(style)) {
      throw new APIError(400, 'INVALID_STYLE', 'Invalid style code');
    }

    // Validate numeric values
    if (!Number.isInteger(waist) || waist < 20 || waist > 50) {
      throw new APIError(400, 'INVALID_WAIST', 'Invalid waist measurement');
    }

    if (!Number.isInteger(length) || length < 20 || length > 40) {
      throw new APIError(400, 'INVALID_LENGTH', 'Invalid length measurement');
    }

    // Validate shape code
    if (!/^[SRLU]$/.test(shape)) {
      throw new APIError(400, 'INVALID_SHAPE', 'Invalid shape code');
    }

    // Validate wash code
    if (!/^(RAW|IND|BLK|STA)$/.test(wash)) {
      throw new APIError(400, 'INVALID_WASH', 'Invalid wash code');
    }

    return true;
  }

  public async createProductionRequest(sku: string, quantity: number) {
    return this.withTransaction(async (tx) => {
      const data: ProductionRequestData = {
        sku,
        quantity,
        status: 'PENDING',
      };

      return (tx as any).productionRequest.create({ data });
    });
  }

  protected async findUniversalSKU(sku: string, uncommittedOnly: boolean): Promise<any> {
    return this.withTransaction(async (tx) => {
      const components = extractSKUComponents(sku);
      const washGroup = this.getWashGroup(components.wash);
      
      const query = {
        where: {
          sku: {
            startsWith: `${components.style}-${components.waist}`
          },
          ...(uncommittedOnly ? {
            order_assignment: null
          } : {})
        },
        orderBy: {
          created_at: 'asc' as const
        }
      };

      return tx.inventoryItem.findFirst(query);
    });
  }
} 