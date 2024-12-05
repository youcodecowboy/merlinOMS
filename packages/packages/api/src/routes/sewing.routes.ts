import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { SewingService } from '@app/core/services/sewing.service';
import { z } from 'zod';

export class SewingRoutes extends BaseRoute {
  private sewingService: SewingService;

  constructor() {
    super();
    const prisma = new PrismaClient();
    this.sewingService = new SewingService(prisma);
  }

  protected initializeRoutes(): void {
    // Start sewing batch
    this.createRoute({
      path: '/batch/start',
      method: 'post',
      handler: this.startBatch.bind(this),
      schema: z.object({
        body: z.object({
          cuttingBatchId: z.string(),
          operatorId: z.string(),
          machineId: z.string()
        })
      })
    });

    // Complete piece
    this.createRoute({
      path: '/piece/complete',
      method: 'post',
      handler: this.completePiece.bind(this),
      schema: z.object({
        body: z.object({
          pieceId: z.string(),
          operatorId: z.string(),
          defects: z.array(z.object({
            type: z.string(),
            severity: z.string(),
            location: z.string()
          })).optional()
        })
      })
    });

    // Get operator queue
    this.createRoute({
      path: '/queue/:operatorId',
      method: 'get',
      handler: this.getOperatorQueue.bind(this)
    });
  }

  // Handler implementations...
} 