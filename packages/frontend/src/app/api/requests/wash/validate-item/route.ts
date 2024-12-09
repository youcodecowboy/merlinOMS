import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { requestId, qrCode, notes } = await req.json();

    if (!requestId || !qrCode) {
      return NextResponse.json(
        { error: 'Request ID and QR code are required' },
        { status: 400 }
      );
    }

    // Get the wash request
    const request = await prisma.request.findUnique({
      where: {
        id: requestId,
        type: 'WASH',
      },
      include: {
        item: true
      }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Wash request not found' },
        { status: 404 }
      );
    }

    // Verify the item exists and matches
    const item = await prisma.inventoryItem.findFirst({
      where: {
        qr_code: qrCode
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (request.item_id && request.item_id !== item.id) {
      return NextResponse.json(
        { error: 'QR code does not match the requested item' },
        { status: 400 }
      );
    }

    // Update request with validation data
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'IN_PROGRESS',
        metadata: {
          ...request.metadata,
          item_validation: {
            validated_at: new Date().toISOString(),
            qr_code: qrCode,
            notes: notes || null
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Item validated successfully',
      data: {
        request: updatedRequest,
        item
      }
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