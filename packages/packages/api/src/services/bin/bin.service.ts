import { BaseService } from '../base/base.service';
import { APIError } from '../../utils/errors';
import { Prisma, BinType } from '@prisma/client';
import { metrics } from '../../utils/metrics';

export class BinService extends BaseService {
  constructor() {
    super('BinService');
  }

  async findExactSKU(sku: string): Promise<string | null> {
    return sku;
  }

  async findUniversalSKU(sku: string): Promise<string | null> {
    return null;
  }

  async allocateBin(sku: string, quantity: number) {
    const startTime = Date.now();
    
    try {
      // Find available bins with capacity
      const availableBins = await this.prisma.$queryRaw<Array<{
        id: string;
        code: string;
        capacity: number;
        current_count: number;
      }>>`
        SELECT id, code, capacity, current_count
        FROM "Bin"
        WHERE is_active = true
        AND sku = ${sku}
        AND current_count < capacity
        ORDER BY current_count DESC
      `;

      if (!availableBins.length) {
        throw new APIError(404, 'NO_BINS_AVAILABLE', 'No suitable bins available');
      }

      const optimalBin = this.findOptimalBin(availableBins, quantity);
      
      const updatedBin = await this.prisma.bin.update({
        where: { id: optimalBin.id },
        data: {
          current_count: {
            increment: quantity
          }
        },
        select: {
          id: true,
          code: true,
          current_count: true,
          capacity: true
        }
      });

      metrics.recordMetric('bin_allocation_duration', Date.now() - startTime);
      metrics.recordMetric('bin_allocation_success', 1);
      
      return updatedBin;

    } catch (error) {
      metrics.recordMetric('bin_allocation_error', 1);
      throw error;
    }
  }

  private findOptimalBin(bins: Array<{
    id: string;
    code: string;
    capacity: number;
    current_count: number;
  }>, quantity: number) {
    return bins.reduce((optimal, current) => {
      const optimalSpace = optimal.capacity - optimal.current_count;
      const currentSpace = current.capacity - current.current_count;
      
      if (currentSpace >= quantity && optimalSpace < quantity) {
        return current;
      }
      
      if (currentSpace > optimalSpace) {
        return current;
      }
      
      return optimal;
    });
  }
} 