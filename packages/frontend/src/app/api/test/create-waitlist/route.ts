import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Get or create test customer
    let customer = await prisma.customer.findFirst();
    
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: 'test@example.com'
        }
      });
    }

    // Create test order
    const order = await prisma.order.create({
      data: {
        shopify_id: `TEST-${Date.now()}`,
        status: 'NEW',
        customer_id: customer.id,
        metadata: {
          source: 'TEST'
        }
      }
    });

    // Create order item
    const orderItem = await prisma.orderItem.create({
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

    // Create production request
    const productionRequest = await prisma.productionRequest.create({
      data: {
        sku: 'ST-32-X-36-RAW',
        quantity: 1,
        status: 'PENDING',
        metadata: {
          universal_sku: 'ST-32-X-36-RAW',
          order_item_id: orderItem.id
        }
      }
    });

    // Get next position in waitlist
    const lastWaitlistEntry = await prisma.productionWaitlist.findFirst({
      orderBy: {
        position: 'desc'
      }
    });

    const nextPosition = (lastWaitlistEntry?.position || 0) + 1;

    // Create waitlist entry
    const waitlistEntry = await prisma.orderItem.update({
      where: { id: orderItem.id },
      data: {
        waitlist_entry: {
          create: {
            position: nextPosition,
            production_request: {
              connect: {
                id: productionRequest.id
              }
            },
            metadata: {
              sku: 'ST-32-X-36-RAW',
              universal_sku: 'ST-32-X-36-RAW',
              priority: 'NORMAL'
            }
          }
        }
      },
      include: {
        waitlist_entry: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test waitlist entry created successfully',
      data: { customer, order, orderItem: waitlistEntry, productionRequest }
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