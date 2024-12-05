import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId

    // Find the wash request
    const washRequest = await prisma.request.findUnique({
      where: { 
        id: requestId,
        type: 'WASH'
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

    // Update wash request status
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'IN_PROGRESS',
        updated_at: new Date()
      }
    })

    // Create an event for tracking
    await prisma.event.create({
      data: {
        type: 'WASH_REQUEST_UPDATED',
        request_id: requestId,
        data: {
          previous_status: 'PENDING',
          new_status: 'IN_PROGRESS',
          timestamp: new Date().toISOString()
        }
      }
    })

    return NextResponse.json(updatedRequest)

  } catch (error) {
    console.error('Error processing wash request:', error)
    return NextResponse.json(
      { error: "Failed to process wash request" },
      { status: 500 }
    )
  }
} 