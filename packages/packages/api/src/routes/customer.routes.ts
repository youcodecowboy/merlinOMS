import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { CustomerService } from '@app/core';
import { AuthenticatedRequest } from '@app/types';
import { Response } from 'express';
import { z } from 'zod';

const createCustomerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    profile: z.object({
      firstName: z.string(),
      lastName: z.string(),
      phoneNumber: z.string().optional(),
      measurements: z.record(z.number()).optional()
    })
  })
});

export class CustomerRoutes extends BaseRoute {
  private customerService: CustomerService;

  constructor() {
    super();
    this.customerService = new CustomerService(new PrismaClient());
  }

  protected initializeRoutes(): void {
    this.createRoute({
      path: '/',
      method: 'post',
      handler: this.createCustomer.bind(this),
      schema: createCustomerSchema
    });

    this.createRoute({
      path: '/:id/measurements',
      method: 'post',
      handler: this.updateMeasurements.bind(this),
      schema: z.object({
        params: z.object({ id: z.string() }),
        body: z.object({
          measurements: z.record(z.number())
        })
      })
    });
  }

  private async createCustomer(req: AuthenticatedRequest, res: Response) {
    const result = await this.customerService.createCustomer({
      ...req.body,
      actorId: req.user.id
    });
    res.json(result);
  }

  private async updateMeasurements(req: AuthenticatedRequest, res: Response) {
    const result = await this.customerService.updateMeasurements({
      customerId: req.params.id,
      measurements: req.body.measurements,
      actorId: req.user.id
    });
    res.json(result);
  }
} 