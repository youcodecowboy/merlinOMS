import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { order_item_id } = await req.json();

    if (!order_item_id) {
      return NextResponse.json(
        { error: 'Order item ID is required' },
        { status: 400 }
      );
    }

    // Start a transaction to handle all updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the order item
      const orderItem = await tx.orderItem.findUnique({
        where: { id: order_item_id }
      });

      if (!orderItem) {
        throw new Error('Order item not found');
      }

      // 2. First try to find an UNCOMMITTED item in STOCK
      let availableItem = await tx.inventoryItem.findFirst({
        where: {
          sku: orderItem.target_sku,
          status1: 'STOCK',
          status2: 'UNCOMMITTED'
        },
        orderBy: {
          created_at: 'asc' // Get oldest item first
        }
      });

      if (availableItem) {
        // Check if item is already assigned
        const existingAssignment = await tx.orderItem.findUnique({
          where: { assigned_item_id: availableItem.id }
        });

        if (existingAssignment) {
          // Skip this item and continue searching
          availableItem = await tx.inventoryItem.findFirst({
            where: {
              sku: orderItem.target_sku,
              status1: 'STOCK',
              status2: 'UNCOMMITTED',
              id: { not: availableItem.id }
            },
            orderBy: {
              created_at: 'asc'
            }
          });

          if (!availableItem) {
            // If no more items available, create production request
            const [style, waist, shape, , wash] = orderItem.target_sku.split('-');
            const universalWash = ['STA', 'IND'].includes(wash) ? 'RAW' : 'BRW';
            const universalSKU = `${style}-${waist}-${shape}-36-${universalWash}`;

            const productionRequest = await tx.request.create({
              data: {
                type: 'PRODUCTION',
                status: 'PENDING',
                order_id: orderItem.order_id,
                metadata: {
                  target_sku: orderItem.target_sku,
                  universal_sku: universalSKU,
                  quantity: 1
                }
              }
            });

            // Update order item status
            const updatedOrderItem = await tx.orderItem.update({
              where: { id: order_item_id },
              data: {
                status: 'IN_PRODUCTION'
              }
            });

            return {
              orderItem: updatedOrderItem,
              productionRequest,
              type: 'PRODUCTION_REQUEST'
            };
          }
        }

        // If we found an unassigned STOCK item, assign it immediately
        const updatedItem = await tx.inventoryItem.update({
          where: { id: availableItem.id },
          data: {
            status2: 'ASSIGNED',
            metadata: {
              ...availableItem.metadata,
              assigned_order_id: orderItem.order_id,
              assigned_at: new Date().toISOString()
            }
          }
        });

        // Update order item
        const updatedOrderItem = await tx.orderItem.update({
          where: { id: order_item_id },
          data: {
            assigned_item_id: availableItem.id,
            status: 'ASSIGNED'
          }
        });

        // Create wash request
        const washRequest = await tx.request.create({
          data: {
            type: 'WASH',
            status: 'PENDING',
            item_id: availableItem.id,
            order_id: orderItem.order_id,
            metadata: {
              sku: orderItem.target_sku,
              universal_sku: orderItem.metadata?.universal_sku,
              wash_code: availableItem.metadata?.wash || 'RAW',
              priority: 'NORMAL'
            }
          }
        });

        return { 
          orderItem: updatedOrderItem, 
          assignedItem: updatedItem,
          washRequest,
          type: 'IMMEDIATE_ASSIGNMENT'
        };
      }

      // 3. If no STOCK items, look for UNCOMMITTED items in PRODUCTION
      availableItem = await tx.inventoryItem.findFirst({
        where: {
          sku: orderItem.target_sku,
          status1: 'PRODUCTION',
          status2: 'UNCOMMITTED'
        },
        orderBy: {
          created_at: 'asc'
        }
      });

      if (!availableItem) {
        // Create production request
        const [style, waist, shape, , wash] = orderItem.target_sku.split('-');
        const universalWash = ['STA', 'IND'].includes(wash) ? 'RAW' : 'BRW';
        const universalSKU = `${style}-${waist}-${shape}-36-${universalWash}`;

        // Create production request
        const productionRequest = await tx.request.create({
          data: {
            type: 'PRODUCTION',
            status: 'PENDING',
            order_id: orderItem.order_id,
            metadata: {
              target_sku: orderItem.target_sku,
              universal_sku: universalSKU,
              quantity: 1
            }
          }
        });

        // Update order item status
        const updatedOrderItem = await tx.orderItem.update({
          where: { id: order_item_id },
          data: {
            status: 'IN_PRODUCTION',
            metadata: {
              ...orderItem.metadata,
              production_request_id: productionRequest.id
            }
          }
        });

        return {
          success: true,
          message: 'Created production request',
          data: {
            orderItem: updatedOrderItem,
            productionRequest,
            type: 'PRODUCTION_REQUEST'
          }
        };
      }

      // 4. Get next position in waitlist
      const lastWaitlistEntry = await tx.productionWaitlist.findFirst({
        orderBy: {
          position: 'desc'
        }
      });

      const nextPosition = (lastWaitlistEntry?.position || 0) + 1;

      // Create production request for waitlist
      const productionRequest = await tx.request.create({
        data: {
          type: 'PRODUCTION',
          status: 'PENDING',
          order_id: orderItem.order_id,
          metadata: {
            target_sku: orderItem.target_sku,
            universal_sku: orderItem.metadata?.universal_sku,
            quantity: 1
          }
        }
      });

      // 5. Create waitlist entry and update item status
      const waitlistEntry = await tx.orderItem.update({
        where: { id: order_item_id },
        data: {
          status: 'IN_PRODUCTION',
          metadata: {
            ...orderItem.metadata,
            production_request_id: productionRequest.id
          }
        }
      });

      // 6. Update item status to COMMITTED
      const updatedItem = await tx.inventoryItem.update({
        where: { id: availableItem.id },
        data: {
          status2: 'COMMITTED',
          metadata: {
            ...availableItem.metadata,
            committed_to_order_id: orderItem.order_id,
            committed_at: new Date().toISOString(),
            waitlist_position: nextPosition
          }
        }
      });

      return { 
        success: true,
        message: 'Added to production waitlist',
        data: {
          orderItem: waitlistEntry, 
          committedItem: updatedItem,
          productionRequest,
          type: 'PRODUCTION_REQUEST'
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error committing order item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to commit order item'
      },
      { status: 500 }
    );
  }
} 