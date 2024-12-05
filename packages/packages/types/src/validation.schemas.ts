import { z } from 'zod';

// Common schemas
export const idSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const dateSchema = z.string().datetime();
export const paginationSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// Request schemas
export const orderCreationSchema = z.object({
  body: z.object({
    shopify_id: z.string(),
    customer_id: z.string(),
    items: z.array(z.object({
      target_sku: z.string(),
      quantity: z.number().positive()
    })),
    metadata: z.record(z.any()).optional()
  })
});

export const skuValidationSchema = z.object({
  body: z.object({
    sku: z.string().regex(/^[A-Z]{2}-\d{2}-[A-Z]-\d{2}-[A-Z]{3}$/)
  })
});

export const binCreationSchema = z.object({
  body: z.object({
    type: z.enum(['STORAGE', 'WASH', 'QC', 'PACKING']),
    zone: z.string(),
    shelf: z.string(),
    rack: z.string(),
    position: z.string(),
    capacity: z.number().positive()
  })
});

// ... add more schemas as needed 