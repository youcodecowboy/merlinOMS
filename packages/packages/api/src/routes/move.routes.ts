import { Router } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma';
import { APIError } from '../utils/errors';
import { MoveRequestHandler } from '../services/request/handlers/move.handler';
import { RequestType, RequestStatus } from '@prisma/client';

const router = Router();
const moveHandler = new MoveRequestHandler();

// Add type for request metadata
interface MoveRequestMetadata {
  item_id: string;
  destination_zone: string;
}

// Validation schemas
const createMoveSchema = z.object({
  itemId: z.string().min(1, { message: "Item ID is required" }),
  destinationZone: z.string().regex(/^[A-Z0-9-]+$/, { message: "Invalid destination zone format" })
});

const scanItemSchema = z.object({
  itemQrCode: z.string().min(1, { message: "QR code is required" })
});

const scanDestinationSchema = z.object({
  destinationQrCode: z.string().regex(/^[A-Z0-9-]+$/, { message: "Invalid location format" }),
  type: z.enum(['ZONE', 'BIN', 'RACK'], { errorMap: () => ({ message: "Invalid destination type" }) })
});

// Create move request
router.post(
  '/create',
  authMiddleware,
  validationMiddleware({ body: createMoveSchema }),
  async (req, res, next) => {
    try {
      console.log('Creating move request with:', req.body);
      const { itemId, destinationZone } = req.body;

      // Check if item exists
      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId }
      });
      console.log('Found item:', item);

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      // Create request with ONLY the fields we can see in schema
      const request = await prisma.$transaction(async (tx) => {
        return tx.request.create({
          data: {
            type: 'MOVE',
            status: 'PENDING',
            metadata: {
              item_id: itemId,
              destination_zone: destinationZone
            }
          },
          select: {
            id: true,
            type: true,
            status: true,
            metadata: true
          }
        });
      });

      console.log('Created request:', request);
      res.status(201).json(request);
    } catch (error) {
      console.error('Move request creation error:', error);
      next(error);
    }
  }
);

// Single scan-item endpoint
router.put(
  '/:id/scan-item',
  authMiddleware,
  validationMiddleware({ body: scanItemSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { itemQrCode } = req.body;
      console.log('Scanning item:', { requestId: id, itemQrCode });

      // Find request first - with explicit select to avoid batch_id issue
      const request = await prisma.request.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          status: true,
          metadata: true
        }
      });
      console.log('Found request:', request);

      if (!request || !request.metadata) {
        throw new APIError(404, 'REQUEST_NOT_FOUND', 'Request not found');
      }

      // Safe type assertion with runtime check
      const metadata = request.metadata as Record<string, unknown>;
      console.log('Request metadata:', metadata);

      if (!metadata.item_id || typeof metadata.item_id !== 'string') {
        throw new APIError(400, 'INVALID_METADATA', 'Invalid request metadata');
      }

      // Find item
      const item = await prisma.inventoryItem.findUnique({
        where: { qr_code: itemQrCode }
      });
      console.log('Found item:', item);

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      if (item.id !== metadata.item_id) {
        console.log('Item mismatch:', { 
          itemId: item.id, 
          metadataItemId: metadata.item_id 
        });
        throw new APIError(400, 'ITEM_MISMATCH', 'Item does not match request');
      }

      // Update request status
      const updatedRequest = await prisma.request.update({
        where: { id },
        data: { status: RequestStatus.IN_PROGRESS },
        select: {
          id: true,
          status: true
        }
      });
      console.log('Updated request:', updatedRequest);

      res.json({ success: true });
    } catch (error) {
      console.error('Scan item error:', error);
      next(error);
    }
  }
);

// Scan destination
router.put(
  '/:id/scan-destination',
  authMiddleware,
  validationMiddleware({ body: scanDestinationSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { destinationQrCode, type } = req.body;
      console.log('Scanning destination:', { requestId: id, destinationQrCode, type });

      // Find request with explicit select
      const request = await prisma.request.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          status: true,
          metadata: true
        }
      });
      console.log('Found request:', request);

      if (!request || !request.metadata) {
        throw new APIError(404, 'REQUEST_NOT_FOUND', 'Request not found');
      }

      // Safe type assertion with runtime check
      const metadata = request.metadata as Record<string, unknown>;
      console.log('Request metadata:', metadata);

      if (!metadata.destination_zone || typeof metadata.destination_zone !== 'string') {
        throw new APIError(400, 'INVALID_METADATA', 'Invalid request metadata');
      }

      // Verify destination matches
      if (!destinationQrCode.startsWith(metadata.destination_zone)) {
        throw new APIError(400, 'DESTINATION_MISMATCH', 'Scanned destination does not match request');
      }

      // Update request status with explicit select
      const updatedRequest = await prisma.request.update({
        where: { id },
        data: { status: RequestStatus.COMPLETED },
        select: {
          id: true,
          status: true
        }
      });
      console.log('Updated request:', updatedRequest);

      // Update item location
      if (metadata.item_id && typeof metadata.item_id === 'string') {
        const updatedItem = await prisma.inventoryItem.update({
          where: { id: metadata.item_id },
          data: { location: destinationQrCode },
          select: {
            id: true,
            location: true
          }
        });
        console.log('Updated item:', updatedItem);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Scan destination error:', error);
      next(error);
    }
  }
);

export { router as moveRoutes }; 