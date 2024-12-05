import { PrismaClient } from '@prisma/client';
import { 
  ServiceResponse,
  TimingStatus,
  ProductionStage,
  RequestType
} from '@app/types';

interface DateRange {
  start: Date;
  end: Date;
}

interface ProductionMetrics {
  totalOrders: number;
  completedOrders: number;
  averageLeadTime: number;
  onTimeDelivery: number;
  capacityUtilization: number;
}

interface QualityMetrics {
  defectRate: number;
  reworkRate: number;
  firstPassYield: number;
  averageQCScore: number;
}

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getProductionMetrics(range: DateRange): Promise<ServiceResponse<ProductionMetrics>> {
    const [orders, completedOrders, timing] = await Promise.all([
      this.prisma.order.count({
        where: {
          created_at: {
            gte: range.start,
            lte: range.end
          }
        }
      }),
      this.prisma.order.count({
        where: {
          status: 'COMPLETED',
          created_at: {
            gte: range.start,
            lte: range.end
          }
        }
      }),
      this.prisma.timingMetric.findMany({
        where: {
          created_at: {
            gte: range.start,
            lte: range.end
          }
        }
      })
    ]);

    const metrics: ProductionMetrics = {
      totalOrders: orders,
      completedOrders,
      averageLeadTime: this.calculateAverageTime(timing),
      onTimeDelivery: this.calculateOnTimeDelivery(timing),
      capacityUtilization: await this.calculateCapacityUtilization(range)
    };

    return {
      success: true,
      data: metrics
    };
  }

  async getQualityMetrics(range: DateRange): Promise<ServiceResponse<QualityMetrics>> {
    const [qcRequests, problems] = await Promise.all([
      this.prisma.request.findMany({
        where: {
          type: 'QC',
          created_at: {
            gte: range.start,
            lte: range.end
          }
        }
      }),
      this.prisma.problem.findMany({
        where: {
          created_at: {
            gte: range.start,
            lte: range.end
          }
        }
      })
    ]);

    const metrics: QualityMetrics = {
      defectRate: this.calculateDefectRate(problems, qcRequests),
      reworkRate: this.calculateReworkRate(qcRequests),
      firstPassYield: this.calculateFirstPassYield(qcRequests),
      averageQCScore: this.calculateAverageQCScore(qcRequests)
    };

    return {
      success: true,
      data: metrics
    };
  }

  private calculateDefectRate(problems: any[], qcRequests: any[]): number {
    if (qcRequests.length === 0) return 0;
    return (problems.length / qcRequests.length) * 100;
  }

  private calculateReworkRate(qcRequests: any[]): number {
    if (qcRequests.length === 0) return 0;
    const reworks = qcRequests.filter(req => req.metadata.is_rework);
    return (reworks.length / qcRequests.length) * 100;
  }

  private calculateFirstPassYield(qcRequests: any[]): number {
    if (qcRequests.length === 0) return 0;
    const firstPass = qcRequests.filter(req => 
      req.status === 'COMPLETED' && !req.metadata.is_rework
    );
    return (firstPass.length / qcRequests.length) * 100;
  }

  private calculateAverageQCScore(qcRequests: any[]): number {
    if (qcRequests.length === 0) return 0;
    const scores = qcRequests
      .filter(req => req.metadata.score)
      .map(req => req.metadata.score);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // ... other helper methods
} 