import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { qr_code } = await request.json();

    if (!qr_code) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      );
    }

    // Start a transaction to handle all updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the item by QR code
      const item = await tx.inventoryItem.findUnique({
        where: { qr_code }
      });

      if (!item) {
        throw new Error('Item not found');
      }

      if (item.status1 !== 'PRODUCTION') {
        throw new Error('Item must be in PRODUCTION status to be activated');
      }

      // 2. Check if item is committed to an order
      const metadata = item.metadata as any;
      const committedOrderId = metadata?.committed_to_order_id;

      if (item.status2 === 'COMMITTED' && committedOrderId) {
        // Item is committed to an order - do hard assignment
        const updatedItem = await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            status1: 'STOCK',
            status2: 'ASSIGNED',
            metadata: {
              ...metadata,
              activated_at: new Date().toISOString()
            }
          }
        });

        // Find the order item waiting for this item
        const orderItem = await tx.orderItem.findFirst({
          where: {
            order_id: committedOrderId,
            status: 'PENDING_ASSIGNMENT'
          }
        });

        if (orderItem) {
          // Update order item status and create assignment
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: {
              status: 'ASSIGNED',
              assigned_item_id: item.id
            }
          });

          // Create wash request
          const washRequest = await tx.request.create({
            data: {
              type: 'WASH',
              status: 'PENDING',
              item_id: item.id,
              order_id: committedOrderId,
              metadata: {
                sku: item.sku,
                universal_sku: metadata?.universal_sku,
                wash_code: metadata?.wash || 'RAW',
                priority: 'NORMAL'
              }
            }
          });

          return {
            success: true,
            action: 'ASSIGNED_TO_ORDER',
            item: updatedItem,
            orderItem,
            washRequest
          };
        }
      }

      // Item is not committed - just activate it
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          status1: 'STOCK',
          status2: 'UNCOMMITTED',
          metadata: {
            ...metadata,
            activated_at: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        action: 'ACTIVATED',
        item: updatedItem
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Item activated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error activating item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to activate item'
      },
      { status: 500 }
    );
  }
} 