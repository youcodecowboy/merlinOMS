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
    const { passed } = body

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

    // Start a transaction to update request and create next steps
    const result = await prisma.$transaction(async (tx) => {
      // Update the QC request as completed
      const updatedRequest = await tx.request.update({
        where: { id: params.requestId },
        data: {
          status: passed ? 'COMPLETED' : 'FAILED',
          metadata: {
            ...qcRequest.metadata,
            completed_at: new Date().toISOString(),
            completed_by: session.user.id,
            passed
          }
        }
      })

      // If QC passed, create a finishing request
      if (passed) {
        await tx.request.create({
          data: {
            type: 'FINISHING',
            status: 'PENDING',
            item_id: qcRequest.item_id,
            metadata: {
              qc_request_id: params.requestId
            }
          }
        })
      }
      // If QC failed, create a recovery request
      else {
        await tx.request.create({
          data: {
            type: 'RECOVERY',
            status: 'PENDING',
            item_id: qcRequest.item_id,
            metadata: {
              qc_request_id: params.requestId,
              defects: qcRequest.metadata.defects
            }
          }
        })
      }

      // Update the item's status
      await tx.inventoryItem.update({
        where: { id: qcRequest.item_id },
        data: {
          status1: passed ? 'FINISHING' : 'RECOVERY',
          status2: passed ? 'PENDING' : 'DEFECTIVE'
        }
      })

      return updatedRequest
    })

    return NextResponse.json({
      success: true,
      request: result
    })

  } catch (error) {
    console.error('Error completing QC request:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete QC request'
      },
      { status: 500 }
    )
  }
} 