import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PrismaClient, Request as PrismaRequest } from '@prisma/client';

interface SkuGroup {
  requests: PrismaRequest[];
  totalQuantity: number;
  metadata: Record<string, any>;
}

interface RequestWithItem extends PrismaRequest {
  item?: {
    id: string;
    qr_code: string;
  } | null;
}

export async function POST(req: NextRequest) {
  try {
    const { pattern_request_ids, batch_id } = await req.json();

    if (!pattern_request_ids?.length && !batch_id) {
      return NextResponse.json(
        { error: 'Either pattern_request_ids or batch_id is required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      let patternRequests: RequestWithItem[];
      
      if (batch_id) {
        // Get completed pattern requests by batch ID
        patternRequests = await tx.request.findMany({
          where: {
            batch_id: batch_id,
            type: 'PATTERN',
            status: 'COMPLETED'
          }
        });
        
        if (!patternRequests.length) {
          throw new Error('No completed pattern requests found for this batch');
        }
      } else {
        // Get pattern requests by IDs
        patternRequests = await tx.request.findMany({
          where: {
            id: { in: pattern_request_ids },
            type: 'PATTERN',
            status: { in: ['PENDING', 'COMPLETED'] }
          },
          include: {
            item: true
          }
        });

        if (patternRequests.length !== pattern_request_ids.length) {
          throw new Error('Some pattern requests are invalid or already processed');
        }
      }

      // Group requests by SKU for organization
      const skuGroups = patternRequests.reduce((acc: Record<string, SkuGroup>, request: RequestWithItem) => {
        const metadata = request.metadata as Record<string, any>;
        const sku = metadata?.universal_sku || metadata?.sku;
        const quantity = Number(metadata?.quantity) || 0;
        
        if (!sku) {
          throw new Error('Invalid SKU in pattern request');
        }
        
        if (!quantity || isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for SKU ${sku}`);
        }

        if (!acc[sku]) {
          acc[sku] = {
            requests: [],
            totalQuantity: 0,
            metadata: metadata
          };
        }
        acc[sku].requests.push(request);
        acc[sku].totalQuantity += quantity;
        return acc;
      }, {});

      // Create a cutting request for each SKU group
      const cuttingRequest = await tx.request.create({
        data: {
          type: 'CUTTING',
          status: 'PENDING',
          metadata: {
            pattern_request_ids: pattern_request_ids,
            sku_groups: Object.entries(skuGroups).map(([sku, data]) => ({
              sku,
              quantity: data.totalQuantity,
              pattern_requests: data.requests.map(r => r.id)
            })),
            item_ids: patternRequests.map(r => r.item_id).filter(Boolean)
          }
        }
      });

      return { cuttingRequest };
    });

    return NextResponse.json({
      success: true,
      message: 'Cutting request created successfully',
      data: result.cuttingRequest
    });

  } catch (error) {
    console.error('Error creating cutting request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create cutting request'
      },
      { status: 500 }
    );
  }
} 