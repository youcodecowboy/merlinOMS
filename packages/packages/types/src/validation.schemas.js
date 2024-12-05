"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binCreationSchema = exports.skuValidationSchema = exports.orderCreationSchema = exports.paginationSchema = exports.dateSchema = exports.emailSchema = exports.idSchema = void 0;
var zod_1 = require("zod");
// Common schemas
exports.idSchema = zod_1.z.string().uuid();
exports.emailSchema = zod_1.z.string().email();
exports.dateSchema = zod_1.z.string().datetime();
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().optional(),
    limit: zod_1.z.number().optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional()
});
// Request schemas
exports.orderCreationSchema = zod_1.z.object({
    body: zod_1.z.object({
        shopify_id: zod_1.z.string(),
        customer_id: zod_1.z.string(),
        items: zod_1.z.array(zod_1.z.object({
            target_sku: zod_1.z.string(),
            quantity: zod_1.z.number().positive()
        })),
        metadata: zod_1.z.record(zod_1.z.any()).optional()
    })
});
exports.skuValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        sku: zod_1.z.string().regex(/^[A-Z]{2}-\d{2}-[A-Z]-\d{2}-[A-Z]{3}$/)
    })
});
exports.binCreationSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.enum(['STORAGE', 'WASH', 'QC', 'PACKING']),
        zone: zod_1.z.string(),
        shelf: zod_1.z.string(),
        rack: zod_1.z.string(),
        position: zod_1.z.string(),
        capacity: zod_1.z.number().positive()
    })
});
// ... add more schemas as needed 
