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

      // 2. Update item status
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          status1: 'STOCK',
          metadata: {
            ...item.metadata,
            activated_at: new Date().toISOString()
          }
        }
      });

      // 3. Check if this item is committed to a waitlist entry
      if (item.status2 === 'COMMITTED') {
        const metadata = item.metadata as any;
        const orderId = metadata?.committed_to_order_id;

        if (orderId) {
          // Find the order item in waitlist
          const orderItem = await tx.orderItem.findFirst({
            where: {
              order_id: orderId,
              status: 'PENDING_ASSIGNMENT',
              waitlist_entry: {
                metadata: {
                  path: ['committed_item_id'],
                  equals: item.id
                }
              }
            },
            include: {
              waitlist_entry: true
            }
          });

          if (orderItem) {
            // Update order item status
            await tx.orderItem.update({
              where: { id: orderItem.id },
              data: {
                status: 'ASSIGNED',
                assigned_item_id: item.id
              }
            });

            // Delete waitlist entry
            if (orderItem.waitlist_entry) {
              await tx.productionWaitlist.delete({
                where: { id: orderItem.waitlist_entry.id }
              });
            }

            // Create wash request
            const washRequest = await tx.request.create({
              data: {
                type: 'WASH',
                status: 'PENDING',
                item_id: item.id,
                order_id: orderId,
                metadata: {
                  sku: item.sku,
                  universal_sku: item.metadata?.universal_sku,
                  wash_code: item.metadata?.wash || 'RAW',
                  priority: 'NORMAL'
                }
              }
            });

            return { updatedItem, orderItem, washRequest };
          }
        }
      }

      return { updatedItem };
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