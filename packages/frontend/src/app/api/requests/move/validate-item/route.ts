import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qr_code } = body;

    if (!qr_code) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      );
    }

    // Find the item by QR code
    const item = await prisma.inventoryItem.findUnique({
      where: {
        qr_code: qr_code
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Check if item is already in a move request
    const existingRequest = await prisma.request.findFirst({
      where: {
        item_id: item.id,
        type: 'MOVE',
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Item already has an active move request' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      item_id: item.id,
      sku: item.sku,
      location: item.location
    });

  } catch (error) {
    console.error('Error validating item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to validate item'
      },
      { status: 500 }
    );
  }
} 