import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function createTestCustomer() {
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: 'test@example.com'
      }
    });
  }
  return customer;
}

async function createInventoryItem(data: {
  sku: string;
  status1: string;
  status2: string;
  qr_code: string;
  metadata?: any;
}) {
  return prisma.inventoryItem.create({
    data: {
      sku: data.sku,
      status1: data.status1,
      status2: data.status2,
      location: 'STORAGE',
      qr_code: `${data.qr_code}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      metadata: {
        universal_sku: data.sku.split('-').slice(0, -1).join('-'),
        ...data.metadata
      }
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    console.log('Starting Complex Multi-Unit Test');
    
    // Create test customer
    const customer = await createTestCustomer();
    console.log('Created customer:', customer.id);
    
    // Create stock items with different statuses
    const stockItems = await Promise.all([
      // Exact match, UNCOMMITTED
      createInventoryItem({
        sku: 'ST-32-X-36-STA',
        status1: 'STOCK',
        status2: 'UNCOMMITTED',
        qr_code: 'TEST_STOCK_6A'
      }),
      // Universal match, UNCOMMITTED
      createInventoryItem({
        sku: 'ST-32-X-36-RAW',
        status1: 'STOCK',
        status2: 'UNCOMMITTED',
        qr_code: 'TEST_STOCK_6B'
      }),
      // Different wash, UNCOMMITTED
      createInventoryItem({
        sku: 'ST-32-X-36-BRW',
        status1: 'STOCK',
        status2: 'UNCOMMITTED',
        qr_code: 'TEST_STOCK_6C'
      })
    ]);
    console.log('Created stock items:', stockItems.map(item => item.id));

    // Create order with multiple items of different SKUs
    const order = await prisma.order.create({
      data: {
        shopify_id: `TEST-COMPLEX-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: 'NEW',
        customer_id: customer.id,
        metadata: { 
          source: 'TEST',
          scenario: 'COMPLEX_MULTI_UNIT'
        }
      }
    });
    console.log('Created order:', order.id);

    // Create order items with different SKUs and quantities
    const orderItems = await Promise.all([
      // Exact match to first stock item
      prisma.orderItem.create({
        data: {
          order_id: order.id,
          target_sku: 'ST-32-X-36-STA',
          quantity: 1,
          status: 'PENDING_ASSIGNMENT',
          metadata: {
            universal_sku: 'ST-32-X-36'
          }
        }
      }),
      // Universal match (RAW can match to BRW)
      prisma.orderItem.create({
        data: {
          order_id: order.id,
          target_sku: 'ST-32-X-36-RAW',
          quantity: 1,
          status: 'PENDING_ASSIGNMENT',
          metadata: {
            universal_sku: 'ST-32-X-36'
          }
        }
      }),
      // No direct match, should go to production
      prisma.orderItem.create({
        data: {
          order_id: order.id,
          target_sku: 'ST-32-X-36-IND',
          quantity: 1,
          status: 'PENDING_ASSIGNMENT',
          metadata: {
            universal_sku: 'ST-32-X-36'
          }
        }
      }),
      // Another RAW request that should go to production
      prisma.orderItem.create({
        data: {
          order_id: order.id,
          target_sku: 'ST-32-X-36-RAW',
          quantity: 1,
          status: 'PENDING_ASSIGNMENT',
          metadata: {
            universal_sku: 'ST-32-X-36'
          }
        }
      })
    ]);
    console.log('Created order items:', orderItems.map(item => item.id));

    // Commit order items one at a time with delay between
    const commitResults = [];
    for (const item of orderItems) {
      console.log('Committing order item:', item.id);
      const result = await fetch('http://localhost:3003/api/orders/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_item_id: item.id })
      }).then(res => res.json());
      commitResults.push(result);
      console.log('Commit result:', result);
      // Add delay between commits to ensure proper ordering
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify results
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        order_items: {
          include: {
            assigned_item: true,
            waitlist_entry: true
          }
        }
      }
    });
    console.log('Updated order:', updatedOrder);

    // Get production requests
    const productionRequests = await prisma.request.findMany({
      where: {
        type: 'PRODUCTION',
        order_id: order.id
      }
    });
    console.log('Production requests:', productionRequests);

    // Get wash requests
    const washRequests = await prisma.request.findMany({
      where: {
        type: 'WASH',
        order_id: order.id
      }
    });
    console.log('Wash requests:', washRequests);

    return NextResponse.json({
      success: true,
      message: 'Complex multi-unit test completed',
      data: {
        scenario: 'Complex Multi-Unit Order',
        stockItems,
        order: updatedOrder,
        commitResults,
        productionRequests,
        washRequests
      }
    });

  } catch (error) {
    console.error('Error running complex test:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run complex test'
      },
      { status: 500 }
    );
  }
} 