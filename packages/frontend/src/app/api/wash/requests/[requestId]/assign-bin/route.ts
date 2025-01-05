import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface WashBinMetadata {
  capacity: number;
  description: string;
  items: Array<{
    id: string;
    sku: string;
    added_at: string;
  }>;
}

interface RequestMetadata {
  sku?: string;
  priority?: string;
  wash_code?: string;
  universal_sku?: string;
  bin_assignment?: {
    bin_id: string;
    bin_name: string;
    assigned_at: string;
  };
  item_validation?: {
    notes?: string | null;
    qr_code: string;
    validated_at: string;
  };
}

interface ItemMetadata {
  universal_sku?: string;
  bin_assignment?: {
    bin_id: string;
    bin_name: string;
    assigned_at: string;
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId;
    const { binQrCode } = await req.json();

    if (!requestId || !binQrCode) {
      return NextResponse.json(
        { error: "Request ID and bin QR code are required" },
        { status: 400 }
      );
    }

    // Find the wash request
    const request = await prisma.request.findUnique({
      where: {
        id: requestId,
        type: 'WASH'
      },
      include: {
        item: true
      }
    });

    if (!request) {
      return NextResponse.json(
        { error: "Wash request not found" },
        { status: 404 }
      );
    }

    if (request.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: "Request must be in progress to assign bin" },
        { status: 400 }
      );
    }

    // Find the wash bin
    const washBin = await prisma.location.findFirst({
      where: {
        name: binQrCode,
        type: 'WASH_BIN',
        status: 'ACTIVE'
      }
    });

    if (!washBin) {
      return NextResponse.json(
        { error: "Wash bin not found" },
        { status: 404 }
      );
    }

    // Start a transaction to update both request and item
    const result = await prisma.$transaction(async (tx) => {
      // Update request with bin assignment
      const updatedRequest = await tx.request.update({
        where: { id: requestId },
        data: {
          metadata: {
            ...(request.metadata as RequestMetadata),
            bin_assignment: {
              bin_id: washBin.id,
              bin_name: washBin.name,
              assigned_at: new Date().toISOString()
            }
          }
        }
      });

      // Update item location and status if it exists
      if (request.item_id) {
        const updatedItem = await tx.inventoryItem.update({
          where: { id: request.item_id },
          data: {
            location: washBin.name,
            status1: 'WASH',
            status2: 'IN_BIN',
            metadata: {
              ...(request.item?.metadata as ItemMetadata),
              bin_assignment: {
                bin_id: washBin.id,
                bin_name: washBin.name,
                assigned_at: new Date().toISOString()
              }
            }
          }
        });

        // Update bin metadata to include the item
        const currentMetadata = washBin.metadata as WashBinMetadata;
        await tx.location.update({
          where: { id: washBin.id },
          data: {
            metadata: {
              ...currentMetadata,
              items: [
                ...(currentMetadata?.items || []),
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
      message: 'Item assigned to wash bin successfully',
      data: result
    });

  } catch (error) {
    console.error('Error assigning to wash bin:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to assign to wash bin'
      },
      { status: 500 }
    );
  }
} 