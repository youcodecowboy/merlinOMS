import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId

    // Find the wash request with the associated item
    const washRequest = await prisma.request.findUnique({
      where: { 
        id: requestId,
        type: 'WASH'
      },
      include: {
        item: true
      }
    })

    if (!washRequest) {
      return NextResponse.json(
        { error: "Wash request not found" },
        { status: 404 }
      )
    }

    if (washRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: "Wash request is not in PENDING status" },
        { status: 400 }
      )
    }

    // Start a transaction to update request, item, and create event
    const [updatedRequest, updatedItem, event] = await prisma.$transaction([
      // Update wash request status
      prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'IN_PROGRESS',
          updated_at: new Date()
        }
      }),
      // Update item status
      prisma.inventoryItem.update({
        where: { id: washRequest.item_id! },
        data: {
          status1: 'WASH',
          status2: 'IN_PROGRESS',
          updated_at: new Date()
        }
      }),
      // Create event for tracking
      prisma.event.create({
        data: {
          type: 'WASH_REQUEST_UPDATED',
          request_id: requestId,
          item_id: washRequest.item_id!,
          data: {
            previous_status: 'PENDING',
            new_status: 'IN_PROGRESS',
            previous_item_status: `${washRequest.item?.status1}/${washRequest.item?.status2}`,
            new_item_status: 'WASH/IN_PROGRESS',
            timestamp: new Date().toISOString()
          }
        }
      })
    ])

    return NextResponse.json({
      request: updatedRequest,
      item: updatedItem,
      event
    })

  } catch (error) {
    console.error('Error processing wash request:', error)
    return NextResponse.json(
      { error: "Failed to process wash request" },
      { status: 500 }
    )
  }
} 