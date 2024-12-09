import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function generateQRCode() {
  return crypto.randomBytes(16).toString('hex');
}

const WASH_TYPES = ['STARDUST', 'INDIGO', 'ONYX', 'JAGGER'] as const;
type WashType = typeof WASH_TYPES[number];

async function createTestWashFlow(washType: WashType) {
  // 1. Create a test order with an item that needs specific wash
  const order = await prisma.order.create({
    data: {
      shopify_id: `TEST-${Date.now()}-${washType}`,
      status: 'NEW',
      customer: {
        create: {
          email: `test-${Date.now()}-${washType}@example.com`
        }
      },
      order_items: {
        create: {
          target_sku: `TEST-SKU-${washType}`,
          quantity: 1,
          status: 'NEW'
        }
      }
    },
    include: {
      order_items: true
    }
  });

  console.log(`Created test order for ${washType}:`, order);

  // 2. Create an inventory item and assign it to the order
  const inventoryItem = await prisma.inventoryItem.create({
    data: {
      sku: `TEST-SKU-${washType}`,
      status1: 'STOCK',
      status2: 'UNCOMMITTED',
      location: 'WAREHOUSE',
      qr_code: generateQRCode(),
      order_assignment: {
        connect: {
          id: order.order_items[0].id
        }
      }
    }
  });

  console.log(`Created and assigned inventory item for ${washType}:`, inventoryItem);

  // 3. Create a wash request for the item
  const washRequest = await prisma.request.create({
    data: {
      type: 'WASH',
      status: 'PENDING',
      item_id: inventoryItem.id,
      order_id: order.id,
      metadata: {
        wash_type: washType,
        notes: `Test ${washType} wash request`
      }
    }
  });

  console.log(`Created wash request for ${washType}:`, washRequest);

  // 4. Complete the wash request and update item location
  const completedRequest = await prisma.request.update({
    where: {
      id: washRequest.id
    },
    data: {
      status: 'COMPLETED',
      metadata: {
        ...washRequest.metadata,
        completed_at: new Date().toISOString()
      }
    }
  });

  // Update the inventory item's location to the wash bin
  const updatedItem = await prisma.inventoryItem.update({
    where: {
      id: inventoryItem.id
    },
    data: {
      location: washType,
      status1: 'WASH',
      status2: 'COMPLETED',
      metadata: {
        added_at: new Date().toISOString(),
        wash_type: washType
      }
    }
  });

  console.log(`Completed wash request for ${washType}:`, completedRequest);
  console.log(`Updated inventory item for ${washType}:`, updatedItem);

  return {
    order,
    inventoryItem: updatedItem,
    washRequest: completedRequest
  };
}

async function findAvailableBin(sku: string) {
  // First try to find a bin specifically for this SKU
  const skuBin = await prisma.bin.findFirst({
    where: {
      sku: sku,
      type: 'STORAGE',
      is_active: true,
      current_count: {
        lt: prisma.bin.fields.capacity
      }
    }
  });

  if (skuBin) {
    return skuBin;
  }

  // If no SKU-specific bin, find any available storage bin
  const generalBin = await prisma.bin.findFirst({
    where: {
      sku: null,
      type: 'STORAGE',
      is_active: true,
      current_count: {
        lt: prisma.bin.fields.capacity
      }
    }
  });

  return generalBin;
}

export async function POST() {
  try {
    console.log('Starting wash bin test scenarios...');

    const results = await Promise.all(
      WASH_TYPES.map(washType => createTestWashFlow(washType))
    );

    console.log('All test scenarios completed successfully');

    return NextResponse.json({
      success: true,
      data: results.reduce((acc, result, index) => ({
        ...acc,
        [WASH_TYPES[index]]: result
      }), {})
    });

  } catch (error) {
    console.error('Error in wash bin test scenarios:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run test scenarios'
      },
      { status: 500 }
    );
  }
} 