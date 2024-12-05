import { Router } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { OrderFulfillmentService } from '../services/order/order-fulfillment.service';
import { prisma } from '../utils/prisma';
import { APIError } from '../utils/errors';
import { OrderStatus } from '@prisma/client';

const router = Router();

// Don't create service instance here - inject it in the route handler
let orderService: OrderFulfillmentService;

// Define types for request body
interface OrderItem {
  target_sku: string;
  quantity: number;
}

// Validation schemas
const createOrderSchema = z.object({
  shopify_id: z.string(),
  customer_id: z.string(),
  items: z.array(z.object({
    target_sku: z.string(),
    quantity: z.number().min(1)
  }))
});

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'PROCESSING', 'COMPLETED', 'CANCELLED'])
});

const listOrdersSchema = z.object({
  status: z.enum(['NEW', 'PROCESSING', 'COMPLETED', 'CANCELLED']).optional(),
  customer_id: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional()
}).optional();

// Create order
router.post(
  '/',
  authMiddleware,
  validationMiddleware({ body: createOrderSchema }),
  async (req, res, next) => {
    try {
      const { shopify_id, customer_id, items } = req.body as {
        shopify_id: string;
        customer_id: string;
        items: OrderItem[];
      };

      // First check if customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customer_id }
      });

      if (!customer) {
        throw new APIError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }

      const order = await prisma.order.create({
        data: {
          shopify_id,
          customer_id,
          status: OrderStatus.NEW,
          order_items: {
            create: items.map((item: OrderItem) => ({
              target_sku: item.target_sku,
              quantity: item.quantity,
              status: 'NEW'
            }))
          }
        },
        include: {
          order_items: true
        }
      });

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
);

// List orders with filters
router.get(
  '/',
  authMiddleware,
  validationMiddleware({ query: listOrdersSchema }),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const status = req.query.status as OrderStatus | undefined;
      const customer_id = req.query.customer_id as string | undefined;

      const where: any = {};
      if (status) where.status = status;
      if (customer_id) where.customer_id = customer_id;

      const orders = await prisma.order.findMany({
        where,
        include: {
          order_items: true,
          customer: {
            select: {
              email: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      });

      const total = await prisma.order.count({ where });

      res.json({
        data: orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get order details
router.get(
  '/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          order_items: true,
          customer: {
            select: {
              email: true,
              profile: true
            }
          }
        }
      });

      if (!order) {
        throw new APIError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

// Update order status
router.put(
  '/:id/status',
  authMiddleware,
  validationMiddleware({ body: updateStatusSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Create/get service instance
      if (!orderService) {
        orderService = new OrderFulfillmentService();
      }

      // If status is PROCESSING, use OrderFulfillmentService
      if (status === 'PROCESSING') {
        const result = await orderService.processOrder(id);
        return res.json(result);  // Return the full result object
      }

      // For other status updates
      const order = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          order_items: true
        }
      });

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

export { router as orderRoutes }; 