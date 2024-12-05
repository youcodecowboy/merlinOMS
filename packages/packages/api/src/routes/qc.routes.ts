import { UserRole } from '@prisma/client';
import { QCRequestHandler } from '../services/request/handlers/qc.handler';
import { RouteBuilder, sendSuccess } from '../utils/route.builder';
import { baseRequestSchema, measurementSchema, visualInspectionSchema } from '../validation/shared.schema';
import { z } from 'zod';

const qcHandler = new QCRequestHandler();

// Validation schemas
const measurementValidationSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    measurements: measurementSchema,
    notes: z.string().optional()
  })
});

const visualInspectionValidationSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    inspection: visualInspectionSchema,
    notes: z.string().optional()
  })
});

const defectSchema = z.object({
  type: z.string(),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
  location: z.string(),
  notes: z.string().optional()
});

const defectReportSchema = baseRequestSchema.extend({
  body: z.object({
    requestId: z.string(),
    defects: z.array(defectSchema),
    recommendedAction: z.enum(['REPAIR', 'REMAKE', 'SCRAP']),
    notes: z.string().optional()
  })
});

// Create route builder
const builder = new RouteBuilder();

// Build routes
const router = builder
  .addRoute({
    path: '/validate-measurements',
    method: 'post',
    roles: [UserRole.QC_TEAM],
    schema: measurementValidationSchema,
    handler: async (req, res) => {
      const result = await qcHandler.validateMeasurements(
        req.body.requestId,
        {
          measurements: req.body.measurements,
          notes: req.body.notes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .addRoute({
    path: '/visual-inspection',
    method: 'post',
    roles: [UserRole.QC_TEAM],
    schema: visualInspectionValidationSchema,
    handler: async (req, res) => {
      const result = await qcHandler.performVisualInspection(
        req.body.requestId,
        {
          inspection: req.body.inspection,
          notes: req.body.notes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .addRoute({
    path: '/report-defect',
    method: 'post',
    roles: [UserRole.QC_TEAM],
    schema: defectReportSchema,
    handler: async (req, res) => {
      const result = await qcHandler.reportDefects(
        req.body.requestId,
        {
          defects: req.body.defects,
          recommendedAction: req.body.recommendedAction,
          notes: req.body.notes
        },
        req.user.id
      );
      sendSuccess(res, result);
    }
  })
  .build();

export default router; 