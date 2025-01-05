import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or get test customer
      let customer = await tx.customer.findFirst();
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            email: 'test@example.com'
          }
        });
      }

      // 2. Create test order
      const order = await tx.order.create({
        data: {
          shopify_id: `TEST-${Date.now()}`,
          status: 'PENDING_PRODUCTION',
          customer_id: customer.id,
          metadata: {
            source: 'TEST'
          }
        }
      });

      // 3. Create order item
      const orderItem = await tx.orderItem.create({
        data: {
          order_id: order.id,
          target_sku: 'ST-32-X-36-RAW',
          quantity: 1,
          status: 'PENDING_ASSIGNMENT',
          metadata: {
            universal_sku: 'ST-32-X-36-RAW'
          }
        }
      });

      // 4. Create inventory item
      const inventoryItem = await tx.inventoryItem.create({
        data: {
          sku: 'ST-32-X-36-RAW',
          status1: 'PRODUCTION',
          status2: 'UNCOMMITTED',
          location: 'PRODUCTION',
          qr_code: `ST-32-X-36-RAW-${Date.now()}-test`,
          metadata: {
            universal_sku: 'ST-32-X-36-RAW',
            production_stage: 'PATTERN'
          }
        }
      });

      // 5. Create production request
      const productionRequest = await tx.productionRequest.create({
        data: {
          sku: 'ST-32-X-36-RAW',
          quantity: 1,
          status: 'PENDING',
          orderIdsJson: JSON.stringify([order.id]),
          type: 'PRODUCTION',
          requiresApproval: false
        }
      });

      // 6. Get next position in waitlist
      const lastWaitlistEntry = await tx.productionWaitlist.findFirst({
        orderBy: {
          position: 'desc'
        }
      });
      const nextPosition = (lastWaitlistEntry?.position || 0) + 1;

      // 7. Create waitlist entry
      const waitlistEntry = await tx.orderItem.update({
        where: { id: orderItem.id },
        data: {
          waitlist_entry: {
            create: {
              position: nextPosition,
              production_request: {
                connect: {
                  id: productionRequest.id
                }
              }
            }
          }
        },
        include: {
          waitlist_entry: true
        }
      });

      // 8. Update inventory item to be committed to this order
      const updatedItem = await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          status2: 'COMMITTED',
          metadata: {
            ...inventoryItem.metadata,
            committed_to_order_id: order.id,
            committed_at: new Date().toISOString(),
            waitlist_position: nextPosition
          }
        }
      });

      return {
        customer,
        order,
        orderItem: waitlistEntry,
        productionRequest,
        inventoryItem: updatedItem
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Test waitlist entry created successfully',
      data: result
    });

  } catch (error) {
    console.error('Error creating test waitlist entry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test waitlist entry'
      },
      { status: 500 }
    );
  }
} 