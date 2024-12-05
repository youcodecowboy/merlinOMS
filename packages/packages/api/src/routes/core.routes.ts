import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { SKUService } from '@app/core/services/sku.service';
import { EventLoggerService } from '@app/core/services/event-logger.service';
import { z } from 'zod';

// Validation schemas
const validateSKUSchema = z.object({
  body: z.object({
    sku: z.string()
  })
});

const getEventsSchema = z.object({
  query: z.object({
    type: z.string().optional(),
    actorId: z.string().optional(),
    itemId: z.string().optional(),
    orderId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional()
  })
});

export class CoreRoutes extends BaseRoute {
  private prisma: PrismaClient;
  private skuService: SKUService;
  private eventLogger: EventLoggerService;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.skuService = new SKUService();
    this.eventLogger = new EventLoggerService(this.prisma);
  }

  protected initializeRoutes(): void {
    // SKU validation endpoint
    this.createRoute({
      path: '/sku/validate',
      method: 'post',
      handler: this.validateSKU.bind(this),
      schema: validateSKUSchema
    });

    // Events endpoint
    this.createRoute({
      path: '/events',
      method: 'get',
      handler: this.getEvents.bind(this),
      schema: getEventsSchema
    });

    // Health check endpoint
    this.createRoute({
      path: '/health',
      method: 'get',
      handler: this.healthCheck.bind(this),
      skipAuth: true
    });
  }

  private async validateSKU(req: Request, res: Response) {
    const result = await this.skuService.validateSKU(req.body.sku);
    res.json({ success: true, data: result });
  }

  private async getEvents(req: Request, res: Response) {
    const events = await this.prisma.event.findMany({
      where: req.query,
      orderBy: { created_at: 'desc' },
      take: 100
    });
    res.json({ success: true, data: events });
  }

  private async healthCheck(req: Request, res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.json({ success: true, status: 'healthy' });
    } catch (error) {
      res.status(500).json({ success: false, status: 'unhealthy' });
    }
  }
}

export default new CoreRoutes().router; 