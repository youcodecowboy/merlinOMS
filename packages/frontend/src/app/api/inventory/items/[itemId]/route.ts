import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    console.log('Fetching inventory item:', params.itemId)
    
    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.itemId },
      include: {
        current_bin: true
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      )
    }

    console.log('Found item:', item)
    
    return NextResponse.json({
      success: true,
      item
    })
  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 