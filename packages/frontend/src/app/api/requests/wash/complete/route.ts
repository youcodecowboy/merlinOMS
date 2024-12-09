import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { 
      requestId, 
      completedChecks, 
      qualityScore,
      binId,  // The wash bin ID where the item will be placed
      notes,
      washData 
    } = await req.json();

    if (!requestId || !completedChecks || !qualityScore || !binId) {
      return NextResponse.json(
        { error: 'All completion fields are required' },
        { status: 400 }
      );
    }

    // Get the wash request
    const request = await prisma.request.findUnique({
      where: {
        id: requestId,
        type: 'WASH',
      },
      include: {
        item: true
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
        { error: 'Request must be in progress to complete wash' },
        { status: 400 }
      );
    }

    // Verify wash was started
    const metadata = request.metadata as Record<string, any>;
    if (!metadata?.wash_data?.started_at) {
      return NextResponse.json(
        { error: 'Wash must be started before completion' },
        { status: 400 }
      );
    }

    // Get the wash bin to verify it exists
    const washBin = await prisma.location.findUnique({
      where: { id: binId, type: 'WASH_BIN' }
    });

    if (!washBin) {
      return NextResponse.json(
        { error: 'Invalid wash bin location' },
        { status: 400 }
      );
    }

    // Start a transaction to update both request and item
    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      // Update request status and add completion data
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...metadata,
            completion_data: {
              completed_at: new Date().toISOString(),
              completed_checks: completedChecks,
              quality_score: Number(qualityScore),
              notes,
              wash_data: washData,
              bin_id: binId
            }
          }
        }
      });

      // Update item status and location if it exists
      if (request.item_id) {
        const updatedItem = await tx.inventoryItem.update({
          where: { id: request.item_id },
          data: {
            status1: 'WASH', // Keep in WASH stage
            status2: 'IN_BIN', // Update status to show it's in a bin
            location_id: binId, // Update to new bin location
            metadata: {
              ...request.item?.metadata,
              wash_completed_at: new Date().toISOString(),
              last_wash_data: {
                type: washData.type,
                temperature: washData.temperature,
                quality_score: Number(qualityScore),
                completed_checks: completedChecks,
                bin_id: binId
              }
            }
          }
        });

        // Add item to bin's contents
        await tx.location.update({
          where: { id: binId },
          data: {
            metadata: {
              ...washBin.metadata,
              items: [
                ...(washBin.metadata?.items || []),
                {
                  id: updatedItem.id,
                  sku: updatedItem.sku,
                  added_at: new Date().toISOString()
                }
              ]
            }
          }
        });

        return { request: updatedRequest, item: updatedItem };
      }

      return { request: updatedRequest };
    });

    return NextResponse.json({
      success: true,
      message: 'Wash completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error completing wash:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete wash'
      },
      { status: 500 }
    );
  }
} 