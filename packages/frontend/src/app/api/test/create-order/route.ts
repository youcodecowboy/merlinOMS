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

    return NextResponse.json({
      success: true,
      message: 'Test order created successfully',
      data: { customer, order, orderItem }
    });

  } catch (error) {
    console.error('Error creating test order:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test order'
      },
      { status: 500 }
    );
  }
} 