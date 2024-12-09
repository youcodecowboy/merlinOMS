import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { requestId, washType, temperature, notes } = await req.json();

    if (!requestId || !washType || !temperature) {
      return NextResponse.json(
        { error: 'Request ID, wash type, and temperature are required' },
        { status: 400 }
      );
    }

    // Get the wash request
    const request = await prisma.request.findUnique({
      where: {
        id: requestId,
        type: 'WASH',
      }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Wash request not found' },
        { status: 404 }
      );
    }

    if (request.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Request must be in progress to start wash' },
        { status: 400 }
      );
    }

    // Verify item validation was completed
    const metadata = request.metadata as Record<string, any>;
    if (!metadata?.item_validation?.validated_at) {
      return NextResponse.json(
        { error: 'Item must be validated before starting wash' },
        { status: 400 }
      );
    }

    // Update request with wash data
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        metadata: {
          ...metadata,
          wash_data: {
            started_at: new Date().toISOString(),
            wash_type: washType,
            temperature: Number(temperature),
            notes: notes || null
          }
        }
      }
    });

    // Update item status
    if (request.item_id) {
      await prisma.inventoryItem.update({
        where: { id: request.item_id },
        data: {
          status1: 'WASH',
          status2: 'IN_PROGRESS',
          metadata: {
            wash_started_at: new Date().toISOString(),
            wash_type: washType,
            wash_temperature: Number(temperature)
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Wash started successfully',
      data: {
        request: updatedRequest
      }
    });

  } catch (error) {
    console.error('Error starting wash:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start wash'
      },
      { status: 500 }
    );
  }
} 