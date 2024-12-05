import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching pending production requests...');
    
    const requests = await prisma.request.findMany({
      where: {
        type: 'PATTERN',
        status: 'PENDING'
      },
      include: {
        order: true
      },
      orderBy: [
        {
          created_at: 'asc' // Oldest first (FIFO)
        }
      ]
    });

    // Transform the data for the frontend
    const transformedRequests = requests.map(request => ({
      id: request.id,
      sku: request.metadata.universal_sku,
      quantity: request.metadata.quantity || 1,
      orderIds: request.metadata.order_ids || [],
      status: request.status,
      requiresApproval: request.metadata.requires_approval,
      createdAt: request.created_at,
      updatedAt: request.updated_at
    }));

    console.log(`Found ${requests.length} pending production requests`);
    
    return NextResponse.json({
      success: true,
      requests: transformedRequests
    });
  } catch (error) {
    console.error('Error fetching production requests:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch production requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 