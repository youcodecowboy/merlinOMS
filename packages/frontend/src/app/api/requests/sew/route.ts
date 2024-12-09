import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { cutting_request_id } = await req.json();

    if (!cutting_request_id) {
      return NextResponse.json(
        { error: 'Cutting request ID is required' },
        { status: 400 }
      );
    }

    // Start a transaction to handle all updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the completed cutting request
      const cuttingRequest = await tx.request.findUnique({
        where: {
          id: cutting_request_id,
          type: 'CUTTING',
          status: 'COMPLETED'
        }
      });

      if (!cuttingRequest) {
        throw new Error('Cutting request not found or not completed');
      }

      const metadata = cuttingRequest.metadata as Record<string, any>;
      const skus = metadata.skus || [];
      const sewingRequests = [];

      // Create sewing requests for each item in the SKUs
      for (const skuData of skus) {
        const quantity = skuData.quantity || 0;
        
        // Create individual sewing requests for each item
        for (let i = 0; i < quantity; i++) {
          const sewingRequest = await tx.request.create({
            data: {
              type: 'SEW',
              status: 'PENDING',
              batch_id: cuttingRequest.batch_id,
              metadata: {
                sku: skuData.sku,
                universal_sku: skuData.universal_sku,
                size: skuData.size,
                style: skuData.style,
                cutting_request_id: cutting_request_id,
                cutting_completion: metadata.completion,
                unit_number: i + 1,
                total_units: quantity,
                order_ids: skuData.order_ids || []
              }
            }
          });
          sewingRequests.push(sewingRequest);
        }
      }

      return { sewingRequests };
    });

    return NextResponse.json({
      success: true,
      message: 'Sewing requests created successfully',
      data: result
    });

  } catch (error) {
    console.error('Error creating sewing requests:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create sewing requests'
      },
      { status: 500 }
    );
  }
} 