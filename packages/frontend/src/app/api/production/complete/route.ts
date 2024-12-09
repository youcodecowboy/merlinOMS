import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Start a transaction to update everything
    const result = await prisma.$transaction(async (tx) => {
      // Get current item
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!item) {
        throw new Error('Item not found');
      }

      if (item.status1 !== 'PRODUCTION') {
        throw new Error('Item must be in PRODUCTION status');
      }

      // Update the item's status to STOCK
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          status1: 'STOCK',
          metadata: {
            ...item.metadata,
            production_completed_at: new Date().toISOString()
          }
        }
      });

      // If item is UNCOMMITTED, create a move request
      let moveRequest = null;
      if (updatedItem.status2 === 'UNCOMMITTED') {
        // First try to find a test bin with matching SKU
        const testBin = await tx.bin.findFirst({
          where: {
            sku: updatedItem.sku,
            type: 'STORAGE',
            metadata: {
              path: ['test_bin'],
              equals: true
            }
          }
        });

        if (testBin) {
          moveRequest = await tx.request.create({
            data: {
              type: 'MOVE',
              status: 'PENDING',
              item: {
                connect: { id: itemId }
              },
              assigned_to: '2d40fc18-e02a-41f1-8c4e-92f770133029', // Warehouse user ID
              metadata: {
                source: updatedItem.location,
                destination: testBin.code,
                destination_id: testBin.id,
                sku: updatedItem.sku,
                created_at: new Date().toISOString(),
                assigned_at: new Date().toISOString(),
                reason: 'Automatic placement after production'
              }
            }
          });
        } else {
          // Find the best storage location
          const destinationBin = await tx.bin.findFirst({
            where: {
              items: {
                some: {
                  sku: updatedItem.sku,
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

          if (!destinationBin) {
            // If no bin with same SKU found, find an empty bin
            const emptyBin = await tx.bin.findFirst({
              where: {
                current_count: 0,
                type: 'STORAGE'
              },
              orderBy: {
                code: 'asc' // Use first available empty bin
              }
            });

            if (!emptyBin) {
              throw new Error('No available storage bins found');
            }

            moveRequest = await tx.request.create({
              data: {
                type: 'MOVE',
                status: 'PENDING',
                item: {
                  connect: { id: itemId }
                },
                assigned_to: '2d40fc18-e02a-41f1-8c4e-92f770133029', // Warehouse user ID
                metadata: {
                  source: updatedItem.location,
                  destination: emptyBin.code,
                  destination_id: emptyBin.id,
                  sku: updatedItem.sku,
                  created_at: new Date().toISOString(),
                  assigned_at: new Date().toISOString(),
                  reason: 'Automatic placement after production'
                }
              }
            });
          } else {
            moveRequest = await tx.request.create({
              data: {
                type: 'MOVE',
                status: 'PENDING',
                item: {
                  connect: { id: itemId }
                },
                assigned_to: '2d40fc18-e02a-41f1-8c4e-92f770133029', // Warehouse user ID
                metadata: {
                  source: updatedItem.location,
                  destination: destinationBin.code,
                  destination_id: destinationBin.id,
                  sku: updatedItem.sku,
                  created_at: new Date().toISOString(),
                  assigned_at: new Date().toISOString(),
                  reason: 'Automatic placement after production'
                }
              }
            });
          }
        }
      }

      return {
        success: true,
        item: updatedItem,
        moveRequest
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error completing production:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete production'
      },
      { status: 500 }
    );
  }
} 