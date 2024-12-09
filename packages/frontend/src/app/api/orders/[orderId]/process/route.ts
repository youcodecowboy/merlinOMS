import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

interface OrderItem {
  id: string;
  order_id: string;
  target_sku: string;
  quantity: number;
  status: string;
  assigned_item_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface Request {
  id: string;
  type: string;
  status: string;
  item_id: string | null;
  order_id: string | null;
  batch_id: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

type InventoryItemWithBin = {
  id: string;
  sku: string;
  status1: string;
  status2: string;
  location: string;
  qr_code: string | null;
  bin_id: string | null;
  current_bin: {
    id: string;
    code: string;
    type: string;
    zone: string;
  } | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
};

// Validation schema for request body
const processOrderSchema = z.object({
  operatorId: z.string().uuid(),
});

async function findExactMatch(sku: string) {
  try {
    // Parse SKU components to check length requirements
    const [style, waist, shape, length, wash] = sku.split('-');

    console.log('Searching for exact match:', {
      sku,
      components: { style, waist, shape, length, wash },
      conditions: {
        OR: [
          { status1: 'STOCK', status2: 'UNCOMMITTED' },
          { status1: 'PRODUCTION', status2: 'UNCOMMITTED' }
        ]
      }
    });

    // First check if any items exist with this SKU
    const allItems = await prisma.inventoryItem.findMany({
      where: { sku },
      include: { current_bin: true }
    });
    console.log('All items with this SKU:', allItems);

    // Then check for available items
    const match = await prisma.inventoryItem.findFirst({
      where: {
        sku,
        OR: [
          {
            status1: 'STOCK',
            status2: 'UNCOMMITTED'
          },
          {
            status1: 'PRODUCTION',
            status2: 'UNCOMMITTED'
          }
        ]
      },
      include: {
        current_bin: true
      }
    });

    console.log('Exact match result:', {
      found: !!match,
      item: match,
      allItemsCount: allItems.length,
      allItems: allItems.map((item: InventoryItemWithBin) => ({
        id: item.id,
        sku: item.sku,
        status1: item.status1,
        status2: item.status2,
        location: item.location,
        bin: item.current_bin
      }))
    });

    return match;
  } catch (error) {
    console.error('Error in findExactMatch:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

async function findUniversalMatch(targetSku: string) {
  try {
    // Parse target SKU components
    const [style, waist, shape, targetLength, wash] = targetSku.split('-');
    const washGroup = ['STA', 'IND'].includes(wash) ? 'LIGHT' : 'DARK';
    const universalWash = washGroup === 'LIGHT' ? 'RAW' : 'BRW';

    console.log('Searching for universal match:', {
      targetSku,
      components: { style, waist, shape, targetLength, wash },
      washGroup,
      universalWash
    });

    // Find matching item with universal wash and sufficient length
    const match = await prisma.inventoryItem.findFirst({
      where: {
        sku: {
          startsWith: `${style}-${waist}-${shape}`,
          endsWith: universalWash
        },
        OR: [
          {
            status1: 'STOCK',
            status2: 'UNCOMMITTED'
          },
          {
            status1: 'PRODUCTION',
            status2: 'UNCOMMITTED'
          }
        ]
      },
      orderBy: {
        created_at: 'asc'
      },
      include: {
        current_bin: true
      }
    });

    if (match) {
      // Check if the found item's length is sufficient
      const [, , , itemLength] = match.sku.split('-');
      if (parseInt(itemLength) < parseInt(targetLength)) {
        console.log('Found universal match but length insufficient:', {
          itemLength,
          targetLength
        });
        return null;
      }
    }

    console.log('Universal match result:', {
      found: !!match,
      item: match
    });

    return match;
  } catch (error) {
    console.error('Error in findUniversalMatch:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

async function assignItemToOrder(itemId: string, orderItemId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    try {
      console.log('Starting item assignment:', {
        itemId,
        orderItemId,
        orderId
      });

      // First verify the item is still available
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });
      console.log('Found item for assignment:', JSON.stringify(item, null, 2));

      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }

      if (item.status2 !== 'UNCOMMITTED') {
        throw new Error(`Item ${itemId} is no longer available (status2: ${item.status2})`);
      }

      if (item.status1 === 'PRODUCTION') {
        // For PRODUCTION items, do soft commitment
        const updatedItem = await tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            status2: 'COMMITTED',
            metadata: {
              waitlisted_order_id: orderId,
              waitlisted_at: new Date().toISOString()
            }
          }
        });
        console.log('Updated inventory item status to COMMITTED:', JSON.stringify(updatedItem, null, 2));

        // Update order item to PRODUCTION status
        const updatedOrderItem = await tx.orderItem.update({
          where: { id: orderItemId },
          data: {
            status: 'IN_PRODUCTION',
            metadata: {
              committed_item_id: itemId,
              position: 1 // First in line for this item
            }
          }
        });
        console.log('Updated order item to PRODUCTION:', JSON.stringify(updatedOrderItem, null, 2));

        return { updatedItem, updatedOrderItem };
      } else {
        // For STOCK items, do hard assignment and create wash request
        const updatedItem = await tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            status1: 'WASH',
            status2: 'ASSIGNED',
            order_assignment: {
              connect: { id: orderItemId }
            }
          }
        });
        console.log('Updated inventory item status to WASH/ASSIGNED:', JSON.stringify(updatedItem, null, 2));

        // Update order item
        const updatedOrderItem = await tx.orderItem.update({
          where: { id: orderItemId },
          data: {
            status: 'ASSIGNED',
            assigned_item_id: itemId
          }
        });
        console.log('Updated order item:', JSON.stringify(updatedOrderItem, null, 2));

        // Create wash request
        const washRequest = await tx.request.create({
          data: {
            type: 'WASH',
            status: 'PENDING',
            item_id: itemId,
            order_id: orderId,
            assigned_to: '2d40fc18-e02a-41f1-8c4e-92f770133029', // Warehouse user ID
            metadata: {
              order_item_id: orderItemId,
              requires_bin_assignment: true,
              requires_qr_scan: true,
              target_wash: orderItem.target_sku.split('-')[4],
              is_universal_match: item.sku !== orderItem.target_sku,
              source: item.location || 'WAREHOUSE',
              sku: item.sku,
              target_sku: orderItem.target_sku,
              order_shopify_id: order.shopify_id,
              customer_name: order.customer?.profile?.metadata?.firstName 
                ? `${order.customer.profile.metadata.firstName} ${order.customer.profile.metadata.lastName}`
                : 'Unknown Customer',
              customer_email: order.customer?.email || 'unknown@example.com',
              assigned_at: new Date().toISOString()
            }
          }
        });
        console.log('Created wash request:', JSON.stringify(washRequest, null, 2));

        // Create notification for assigned operator
        await tx.notification.create({
          data: {
            type: 'REQUEST_ASSIGNED',
            message: `You have been assigned a new wash request for item ${updatedItem.sku}`,
            user_id: '2d40fc18-e02a-41f1-8c4e-92f770133029', // Warehouse user ID
            request_id: washRequest.id,
            read: false,
            metadata: {
              request_type: 'WASH',
              item_id: itemId,
              item_sku: updatedItem.sku,
            }
          }
        });

        return { updatedItem, updatedOrderItem, washRequest };
      }
    } catch (error) {
      console.error('Error in assignItemToOrder:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        itemId,
        orderItemId,
        orderId
      });
      throw error;
    }
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    console.log('Processing order:', orderId);

    // Validate request body
    const body = await req.json();
    const validatedData = processOrderSchema.parse(body);

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        order_items: true,
        customer: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Process each order item in a transaction
    const results = await Promise.all(
      order.order_items.map(async (item) => {
        return prisma.$transaction(async (tx) => {
          try {
            // Step 1: Try exact SKU match
            const exactMatch = await findExactMatch(item.target_sku);
            if (exactMatch) {
              const result = await assignItemToOrder(exactMatch.id, item.id, orderId);
              return {
                success: true,
                action: 'direct_assignment',
                itemId: exactMatch.id,
                message: 'Found exact match and assigned item',
                details: result
              };
            }

            // Step 2: Try universal SKU match
            const universalMatch = await findUniversalMatch(item.target_sku);
            if (universalMatch) {
              const result = await assignItemToOrder(universalMatch.id, item.id, orderId);
              return {
                success: true,
                action: 'universal_assignment',
                itemId: universalMatch.id,
                message: 'Found universal match and assigned item',
                details: result
              };
            }

            // Only create production request if no matches were found
            console.log('No matches found, creating production request');
            const [style, waist, shape, , wash] = item.target_sku.split('-');
            const universalWash = ['STA', 'IND'].includes(wash) ? 'RAW' : 'BRW';
            const universalSKU = `${style}-${waist}-${shape}-36-${universalWash}`;

            // Create production request
            const productionRequest = await tx.request.create({
              data: {
                type: 'PRODUCTION',
                status: 'PENDING',
                order_id: orderId,
                metadata: {
                  target_sku: item.target_sku,
                  universal_sku: universalSKU,
                  quantity: 1
                }
              }
            });

            // Update order item status
            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                status: 'IN_PRODUCTION'
              }
            });

            return {
              success: true,
              action: 'production_request',
              message: 'Created production request',
              details: { productionRequest }
            };
          } catch (error) {
            console.error('Error processing order item:', error);
            return {
              success: false,
              action: 'failed',
              message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
          }
        });
      })
    );

    // Update order status based on results
    const allSuccessful = results.every(r => r.success);
    const anyProduction = results.some(r => r.action === 'production_request');
    const anyDirectAssignment = results.some(r => r.action === 'direct_assignment' || r.action === 'universal_assignment');

    const newStatus = allSuccessful
      ? anyProduction
        ? 'PENDING_PRODUCTION'
        : anyDirectAssignment
          ? 'PROCESSING'
          : 'NEW'
      : 'ERROR';

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updated_at: new Date()
      },
      include: {
        order_items: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Order processed successfully',
      order: updatedOrder,
      results
    });

  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process order" },
      { status: 500 }
    );
  }
} 