import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { binId: string } }
) {
  try {
    const bin = await prisma.bin.findUnique({
      where: {
        id: params.binId
      },
      include: {
        items: {
          select: {
            id: true,
            sku: true,
            qr_code: true,
            metadata: true,
            created_at: true
          }
        }
      }
    })

    if (!bin) {
      return NextResponse.json({
        success: false,
        error: "Bin not found"
      }, { status: 404 })
    }

    // Transform the data to include added_at from metadata
    const items = bin.items.map(item => ({
      id: item.id,
      sku: item.sku,
      qr_code: item.qr_code || item.id,
      added_at: (item.metadata as any)?.added_at || item.created_at.toISOString()
    }))

    return NextResponse.json({
      success: true,
      bin: {
        ...bin,
        items
      }
    })
  } catch (error) {
    console.error("Error fetching bin:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch bin"
    }, { status: 500 })
  }
} 