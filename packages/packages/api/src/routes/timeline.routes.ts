import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { TimelineService } from '@app/core/services/timeline.service';
import { z } from 'zod';

export class TimelineRoutes extends BaseRoute {
  private timelineService: TimelineService;

  constructor() {
    super();
    const prisma = new PrismaClient();
    this.timelineService = new TimelineService(prisma);
  }

  protected initializeRoutes(): void {
    // Get order timeline
    this.createRoute({
      path: '/order/:id',
      method: 'get',
      handler: this.getOrderTimeline.bind(this),
      schema: z.object({
        params: z.object({
          id: z.string()
        }),
        query: z.object({
          includeEvents: z.boolean().optional()
        })
      })
    });

    // Get item timeline
    this.createRoute({
      path: '/item/:id',
      method: 'get',
      handler: this.getItemTimeline.bind(this),
      schema: z.object({
        params: z.object({
          id: z.string()
        })
      })
    });

    // Record stage completion
    this.createRoute({
      path: '/stage/complete',
      method: 'post',
      handler: this.completeStage.bind(this),
      schema: z.object({
        body: z.object({
          orderId: z.string(),
          stage: z.string(),
          actorId: z.string(),
          metrics: z.record(z.any()).optional()
        })
      })
    });
  }

  // Handler implementations...
} 