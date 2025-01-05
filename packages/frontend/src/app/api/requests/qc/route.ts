import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      where: {
        type: 'QC',
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            qr_code: true,
            location: true,
            status1: true,
            status2: true,
            metadata: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Transform the data for the frontend
    const transformedRequests = requests.map(request => ({
      id: request.id,
      status: request.status,
      item: request.item,
      assignedTo: request.assignedUser ? {
        id: request.assignedUser.id,
        email: request.assignedUser.email,
        name: request.assignedUser.profile ? 
          `${request.assignedUser.profile.firstName} ${request.assignedUser.profile.lastName}` :
          request.assignedUser.email
      } : null,
      metadata: {
        priority: request.metadata?.priority || 'MEDIUM',
        measurements: request.metadata?.measurements || {},
        visual_inspection: request.metadata?.visual_inspection || {},
        defects: request.metadata?.defects || [],
        batch_id: request.metadata?.batch_id,
        started_at: request.metadata?.started_at,
        completed_at: request.metadata?.completed_at
      },
      created_at: request.created_at
    }))

    return NextResponse.json({
      success: true,
      requests: transformedRequests
    })

  } catch (error) {
    console.error('Error fetching QC requests:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch QC requests'
      },
      { status: 500 }
    )
  }
} 