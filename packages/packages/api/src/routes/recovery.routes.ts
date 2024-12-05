import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { RecoveryService } from '@app/core/services/recovery.service';
import { z } from 'zod';

export class RecoveryRoutes extends BaseRoute {
  private recoveryService: RecoveryService;

  constructor() {
    super();
    const prisma = new PrismaClient();
    this.recoveryService = new RecoveryService(prisma);
  }

  protected initializeRoutes(): void {
    // Report problem
    this.createRoute({
      path: '/problem',
      method: 'post',
      handler: this.reportProblem.bind(this),
      schema: z.object({
        body: z.object({
          itemId: z.string(),
          type: z.string(),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
          description: z.string(),
          actorId: z.string()
        })
      })
    });

    // Get active problems
    this.createRoute({
      path: '/problems',
      method: 'get',
      handler: this.getActiveProblems.bind(this),
      schema: z.object({
        query: z.object({
          severity: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional()
        })
      })
    });

    // Resolve problem
    this.createRoute({
      path: '/problem/:id/resolve',
      method: 'post',
      handler: this.resolveProblem.bind(this),
      schema: z.object({
        params: z.object({
          id: z.string()
        }),
        body: z.object({
          resolution: z.string(),
          actorId: z.string(),
          replacementItemId: z.string().optional()
        })
      })
    });
  }

  // Handler implementations...
} 