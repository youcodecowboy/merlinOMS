import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TEST_SKUS, createTestInventoryItem } from '@/lib/test-data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { status1, status2, location, binId } = body;

    // Create test inventory item with realistic SKU
    const testItem = createTestInventoryItem({
      sku: TEST_SKUS.STANDARD.RAW,
      status1,
      status2,
      location,
      binId
    });

    // Create test inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        ...testItem,
        events: {
          create: [
            {
              type: 'ITEM_CREATED',
              actor: { connect: { id: '2d40fc18-e02a-41f1-8c4e-92f770133029' } }, // Default to warehouse user
              metadata: {
                sku: testItem.sku,
                initial_status1: testItem.status1,
                initial_status2: testItem.status2,
                initial_location: testItem.location,
                qr_code: testItem.qr_code,
                test_item: true
              }
            },
            {
              type: 'QR_GENERATED',
              actor: { connect: { id: '2d40fc18-e02a-41f1-8c4e-92f770133029' } },
              metadata: {
                qr_code: testItem.qr_code,
                sku: testItem.sku,
                test_item: true
              }
            }
          ]
        }
      },
      include: {
        events: true
      }
    });

    return NextResponse.json({
      success: true,
      item
    });

  } catch (error) {
    console.error('Error creating test inventory item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test inventory item'
      },
      { status: 500 }
    );
  }
} 