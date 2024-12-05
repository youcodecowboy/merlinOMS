import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// Import handlers
import { MoveRequestHandler } from '../services/request/handlers/move.handler';
import { WashRequestHandler } from '../services/request/handlers/wash.handler';
import { PatternRequestHandler } from '../services/request/handlers/pattern.handler';
import { CuttingRequestHandler } from '../services/request/handlers/cutting.handler';
import { QCRequestHandler } from '../services/request/handlers/qc.handler';
import { FinishingRequestHandler } from '../services/request/handlers/finishing.handler';
import { PackingRequestHandler } from '../services/request/handlers/packing.handler';

const router = Router();

// Initialize handlers
const moveHandler = new MoveRequestHandler();
const washHandler = new WashRequestHandler();
const patternHandler = new PatternRequestHandler();
const cuttingHandler = new CuttingRequestHandler();
const qcHandler = new QCRequestHandler();
const finishingHandler = new FinishingRequestHandler();
const packingHandler = new PackingRequestHandler();

// Common validation schemas
const requestIdSchema = z.object({
  params: z.object({
    requestId: z.string()
  })
});

// Move request routes
router.post(
  '/move/validate-item',
  authenticate,
  authorize(UserRole.WAREHOUSE),
  validateRequest(z.object({
    body: z.object({
      requestId: z.string(),
      itemQrCode: z.string()
    })
  })),
  async (req, res, next) => {
    try {
      const result = await moveHandler.validateItemScan(
        req.body.requestId,
        req.body.itemQrCode,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/move/validate-destination',
  authenticate,
  authorize(UserRole.WAREHOUSE),
  validateRequest(z.object({
    body: z.object({
      requestId: z.string(),
      destinationData: z.object({
        qrCode: z.string(),
        type: z.enum(['BIN', 'ZONE'])
      })
    })
  })),
  async (req, res, next) => {
    try {
      const result = await moveHandler.validateDestinationScan(
        req.body.requestId,
        req.body.destinationData,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Pattern request routes
router.post(
  '/pattern/validate-batch',
  authenticate,
  authorize(UserRole.PATTERN_MAKER),
  validateRequest(z.object({
    body: z.object({
      requestId: z.string(),
      batchData: z.object({
        skus: z.array(z.string()),
        quantity: z.number(),
        notes: z.string().optional(),
        priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional()
      })
    })
  })),
  async (req, res, next) => {
    try {
      const result = await patternHandler.validateBatchSelection(
        req.body.requestId,
        req.body.batchData,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// QC request routes
router.post(
  '/qc/measurements',
  authenticate,
  authorize(UserRole.QC_TEAM),
  validateRequest(z.object({
    body: z.object({
      requestId: z.string(),
      measurements: z.object({
        waist: z.number(),
        hip: z.number(),
        thigh: z.number(),
        inseam: z.number()
      })
    })
  })),
  async (req, res, next) => {
    try {
      const result = await qcHandler.validateMeasurements(
        req.body.requestId,
        req.body.measurements,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Finishing request routes
router.post(
  '/finishing/hem',
  authenticate,
  authorize(UserRole.WAREHOUSE),
  validateRequest(z.object({
    body: z.object({
      requestId: z.string(),
      hemData: z.object({
        finalLength: z.number(),
        notes: z.string().optional()
      })
    })
  })),
  async (req, res, next) => {
    try {
      const result = await finishingHandler.completeHem(
        req.body.requestId,
        req.body.hemData,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ... add other routes for each handler

export default router; 