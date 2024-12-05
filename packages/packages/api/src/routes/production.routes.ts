import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { ProductionPlanningService } from '@app/core/services/production-planning.service';
import { PatternMakerService } from '@app/core/services/pattern-maker.service';
import { CuttingService } from '@app/core/services/cutting.service';
import { z } from 'zod';

export class ProductionRoutes extends BaseRoute {
  private planningService: ProductionPlanningService;
  private patternService: PatternMakerService;
  private cuttingService: CuttingService;

  constructor() {
    super();
    const prisma = new PrismaClient();
    this.planningService = new ProductionPlanningService(prisma);
    this.patternService = new PatternMakerService(prisma);
    this.cuttingService = new CuttingService(prisma);
  }

  protected initializeRoutes(): void {
    // Pattern making
    this.createRoute({
      path: '/pattern',
      method: 'post',
      handler: this.createPatternRequest.bind(this),
      schema: z.object({
        body: z.object({
          orderId: z.string(),
          specifications: z.object({
            style: z.string(),
            measurements: z.record(z.number())
          })
        })
      })
    });

    // Cutting
    this.createRoute({
      path: '/cutting',
      method: 'post',
      handler: this.createCuttingBatch.bind(this),
      schema: z.object({
        body: z.object({
          patternRequestIds: z.array(z.string()),
          fabricDetails: z.object({
            code: z.string(),
            quantity: z.number()
          })
        })
      })
    });

    // Production planning
    this.createRoute({
      path: '/schedule',
      method: 'post',
      handler: this.scheduleBatch.bind(this),
      schema: z.object({
        body: z.object({
          requestIds: z.array(z.string()),
          startDate: z.string(),
          priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
        })
      })
    });
  }

  // Handler implementations...
} 