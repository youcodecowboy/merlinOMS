import { BaseRoute } from './base.route';
import { PrismaClient } from '@prisma/client';
import { BinManagementService } from '@app/core';
import { AuthenticatedRequest } from '@app/types';
import { Response } from 'express';
import { z } from 'zod';

// Validation schemas
const createBinSchema = z.object({
  body: z.object({
    type: z.enum(['STORAGE', 'WASH', 'QC', 'PACKING']),
    zone: z.string(),
    shelf: z.string(),
    rack: z.string(),
    position: z.string(),
    capacity: z.number().positive()
  })
});

const binIdSchema = z.object({
  params: z.object({
    id: z.string()
  })
});

const validateScanSchema = z.object({
  body: z.object({
    binSKU: z.string(),
    scannedQR: z.string()
  })
});

export class BinRoutes extends BaseRoute {
  private binService: BinManagementService;

  constructor() {
    super();
    const prisma = new PrismaClient();
    this.binService = new BinManagementService(prisma);
  }

  protected initializeRoutes(): void {
    // Create bin
    this.createRoute({
      path: '/',
      method: 'post',
      handler: this.createBin.bind(this),
      schema: createBinSchema
    });

    // Get bin contents
    this.createRoute({
      path: '/:id/contents',
      method: 'get',
      handler: this.getBinContents.bind(this),
      schema: binIdSchema
    });

    // Validate bin scan
    this.createRoute({
      path: '/validate-scan',
      method: 'post',
      handler: this.validateBinScan.bind(this),
      schema: validateScanSchema
    });
  }

  private async createBin(req: AuthenticatedRequest, res: Response) {
    const result = await this.binService.createBin({
      ...req.body,
      actorId: req.user.id
    });
    res.json(result);
  }

  private async getBinContents(req: AuthenticatedRequest, res: Response) {
    const bin = await this.binService.getBinContents({
      binId: req.params.id,
      actorId: req.user.id
    });
    res.json(bin);
  }

  private async validateBinScan(req: AuthenticatedRequest, res: Response) {
    const { binSKU, scannedQR } = req.body;
    const result = await this.binService.validateBinScan({
      binSKU,
      scannedQR,
      actorId: req.user.id
    });
    res.json(result);
  }
}

export default new BinRoutes().router; 