import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { request_ids } = await req.json();

    if (!request_ids?.length) {
      return NextResponse.json(
        { error: 'Request IDs are required' },
        { status: 400 }
      );
    }

    // Start a transaction to handle all updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get all cutting requests
      const cuttingRequests = await tx.request.findMany({
        where: {
          id: { in: request_ids },
          type: 'CUTTING',
          status: 'PENDING'
        }
      });

      if (cuttingRequests.length !== request_ids.length) {
        throw new Error('Some cutting requests are invalid or already processed');
      }

      // 2. Update cutting requests to IN_PROGRESS
      const updatedRequests = await Promise.all(
        cuttingRequests.map(async (request) => {
          const metadata = request.metadata as any;
          
          // Update cutting request status
          const updatedRequest = await tx.request.update({
            where: { id: request.id },
            data: {
              status: 'IN_PROGRESS',
              metadata: {
                ...metadata,
                started_at: new Date().toISOString()
              }
            }
          });

          // Also update any associated pattern requests
          if (metadata?.pattern_request_ids?.length) {
            await tx.request.updateMany({
              where: {
                id: { in: metadata.pattern_request_ids }
              },
              data: {
                status: 'IN_PROGRESS',
                metadata: {
                  cutting_started_at: new Date().toISOString()
                }
              }
            });
          }

          return updatedRequest;
        })
      );

      return { updatedRequests };
    });

    return NextResponse.json({
      success: true,
      message: 'Cutting process started successfully',
      data: result
    });

  } catch (error) {
    console.error('Error starting cutting process:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start cutting process'
      },
      { status: 500 }
    );
  }
} 