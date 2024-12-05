import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '@app/core/services/analytics.service';
import { z } from 'zod';

export class AnalyticsRoutes extends BaseRoute {
  private analyticsService: AnalyticsService;

  constructor() {
    super();
    const prisma = new PrismaClient();
    this.analyticsService = new AnalyticsService(prisma);
  }

  protected initializeRoutes(): void {
    // Get production metrics
    this.createRoute({
      path: '/production',
      method: 'get',
      handler: this.getProductionMetrics.bind(this),
      schema: z.object({
        query: z.object({
          startDate: z.string(),
          endDate: z.string(),
          groupBy: z.enum(['day', 'week', 'month']).optional()
        })
      })
    });

    // Get quality metrics
    this.createRoute({
      path: '/quality',
      method: 'get',
      handler: this.getQualityMetrics.bind(this),
      schema: z.object({
        query: z.object({
          startDate: z.string(),
          endDate: z.string()
        })
      })
    });

    // Get efficiency metrics
    this.createRoute({
      path: '/efficiency',
      method: 'get',
      handler: this.getEfficiencyMetrics.bind(this),
      schema: z.object({
        query: z.object({
          stage: z.string().optional(),
          startDate: z.string(),
          endDate: z.string()
        })
      })
    });
  }

  // Handler implementations...
} 