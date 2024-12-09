import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;
    const { fabricCode, fabricConsumption, shadeCode, notes } = await request.json();

    // Validate the request
    if (!fabricCode || !fabricConsumption || !shadeCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start a transaction to handle all updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the cutting request
      const cuttingRequest = await tx.request.findUnique({
        where: {
          id: requestId,
          type: 'CUTTING',
          status: 'IN_PROGRESS'
        }
      });

      if (!cuttingRequest) {
        throw new Error('Cutting request not found or not in progress');
      }

      const metadata = cuttingRequest.metadata as any;
      const patternRequestIds = metadata?.pattern_request_ids || [];
      const sewingRequests: any[] = [];

      // Get all pattern requests and their associated items
      const patternRequests = await tx.request.findMany({
        where: {
          id: { in: patternRequestIds },
          type: 'PATTERN',
          status: 'COMPLETED'
        }
      });

      // Collect all item IDs from pattern requests
      const itemIds = patternRequests.reduce((acc: string[], request) => {
        const metadata = request.metadata as any;
        return acc.concat(metadata?.item_ids || []);
      }, []);

      // Get all items
      const items = await tx.inventoryItem.findMany({
        where: {
          id: { in: itemIds }
        }
      });

      // Update items and create sewing requests
      for (const item of items) {
        // Update item status and metadata
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            location: 'SEWING',
            metadata: {
              ...item.metadata,
              production_stage: 'SEWING',
              cutting_data: {
                fabricCode,
                fabricConsumption,
                shadeCode,
                notes,
                completed_at: new Date().toISOString()
              }
            }
          }
        });

        // Create sewing request for this item
        const sewingRequest = await tx.request.create({
          data: {
            type: 'SEW',
            status: 'PENDING',
            item_id: item.id,
            metadata: {
              sku: item.sku,
              qr_code: item.qr_code,
              cutting_request_id: requestId,
              cutting_completed_at: new Date().toISOString(),
              cutting_completion_data: {
                fabricCode,
                fabricConsumption,
                shadeCode,
                notes
              }
            }
          }
        });
        sewingRequests.push(sewingRequest);
      }

      // 2. Update the cutting request status and add completion metadata
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...cuttingRequest.metadata,
            completion: {
              fabricCode,
              fabricConsumption,
              shadeCode,
              notes,
              completed_at: new Date().toISOString()
            },
            cutting_duration_minutes: cuttingRequest.metadata?.started_at 
              ? Math.round((new Date().getTime() - new Date(cuttingRequest.metadata.started_at).getTime()) / (1000 * 60))
              : null
          }
        }
      });

      // Update the timeline entry for the cutting process
      await tx.requestTimeline.update({
        where: {
          request_id_step: {
            request_id: requestId,
            step: 'CUTTING_PROCESS'
          }
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: {
            ...cuttingRequest.metadata?.completion,
            duration_minutes: cuttingRequest.metadata?.started_at 
              ? Math.round((new Date().getTime() - new Date(cuttingRequest.metadata.started_at).getTime()) / (1000 * 60))
              : null
          }
        }
      });

      return { updatedRequest, sewingRequests };
    });

    return NextResponse.json({
      success: true,
      message: 'Cutting request completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error completing cutting request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete cutting request'
      },
      { status: 500 }
    );
  }
} 