import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function generateQRCode() {
  return crypto.randomBytes(16).toString('hex');
}

async function findAvailableBin(sku: string) {
  // First try to find a bin specifically for this SKU
  const skuBins = await prisma.bin.findMany({
    where: {
      type: 'STORAGE',
      is_active: true,
      sku: sku
    }
  });

  // Find the first SKU bin with available capacity
  const availableSkuBin = skuBins.find(bin => bin.current_count < bin.capacity);
  if (availableSkuBin) {
    return availableSkuBin;
  }

  // If no SKU-specific bin is available, look for general bins
  const generalBins = await prisma.bin.findMany({
    where: {
      type: 'STORAGE',
      is_active: true,
      sku: {
        startsWith: 'GENERAL-'
      }
    }
  });

  // Find the first general bin with available capacity
  return generalBins.find(bin => bin.current_count < bin.capacity);
}

export async function POST() {
  try {
    console.log('Starting item creation and move test scenario...');

    // 1. Create a test item
    const sku = `TEST-SKU-${Date.now()}`;
    const item = await prisma.inventoryItem.create({
      data: {
        sku: sku,
        status1: 'PRODUCTION',
        status2: 'UNCOMMITTED',
        location: 'PRODUCTION',
        qr_code: generateQRCode(),
        metadata: {
          created_at: new Date().toISOString()
        }
      }
    });

    console.log('Created test item:', item);

    // 2. Find an available storage bin
    const destinationBin = await findAvailableBin(sku);
    if (!destinationBin) {
      throw new Error('No available storage bins found');
    }

    console.log('Found destination bin:', destinationBin);

    // 3. Create a move request
    const moveRequest = await prisma.request.create({
      data: {
        type: 'MOVE',
        status: 'PENDING',
        item_id: item.id,
        metadata: {
          source: 'PRODUCTION',
          destination: destinationBin.code,
          notes: 'Automatic placement after production'
        }
      }
    });

    console.log('Created move request:', moveRequest);

    // 4. Complete the move request
    const result = await prisma.$transaction(async (tx) => {
      // Update the request status
      const updatedRequest = await tx.request.update({
        where: {
          id: moveRequest.id
        },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...moveRequest.metadata,
            completed_at: new Date().toISOString()
          }
        }
      });

      // Get current item for previous location
      const currentItem = await tx.inventoryItem.findUnique({
        where: { id: item.id }
      });

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Update the item's location and bin
      const updatedItem = await tx.inventoryItem.update({
        where: {
          id: item.id
        },
        data: {
          location: destinationBin.code,
          bin_id: destinationBin.id,
          status1: 'STOCK',
          status2: 'UNCOMMITTED',
          metadata: {
            ...currentItem.metadata,
            moved_at: new Date().toISOString(),
            previous_location: currentItem.location
          }
        }
      });

      // Increment the bin's current count
      await tx.bin.update({
        where: {
          id: destinationBin.id
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
          bin_id: destinationBin.id,
          action: 'ITEM_ADDED',
          metadata: {
            item_id: item.id,
            sku: item.sku,
            moved_at: new Date().toISOString(),
            source: 'PRODUCTION'
          }
        }
      });

      return {
        request: updatedRequest,
        item: updatedItem
      };
    });

    console.log('Move completed:', result);

    return NextResponse.json({
      success: true,
      data: {
        item: result.item,
        moveRequest: result.request,
        destinationBin
      }
    });

  } catch (error) {
    console.error('Error in test scenario:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run test scenario'
      },
      { status: 500 }
    );
  }
} 