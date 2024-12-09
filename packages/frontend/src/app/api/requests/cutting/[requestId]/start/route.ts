import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;
    const { started_at } = await request.json();

    // Start a transaction to handle all updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the cutting request
      const cuttingRequest = await tx.request.findUnique({
        where: {
          id: requestId,
          type: 'CUTTING',
          status: 'PENDING'
        }
      });

      if (!cuttingRequest) {
        throw new Error('Cutting request not found or not in pending status');
      }

      // 2. Update the cutting request status and add start time to metadata
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'IN_PROGRESS',
          metadata: {
            ...cuttingRequest.metadata,
            started_at,
            cutting_start_time: started_at
          }
        }
      });

      // 3. Create a timeline entry for starting the cutting process
      await tx.requestTimeline.create({
        data: {
          request_id: requestId,
          step: 'CUTTING_PROCESS',
          status: 'IN_PROGRESS',
          operator_id: cuttingRequest.assigned_to || 'SYSTEM',
          metadata: {
            started_at
          },
          startedAt: new Date(started_at)
        }
      });

      return { updatedRequest };
    });

    return NextResponse.json({
      success: true,
      message: 'Cutting process started successfully',
      data: result
    });

  } catch (error) {
    console.error('Error starting cutting request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start cutting request'
      },
      { status: 500 }
    );
  }
} 