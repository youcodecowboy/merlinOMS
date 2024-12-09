import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qr_code, item_id } = body;

    if (!qr_code || !item_id) {
      return NextResponse.json(
        { error: 'QR code and item ID are required' },
        { status: 400 }
      );
    }

    // Find the destination bin by QR code
    const destination = await prisma.bin.findUnique({
      where: {
        qr_code: qr_code
      }
    });

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Check if bin is active
    if (!destination.is_active) {
      return NextResponse.json(
        { error: 'Destination bin is not active' },
        { status: 400 }
      );
    }

    // Check if bin has capacity
    if (destination.current_count >= destination.capacity) {
      return NextResponse.json(
        { error: 'Destination bin is at capacity' },
        { status: 400 }
      );
    }

    // Get the item to check compatibility
    const item = await prisma.inventoryItem.findUnique({
      where: {
        id: item_id
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Check if item SKU matches bin SKU (if bin has SKU restriction)
    if (destination.sku && item.sku !== destination.sku) {
      return NextResponse.json(
        { error: 'Item SKU does not match bin restrictions' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      destination_id: destination.id,
      name: destination.code,
      type: destination.type
    });

  } catch (error) {
    console.error('Error validating destination:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to validate destination'
      },
      { status: 500 }
    );
  }
} 