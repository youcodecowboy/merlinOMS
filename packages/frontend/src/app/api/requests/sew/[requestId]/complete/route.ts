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
      // 1. Get the sewing request
      const sewingRequest = await tx.request.findUnique({
        where: {
          id: requestId,
          type: 'SEW',
          status: 'PENDING'
        }
      });

      if (!sewingRequest) {
        throw new Error('Sewing request not found or not in pending status');
      }

      // 2. Update the sewing request status and add completion metadata
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...sewingRequest.metadata,
            completion: {
              operatorId,
              notes,
              completed_at: new Date().toISOString()
            }
          }
        }
      });

      return { updatedRequest };
    });

    return NextResponse.json({
      success: true,
      message: 'Sewing request completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error completing sewing request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete sewing request'
      },
      { status: 500 }
    );
  }
} 