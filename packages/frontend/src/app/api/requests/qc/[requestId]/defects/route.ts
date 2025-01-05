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
    const { defects } = body

    // Validate defects data
    if (!defects || !Array.isArray(defects)) {
      return NextResponse.json(
        { success: false, error: 'Invalid defects data' },
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

    // Update request with defects
    const updatedRequest = await prisma.request.update({
      where: { id: params.requestId },
      data: {
        metadata: {
          ...qcRequest.metadata,
          defects: defects.map(defect => ({
            ...defect,
            recorded_at: new Date().toISOString(),
            recorded_by: session.user.id
          }))
        }
      }
    })

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })

  } catch (error) {
    console.error('Error recording defects:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to record defects'
      },
      { status: 500 }
    )
  }
} 