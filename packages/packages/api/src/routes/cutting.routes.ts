import { Router } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma';
import { APIError } from '../utils/errors';
import { CuttingRequestHandler } from '../services/request/handlers/cutting.handler';

const router = Router();
const cuttingHandler = new CuttingRequestHandler();

// Validation schemas
const createCuttingSchema = z.object({
  batchId: z.string().min(1, { message: "Batch ID is required" }),
  style: z.string().min(1, { message: "Style is required" }),
  quantity: z.number().min(1, { message: "Quantity must be greater than 0" })
});

const validateMaterialSchema = z.object({
  materialId: z.string().min(1, { message: "Material ID is required" })
});

const processCuttingSchema = z.object({
  materialId: z.string().min(1, { message: "Material ID is required" }),
  wastePercentage: z.number().min(0).max(100, { message: "Waste percentage must be between 0 and 100" }),
  piecesCount: z.number().min(1, { message: "Pieces count must be greater than 0" })
});

// Create cutting request
router.post(
  '/create',
  authMiddleware,
  validationMiddleware({ body: createCuttingSchema }),
  async (req, res, next) => {
    try {
      const { batchId, style, quantity } = req.body;

      // Check if batch exists and is ready
      const batch = await prisma.batch.findUnique({
        where: { id: batchId }
      });

      if (!batch) {
        throw new APIError(404, 'BATCH_NOT_FOUND', 'Batch not found');
      }

      if (batch.status !== 'READY_FOR_CUTTING') {
        throw new APIError(400, 'INVALID_BATCH_STATUS', 'Batch is not ready for cutting');
      }

      // Create cutting request
      const request = await prisma.request.create({
        data: {
          type: 'CUTTING',
          status: 'PENDING',
          batch_id: batchId,
          metadata: {
            style,
            quantity,
            batch_id: batchId
          }
        }
      });

      res.status(201).json({
        id: request.id,
        type: request.type,
        status: request.status,
        metadata: {
          batch_id: batchId,
          style,
          quantity
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Validate material
router.put(
  '/:id/validate-material',
  authMiddleware,
  validationMiddleware({ body: validateMaterialSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { materialId } = req.body;

      // Find request first
      const request = await prisma.request.findUnique({
        where: { id }
      });

      if (!request) {
        throw new APIError(404, 'REQUEST_NOT_FOUND', 'Request not found');
      }

      // Find material
      const material = await prisma.inventoryItem.findUnique({
        where: { id: materialId }
      });

      if (!material) {
        throw new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found');
      }

      if (material.status1 !== 'AVAILABLE' || material.status2 !== 'RAW') {
        throw new APIError(400, 'MATERIAL_UNAVAILABLE', 'Material is not available for cutting');
      }

      const result = await cuttingHandler.validateMaterial(
        id,
        materialId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        request: result.data
      });
    } catch (error) {
      next(error);
    }
  }
);

// Process cutting
router.put(
  '/:id/process',
  authMiddleware,
  validationMiddleware({ body: processCuttingSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { materialId, wastePercentage, piecesCount } = req.body;

      // Find request first
      const request = await prisma.request.findUnique({
        where: { id }
      });

      if (!request) {
        throw new APIError(404, 'REQUEST_NOT_FOUND', 'Request not found');
      }

      // Find material
      const material = await prisma.inventoryItem.findUnique({
        where: { id: materialId }
      });

      if (!material) {
        throw new APIError(404, 'MATERIAL_NOT_FOUND', 'Material not found');
      }

      const result = await cuttingHandler.processCutting(
        id,
        { materialId, wastePercentage, piecesCount },
        req.user!.id
      );

      res.status(200).json({
        success: true,
        request: result.data
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as cuttingRoutes }; 