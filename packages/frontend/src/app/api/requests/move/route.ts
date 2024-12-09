import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function findBestStorageLocation(sku: string) {
  // First try to find a bin that already has this SKU
  const existingBin = await prisma.bin.findFirst({
    where: {
      items: {
        some: {
          sku: sku,
          status1: 'STOCK'
        }
      },
      current_count: {
        lt: prisma.bin.fields.capacity
      }
    },
    orderBy: {
      current_count: 'desc' // Prefer bins that are more full to keep SKUs together
    }
  });

  if (existingBin) {
    return existingBin;
  }

  // If no bin with same SKU found, find an empty bin
  const emptyBin = await prisma.bin.findFirst({
    where: {
      current_count: 0,
      type: 'STORAGE'
    },
    orderBy: {
      code: 'asc' // Use first available empty bin
    }
  });

  if (emptyBin) {
    return emptyBin;
  }

  // If no empty bin, find bin with most available space
  const availableBin = await prisma.bin.findFirst({
    where: {
      type: 'STORAGE',
      current_count: {
        lt: prisma.bin.fields.capacity
      }
    },
    orderBy: {
      current_count: 'asc' // Use bin with most available space
    }
  });

  return availableBin;
}

export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      where: {
        type: 'MOVE'
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            location: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      requests: requests.map(request => ({
        id: request.id,
        status: request.status,
        item: request.item || {
          id: request.metadata?.item_id as string || 'UNKNOWN',
          sku: request.metadata?.sku as string || 'UNKNOWN',
          location: request.metadata?.source as string || 'UNKNOWN'
        },
        created_at: request.created_at,
        metadata: {
          source: request.metadata?.source || request.item?.location || 'UNKNOWN',
          destination: request.metadata?.destination_name || request.metadata?.destination || 'TBD',
          destination_id: request.metadata?.destination_id || '',
          notes: request.metadata?.notes || request.metadata?.reason || ''
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching move requests:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch move requests'
      },
      { status: 500 }
    );
  }
}

export async function createMoveRequest(itemId: string) {
  return prisma.$transaction(async (tx) => {
    // Get the item
    const item = await tx.inventoryItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    if (item.status1 !== 'STOCK' || item.status2 !== 'UNCOMMITTED') {
      throw new Error('Item must be in STOCK status and UNCOMMITTED to create a move request');
    }

    // Find the best storage location
    const destinationBin = await findBestStorageLocation(item.sku);
    if (!destinationBin) {
      throw new Error('No available storage bins found');
    }

    // Create the move request
    const moveRequest = await tx.request.create({
      data: {
        type: 'MOVE',
        status: 'PENDING',
        item: {
          connect: { id: itemId }
        },
        metadata: {
          source: item.location,
          destination: destinationBin.code,
          destination_id: destinationBin.id,
          sku: item.sku,
          created_at: new Date().toISOString(),
          reason: 'Automatic placement after production'
        }
      }
    });

    // Log the event
    await tx.event.create({
      data: {
        type: 'MOVE_REQUEST_CREATED',
        metadata: {
          item_id: itemId,
          source: item.location,
          destination: destinationBin.code,
          reason: 'Automatic placement after production'
        }
      }
    });

    return moveRequest;
  });
}

export async function POST() {
  try {
    // Create a new move request
    const request = await prisma.request.create({
      data: {
        type: 'MOVE',
        status: 'PENDING',
        metadata: {
          created_at: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      request
    });

  } catch (error) {
    console.error('Error creating move request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create move request'
      },
      { status: 500 }
    );
  }
} 