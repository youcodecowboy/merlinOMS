import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { qr_code } = await request.json()

    if (!qr_code) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      )
    }

    // Find the item by QR code
    const item = await prisma.inventoryItem.findUnique({
      where: { qr_code },
      include: {
        requests: {
          where: {
            type: 'QC',
            status: {
              in: ['PENDING', 'IN_PROGRESS']
            }
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Check if item is in laundry location and doesn't have an active QC request
    if (item.location === 'LAUNDRY' && item.requests.length === 0) {
      // Create QC request
      const qcRequest = await prisma.request.create({
        data: {
          type: 'QC',
          status: 'PENDING',
          item_id: item.id,
          metadata: {
            priority: 'MEDIUM',
            measurements: {},
            visual_inspection: {},
            defects: [],
            started_at: null,
            completed_at: null
          }
        }
      })

      // Update item status
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          status1: 'QC',
          status2: 'PENDING'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'QC request created',
        request: qcRequest
      })
    }

    // If item is not in laundry or already has a QC request, just return the item
    return NextResponse.json({
      success: true,
      message: 'Item scanned',
      item
    })

  } catch (error) {
    console.error('Error scanning item:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scan item'
      },
      { status: 500 }
    )
  }
} 