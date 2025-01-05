import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { inspection } = body

    // Validate inspection data
    if (!inspection || typeof inspection !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid inspection data' },
        { status: 400 }
      )
    }

    // Get the request and validate it's a QC request
    const qcRequest = await prisma.request.findUnique({
      where: { id: params.requestId },
      include: { item: true }
    })

    if (!qcRequest || qcRequest.type !== 'QC') {
      return NextResponse.json(
        { success: false, error: 'Invalid QC request' },
        { status: 404 }
      )
    }

    // Update request with visual inspection results
    const updatedRequest = await prisma.request.update({
      where: { id: params.requestId },
      data: {
        metadata: {
          ...qcRequest.metadata,
          visual_inspection: {
            ...inspection,
            recorded_at: new Date().toISOString(),
            recorded_by: session.user.id
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })

  } catch (error) {
    console.error('Error recording visual inspection:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to record visual inspection'
      },
      { status: 500 }
    )
  }
} 