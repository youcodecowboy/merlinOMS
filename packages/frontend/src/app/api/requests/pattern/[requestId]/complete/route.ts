import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;
    const { operatorId, notes } = await request.json();

    // Start a transaction to handle all updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the pattern request
      const patternRequest = await tx.request.findUnique({
        where: {
          id: requestId,
          type: 'PATTERN',
          status: 'PENDING'
        }
      });

      if (!patternRequest) {
        throw new Error('Pattern request not found or not in pending status');
      }

      const metadata = patternRequest.metadata as any;
      const sku = metadata?.sku;
      const quantity = Number(metadata?.quantity) || 0;
      const createdItems: any[] = [];

      if (!sku || !quantity) {
        throw new Error('Invalid SKU or quantity in pattern request');
      }

      // Create inventory items for this pattern request
      for (let i = 0; i < quantity; i++) {
        const qrCode = `${sku}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Create inventory item
        const item = await tx.inventoryItem.create({
          data: {
            sku,
            status1: 'PRODUCTION',
            status2: 'UNCOMMITTED',
            location: 'CUTTING',
            qr_code: qrCode,
            metadata: {
              universal_sku: sku.split('-').slice(0, -1).join('-'),
              production_stage: 'PATTERN',
              pattern_data: {
                operatorId,
                notes,
                completed_at: new Date().toISOString()
              }
            }
          }
        });
        createdItems.push(item);
      }

      // 2. Update the pattern request status and add completion metadata
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...patternRequest.metadata,
            completion: {
              operatorId,
              notes,
              completed_at: new Date().toISOString()
            },
            item_ids: createdItems.map(item => item.id)
          }
        }
      });

      return { updatedRequest, createdItems };
    });

    return NextResponse.json({
      success: true,
      message: 'Pattern request completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error completing pattern request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete pattern request'
      },
      { status: 500 }
    );
  }
} 