import { Router } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma';
import { APIError } from '../utils/errors';
import { RequestType, RequestStatus } from '@prisma/client';

const router = Router();

// Validation schemas
const createPatternSchema = z.object({
  orderId: z.string().min(1, { message: "Order ID is required" }),
  notes: z.string().optional()
});

const completePatternSchema = z.object({
  notes: z.string().optional()
});

interface PatternRequestMetadata {
  notes?: string;
  created_by_id?: string;
  completed_by_id?: string;
  completed_at?: string;
  completion_notes?: string;
  [key: string]: any;
}

// Create pattern request
router.post(
  '/create',
  authMiddleware,
  validationMiddleware({ body: createPatternSchema }),
  async (req, res, next) => {
    try {
      const { orderId, notes } = req.body;

      // Verify order exists
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true
        }
      });

      if (!order) {
        throw new APIError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      // Create pattern request
      const request = await prisma.request.create({
        data: {
          type: RequestType.PATTERN,
          status: RequestStatus.PENDING,
          order_id: orderId,
          metadata: {
            notes,
            created_by_id: req.user!.id
          }
        },
        select: {
          id: true,
          type: true,
          status: true,
          metadata: true
        }
      });

      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  }
);

// Complete pattern
router.put(
  '/:id/complete',
  authMiddleware,
  validationMiddleware({ body: completePatternSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      console.log('Completing pattern request:', { id, notes });

      // Find request
      const request = await prisma.request.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          order_id: true,
          metadata: true
        }
      });
      console.log('Found request:', request);

      if (!request) {
        throw new APIError(404, 'REQUEST_NOT_FOUND', 'Pattern request not found');
      }

      // Safely handle metadata as plain object
      const currentMetadata = request.metadata as Record<string, any> || {};
      console.log('Current metadata:', currentMetadata);
      
      try {
        // Update request and order status
        await prisma.$transaction([
          prisma.request.update({
            where: { id },
            data: {
              status: RequestStatus.COMPLETED,
              metadata: {
                ...currentMetadata,
                completion_notes: notes,
                completed_by_id: req.user!.id,
                completed_at: new Date().toISOString()
              }
            },
            select: {
              id: true,
              status: true,
              metadata: true,
              order_id: true
            }
          }),
          prisma.order.update({
            where: { id: request.order_id! },
            data: { status: 'PATTERN_COMPLETED' },
            select: {
              id: true,
              status: true
            }
          })
        ]);
      } catch (txError) {
        console.error('Transaction error:', txError);
        throw txError;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Complete pattern error:', error);
      next(error);
    }
  }
);

export { router as patternRoutes }; 