import { UserRole } from '@prisma/client';
import { WashRequestHandler } from '../services/request/handlers/wash.handler';
import { RouteBuilder, sendSuccess } from '../utils/route.builder';
import { baseRequestSchema, binSchema } from '../validation/shared.schema';
import { z } from 'zod';

const washHandler = new WashRequestHandler();

// Validation schemas
const assignBinSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    binQrCode: z.string(),
    operatorNotes: z.string().optional()
  })
});

const laundryPickupSchema = binSchema.extend({
  body: z.object({
    binQrCode: z.string(),
    truckId: z.string(),
    driverName: z.string(),
    expectedReturnDate: z.string().transform(str => new Date(str))
  })
});

// Create route builder
const builder = new RouteBuilder();

// Build routes
const router = builder
  .addRoute({
    path: '/assign-bin',
    method: 'post',
    roles: [UserRole.WASH_TEAM],
    schema: assignBinSchema,
    handler: async (req, res) => {
      const result = await washHandler.assignToBin(
        req.body.requestId,
        {
          binQrCode: req.body.binQrCode,
          operatorNotes: req.body.operatorNotes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .addRoute({
    path: '/process-bin',
    method: 'post',
    roles: [UserRole.WASH_TEAM],
    schema: laundryPickupSchema,
    handler: async (req, res) => {
      const result = await washHandler.processBinForLaundry(
        req.body.binQrCode,
        {
          truckId: req.body.truckId,
          driverName: req.body.driverName,
          expectedReturnDate: req.body.expectedReturnDate
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .build();

export default router; 