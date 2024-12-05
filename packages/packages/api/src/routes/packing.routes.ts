import { Router } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma';
import { APIError } from '../utils/errors';
import { PackingRequestHandler } from '../services/request/handlers/packing.handler';

const router = Router();
const packingHandler = new PackingRequestHandler();

// Validation schemas
const createPackingSchema = z.object({
  orderId: z.string().min(1, { message: "Order ID is required" }),
  itemsCount: z.number().min(1, { message: "Items count must be greater than 0" })
});

const scanItemSchema = z.object({
  itemQrCode: z.string().min(1, { message: "QR code is required" })
});

const assignBinSchema = z.object({
  binId: z.string().min(1, { message: "Bin ID is required" })
});

// Create packing request
router.post(
  '/create',
  authMiddleware,
  validationMiddleware({ body: createPackingSchema }),
  async (req, res, next) => {
    try {
      const { orderId, itemsCount } = req.body;

      // Check if order exists and is ready
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new APIError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (order.status !== 'READY_FOR_PACKING') {
        throw new APIError(400, 'INVALID_ORDER_STATUS', 'Order is not ready for packing');
      }

      // Create packing request
      const request = await prisma.request.create({
        data: {
          type: 'PACKING',
          status: 'PENDING',
          order_id: orderId,
          metadata: {
            order_id: orderId,
            items_count: itemsCount
          }
        }
      });

      res.status(201).json({
        id: request.id,
        type: request.type,
        status: request.status,
        metadata: {
          order_id: orderId,
          items_count: itemsCount
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Scan item
router.put(
  '/:id/scan-item',
  authMiddleware,
  validationMiddleware({ body: scanItemSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { itemQrCode } = req.body;

      // Find request first
      const request = await prisma.request.findUnique({
        where: { id }
      });

      if (!request) {
        throw new APIError(404, 'REQUEST_NOT_FOUND', 'Request not found');
      }

      // Find item
      const item = await prisma.inventoryItem.findUnique({
        where: { qr_code: itemQrCode }
      });

      if (!item) {
        throw new APIError(404, 'ITEM_NOT_FOUND', 'Item not found');
      }

      if (item.status1 !== 'READY_FOR_PACKING') {
        throw new APIError(400, 'ITEM_NOT_READY', 'Item is not ready for packing');
      }

      const result = await packingHandler.validateItemScan(
        id,
        item.id,
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

// Assign bin
router.put(
  '/:id/assign-bin',
  authMiddleware,
  validationMiddleware({ body: assignBinSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { binId } = req.body;

      // Find request first
      const request = await prisma.request.findUnique({
        where: { id }
      });

      if (!request) {
        throw new APIError(404, 'REQUEST_NOT_FOUND', 'Request not found');
      }

      // Find bin
      const bin = await prisma.bin.findUnique({
        where: { id: binId }
      });

      if (!bin) {
        throw new APIError(404, 'BIN_NOT_FOUND', 'Bin not found');
      }

      if (bin.current_count >= bin.capacity) {
        throw new APIError(400, 'BIN_FULL', 'Bin capacity exceeded');
      }

      const result = await packingHandler.assignBin(
        id,
        binId,
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

export { router as packingRoutes }; 