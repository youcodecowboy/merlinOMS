import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;
    const body = await request.json();
    const { item_id, destination_id } = body;

    if (!item_id || !destination_id) {
      return NextResponse.json(
        { error: 'Item ID and destination ID are required' },
        { status: 400 }
      );
    }

    // Get the destination bin
    const destination = await prisma.bin.findUnique({
      where: {
        id: destination_id
      }
    });

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Start a transaction to update everything
    const result = await prisma.$transaction(async (tx) => {
      // Update the request status
      const updatedRequest = await tx.request.update({
        where: {
          id: requestId
        },
        data: {
          status: 'COMPLETED',
          metadata: {
            completed_at: new Date().toISOString(),
            destination_id,
            destination_name: destination.code
          }
        }
      });

      // Get current item for previous location
      const currentItem = await tx.inventoryItem.findUnique({
        where: { id: item_id }
      });

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Update the item's location and bin
      const updatedItem = await tx.inventoryItem.update({
        where: {
          id: item_id
        },
        data: {
          location: destination.code,
          bin_id: destination.id,
          metadata: {
            moved_at: new Date().toISOString(),
            previous_location: currentItem.location
          }
        }
      });

      // Increment the bin's current count
      await tx.bin.update({
        where: {
          id: destination_id
        },
        data: {
          current_count: {
            increment: 1
          }
        }
      });

      // Create a bin history entry
      await tx.binHistory.create({
        data: {
          bin_id: destination_id,
          action: 'ITEM_ADDED',
          metadata: {
            item_id,
            sku: updatedItem.sku,
            moved_at: new Date().toISOString()
          }
        }
      });

      return {
        request: updatedRequest,
        item: updatedItem,
        destination_name: destination.code
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error completing move request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete move request'
      },
      { status: 500 }
    );
  }
} 