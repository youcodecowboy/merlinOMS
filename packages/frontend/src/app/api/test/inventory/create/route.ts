import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sku, status1, status2 } = body;

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU is required' },
        { status: 400 }
      );
    }

    // Create test inventory item with events in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create test inventory item
      const item = await tx.inventoryItem.create({
        data: {
          sku,
          status1: status1 || 'STOCK',
          status2: status2 || 'UNCOMMITTED',
          location: 'PRODUCTION',
          qr_code: `TEST-QR-${Date.now()}`,
          metadata: {
            created_at: new Date().toISOString(),
            test_item: true
          }
        },
        include: {
          events: true
        }
      });

      // Create initial creation event
      const event = await tx.event.create({
        data: {
          type: 'ITEM_CREATED',
          item: { connect: { id: item.id } },
          actor: { connect: { id: '2d40fc18-e02a-41f1-8c4e-92f770133029' } }, // Default to warehouse user
          metadata: {
            sku: item.sku,
            initial_status1: item.status1,
            initial_status2: item.status2,
            initial_location: item.location,
            qr_code: item.qr_code,
            test_item: true
          }
        }
      });

      // Create QR code generation event
      const qrEvent = await tx.event.create({
        data: {
          type: 'QR_GENERATED',
          item: { connect: { id: item.id } },
          actor: { connect: { id: '2d40fc18-e02a-41f1-8c4e-92f770133029' } },
          metadata: {
            qr_code: item.qr_code,
            sku: item.sku,
            test_item: true
          }
        }
      });

      return { ...item, events: [event, qrEvent] };
    });

    return NextResponse.json({
      success: true,
      item: result
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