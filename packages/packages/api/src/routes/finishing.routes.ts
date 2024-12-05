import { UserRole } from '@prisma/client';
import { FinishingRequestHandler } from '../services/request/handlers/finishing.handler';
import { RouteBuilder, sendSuccess } from '../utils/route.builder';
import { baseRequestSchema, measurementSchema } from '../validation/shared.schema';
import { z } from 'zod';

const finishingHandler = new FinishingRequestHandler();

// Validation schemas
const buttonCompletionSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    buttonColor: z.string(),
    quantity: z.number().min(1),
    notes: z.string().optional()
  })
});

const nametagCompletionSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    style: z.string(),
    placement: z.string(),
    notes: z.string().optional()
  })
});

const hemCompletionSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    finalLength: z.number(),
    notes: z.string().optional()
  })
});

const finalQCSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    measurements: measurementSchema,
    components: z.object({
      buttonsVerified: z.boolean(),
      nametagVerified: z.boolean(),
      hemVerified: z.boolean()
    }),
    notes: z.string().optional()
  })
});

// Create route builder
const builder = new RouteBuilder();

// Build routes
const router = builder
  .addRoute({
    path: '/complete-buttons',
    method: 'post',
    roles: [UserRole.SEWING_TEAM],
    schema: buttonCompletionSchema,
    handler: async (req, res) => {
      const result = await finishingHandler.completeButtons(
        req.body.requestId,
        {
          buttonColor: req.body.buttonColor,
          quantity: req.body.quantity,
          notes: req.body.notes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .addRoute({
    path: '/complete-nametag',
    method: 'post',
    roles: [UserRole.SEWING_TEAM],
    schema: nametagCompletionSchema,
    handler: async (req, res) => {
      const result = await finishingHandler.completeNametag(
        req.body.requestId,
        {
          style: req.body.style,
          placement: req.body.placement,
          notes: req.body.notes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .addRoute({
    path: '/complete-hem',
    method: 'post',
    roles: [UserRole.SEWING_TEAM],
    schema: hemCompletionSchema,
    handler: async (req, res) => {
      const result = await finishingHandler.completeHem(
        req.body.requestId,
        {
          finalLength: req.body.finalLength,
          notes: req.body.notes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .addRoute({
    path: '/final-qc',
    method: 'post',
    roles: [UserRole.QC_TEAM],
    schema: finalQCSchema,
    handler: async (req, res) => {
      const result = await finishingHandler.completeFinalQC(
        req.body.requestId,
        {
          measurements: req.body.measurements,
          components: req.body.components,
          notes: req.body.notes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .build();

export default router; 