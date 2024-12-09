import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { BinType } from "@prisma/client"

const BINS_PER_SHELF = {
  10: 4,
  25: 2,
  50: 1,
} as const

export async function GET() {
  try {
    const bins = await prisma.bin.findMany({
      orderBy: [
        { zone: 'asc' },
        { created_at: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      bins
    })
  } catch (error) {
    console.error("Error fetching bins:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch bins"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { capacity, zone, rack, shelf } = await request.json()

    // Validate input
    if (!capacity || !zone || !rack || !shelf) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields"
      }, { status: 400 })
    }

    if (![10, 25, 50].includes(capacity)) {
      return NextResponse.json({
        success: false,
        error: "Invalid capacity"
      }, { status: 400 })
    }

    if (zone < 1 || zone > 5) {
      return NextResponse.json({
        success: false,
        error: "Invalid zone"
      }, { status: 400 })
    }

    if (rack < 1 || rack > 10) {
      return NextResponse.json({
        success: false,
        error: "Invalid rack"
      }, { status: 400 })
    }

    if (shelf < 1 || shelf > 5) {
      return NextResponse.json({
        success: false,
        error: "Invalid shelf"
      }, { status: 400 })
    }

    // Check if we've exceeded the bin limit for this shelf
    const existingBins = await prisma.bin.findMany({
      where: {
        zone: zone.toString(),
        metadata: {
          path: ["rack"],
          equals: rack.toString()
        },
        AND: {
          metadata: {
            path: ["shelf"],
            equals: shelf.toString()
          }
        }
      }
    })

    if (existingBins.length >= BINS_PER_SHELF[capacity as keyof typeof BINS_PER_SHELF]) {
      return NextResponse.json({
        success: false,
        error: `Maximum number of ${capacity}-capacity bins reached for this shelf`
      }, { status: 400 })
    }

    // Generate bin ID
    const binId = `${capacity}-${zone}-${rack}-${shelf}-${existingBins.length + 1}`

    // Create bin
    const bin = await prisma.bin.create({
      data: {
        id: binId,
        code: binId,
        sku: binId,
        type: BinType.STORAGE,
        zone: zone.toString(),
        capacity: capacity,
        current_count: 0,
        is_active: true,
        metadata: {
          rack: rack.toString(),
          shelf: shelf.toString(),
          position: (existingBins.length + 1).toString()
        }
      }
    })

    // Generate QR code for the bin
    const qrCode = await prisma.bin.update({
      where: { id: bin.id },
      data: {
        qr_code: binId
      }
    })

    return NextResponse.json({
      success: true,
      bin: qrCode
    })
  } catch (error) {
    console.error("Error creating bin:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create bin"
    }, { status: 500 })
  }
} 