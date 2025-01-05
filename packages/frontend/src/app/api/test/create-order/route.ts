import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TEST_CUSTOMERS, TEST_SKUS, createTestOrder } from '@/lib/test-data';

export async function POST(request: Request) {
  try {
    // Create test order with realistic data
    const testCustomer = TEST_CUSTOMERS[0];
    const testOrder = createTestOrder({
      customerId: testCustomer.id,
      items: [
        {
          sku: TEST_SKUS.STANDARD.RAW,
          quantity: 1,
          target_sku: TEST_SKUS.STANDARD.STARDUST
        },
        {
          sku: TEST_SKUS.SLIM.RAW,
          quantity: 2,
          target_sku: TEST_SKUS.SLIM.INDIGO
        }
      ]
    });

    // Create customer if doesn't exist
    const customer = await prisma.customer.upsert({
      where: { id: testCustomer.id },
      update: {},
      create: {
        id: testCustomer.id,
        email: testCustomer.email,
        profile: {
          create: {
            firstName: testCustomer.profile.firstName,
            lastName: testCustomer.profile.lastName,
            metadata: {
              phone: testCustomer.profile.phone,
              address: testCustomer.profile.address
            }
          }
        }
      }
    });

    // Create order with items
    const order = await prisma.order.create({
      data: {
        id: testOrder.id,
        order_number: testOrder.order_number,
        shopify_id: testOrder.shopify_id,
        status: testOrder.status,
        customer: {
          connect: { id: customer.id }
        },
        order_items: {
          create: testOrder.items.map(item => ({
            sku: item.sku,
            target_sku: item.target_sku,
            quantity: item.quantity,
            status: item.status
          }))
        },
        metadata: testOrder.metadata
      },
      include: {
        customer: {
          include: {
            profile: true
          }
        },
        order_items: true
      }
    });

    return NextResponse.json({
      success: true,
      order
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