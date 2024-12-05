import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

type InventoryItemWithBin = Prisma.InventoryItem & {
  current_bin: Prisma.Bin | null;
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
  try {
    console.log('Starting item assignment:', {
      itemId,
      orderItemId,
      orderId
    });

    // First verify the item is still available
    const item = await prisma.inventoryItem.findUnique({
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
      const updatedItem = await prisma.inventoryItem.update({
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
      const updatedOrderItem = await prisma.orderItem.update({
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
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          status2: 'ASSIGNED',
          assigned_order_id: orderId
        }
      });
      console.log('Updated inventory item status to ASSIGNED:', JSON.stringify(updatedItem, null, 2));

      // Update order item
      const updatedOrderItem = await prisma.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'ASSIGNED',
          assigned_item_id: itemId
        }
      });
      console.log('Updated order item:', JSON.stringify(updatedOrderItem, null, 2));

      // Create wash request
      const washRequest = await prisma.request.create({
        data: {
          type: 'WASH',
          status: 'PENDING',
          item_id: itemId,
          order_id: orderId,
          metadata: {
            order_item_id: orderItemId,
            requires_bin_assignment: true,
            requires_qr_scan: true
          }
        }
      });
      console.log('Created wash request:', JSON.stringify(washRequest, null, 2));

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
}

async function createProductionRequest(sku: string, orderItemId: string, orderId: string) {
  try {
    // Parse SKU for universal version with 36" length
    const [style, waist, shape, , wash] = sku.split('-');
    const washGroup = ['STA', 'IND'].includes(wash) ? 'LIGHT' : 'DARK';
    const universalWash = washGroup === 'LIGHT' ? 'RAW' : 'BRW';
    const universalSku = `${style}-${waist}-${shape}-36-${universalWash}`;

    console.log('Creating production request:', {
      originalSku: sku,
      universalSku,
      orderItemId,
      orderId
    });

    // Check for existing pending request for this SKU
    const existingRequest = await prisma.request.findFirst({
      where: {
        type: 'PATTERN',
        status: 'PENDING',
        metadata: {
          path: ['universal_sku'],
          equals: universalSku
        }
      }
    });

    if (existingRequest) {
      console.log('Found existing production request:', existingRequest);
      // Update existing request - add to waitlist
      const updatedRequest = await prisma.request.update({
        where: { id: existingRequest.id },
        data: {
          metadata: {
            ...existingRequest.metadata,
            order_ids: [...(existingRequest.metadata.order_ids || []), orderId],
            order_item_ids: [...(existingRequest.metadata.order_item_ids || []), orderItemId],
            quantity: (existingRequest.metadata.quantity || 1) + 1
          }
        }
      });
      console.log('Updated existing production request:', updatedRequest);
      return updatedRequest;
    }

    // Create new production request
    const newRequest = await prisma.request.create({
      data: {
        type: 'PATTERN',
        status: 'PENDING',
        order_id: orderId,
        metadata: {
          universal_sku: universalSku,
          order_ids: [orderId],
          order_item_ids: [orderItemId],
          quantity: 1,
          requires_approval: true,
          length: 36 // Universal length
        }
      }
    });
    console.log('Created new production request:', newRequest);
    return newRequest;
  } catch (error) {
    console.error('Error in createProductionRequest:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      sku,
      orderItemId,
      orderId
    });
    throw error;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    console.log('Starting order processing:', params.orderId);
    
    const body = await req.json();
    console.log('Request body:', body);
    
    const { operatorId } = processOrderSchema.parse(body);
    console.log('Operator ID:', operatorId);

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        order_items: true
      }
    });
    console.log('Found order:', order);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const results: Array<{
      success: boolean;
      action: 'direct_assignment' | 'universal_assignment' | 'production_request';
      itemId?: string;
      message: string;
      error?: string;
    }> = [];

    // Process each order item
    for (const item of order.order_items) {
      console.log('\nProcessing order item:', item);
      
      try {
        // Step 1: Try exact SKU match
        console.log('Looking for exact match...');
        const exactMatch = await findExactMatch(item.target_sku);
        console.log('Exact match result:', exactMatch);
        
        if (exactMatch) {
          console.log('Found exact match, assigning...');
          const assignment = await assignItemToOrder(exactMatch.id, item.id, order.id);
          console.log('Assignment complete:', assignment);
          
          results.push({
            success: true,
            action: 'direct_assignment',
            itemId: exactMatch.id,
            message: 'Exact SKU match found and assigned'
          });
          continue;
        }

        // Step 2: Try universal SKU match
        console.log('Looking for universal match...');
        const universalMatch = await findUniversalMatch(item.target_sku);
        console.log('Universal match result:', universalMatch);
        
        if (universalMatch) {
          console.log('Found universal match, assigning...');
          const assignment = await assignItemToOrder(universalMatch.id, item.id, order.id);
          console.log('Assignment complete:', assignment);

          results.push({
            success: true,
            action: 'universal_assignment',
            itemId: universalMatch.id,
            message: 'Universal SKU match found and assigned'
          });
          continue;
        }

        // Step 3: Create production request
        console.log('No matches found, creating production request...');
        const productionRequest = await createProductionRequest(
          item.target_sku,
          item.id,
          order.id
        );
        console.log('Created production request:', productionRequest);

        // Update order item status
        const updatedOrderItem = await prisma.orderItem.update({
          where: { id: item.id },
          data: { status: 'PENDING_PRODUCTION' }
        });
        console.log('Updated order item status:', updatedOrderItem);

        results.push({
          success: true,
          action: 'production_request',
          message: `Created production request for ${item.target_sku}`
        });
      } catch (itemError) {
        console.error('Error processing item:', {
          error: itemError,
          item,
          message: itemError instanceof Error ? itemError.message : 'Unknown error',
          stack: itemError instanceof Error ? itemError.stack : undefined
        });
        
        results.push({
          success: false,
          action: 'direct_assignment',
          message: 'Failed to process item',
          error: itemError instanceof Error ? itemError.message : 'Unknown error'
        });
      }
    }

    // Update order status based on results
    console.log('Processing results:', JSON.stringify(results, null, 2));
    
    // Determine new status based on the actions taken
    let newStatus: OrderStatus;
    const allResults = results.map(r => r.action);
    const hasProduction = allResults.some(r => r === 'production_request');
    const hasDirectAssignment = allResults.some(r => r === 'direct_assignment');
    const hasUniversalAssignment = allResults.some(r => r === 'universal_assignment');

    if (hasProduction && !hasDirectAssignment && !hasUniversalAssignment) {
      newStatus = OrderStatus.IN_PRODUCTION;
    } else if (!hasProduction && (hasDirectAssignment || hasUniversalAssignment)) {
      newStatus = OrderStatus.WASH;
    } else {
      // Mixed case - some items in production, some assigned
      newStatus = OrderStatus.PROCESSING;
    }

    console.log('Setting new order status:', newStatus);

    try {
      const updatedOrder = await prisma.order.update({
        where: { id: params.orderId },
        data: { 
          status: newStatus,
          metadata: {
            lastProcessed: new Date().toISOString(),
            processingResults: results
          }
        },
        include: {
          order_items: true
        }
      });
      console.log('Successfully updated order:', JSON.stringify(updatedOrder, null, 2));

      if (!results.every(r => r.success)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Some items failed to process',
            results,
            order: updatedOrder
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Order processed successfully',
        results,
        order: updatedOrder
      });
    } catch (updateError) {
      console.error('Error updating order status:', {
        error: updateError,
        orderId: params.orderId,
        newStatus,
        message: updateError instanceof Error ? updateError.message : 'Unknown error',
        stack: updateError instanceof Error ? updateError.stack : undefined
      });
      throw updateError;
    }

  } catch (error) {
    console.error('Error processing order:', {
      error,
      orderId: params.orderId,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process order'
      },
      { status: 500 }
    );
  }
} 