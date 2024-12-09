import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const COLOR_MAPPINGS: Record<string, string> = {
  'STARDUST': 'STA',
  'INDIGO': 'IND',
  'ONYX': 'ONX',
  'JAGGER': 'JAG'
}

export async function POST(request: Request) {
  try {
    const { binQrCode } = await request.json()
    console.log('Scanning out bin:', binQrCode)

    // Find items in the bin location
    const items = await prisma.inventoryItem.findMany({
      where: {
        location: binQrCode // The bin name (e.g., "STARDUST") is used as the location
      }
    })
    console.log('Found items:', items)

    if (items.length === 0) {
      console.log('No items found in bin:', binQrCode)
      return NextResponse.json(
        { error: "No items found in bin" },
        { status: 404 }
      )
    }

    // Get the color code for the bin
    const binName = binQrCode.toUpperCase()
    const colorCode = COLOR_MAPPINGS[binName]
    console.log('Color mapping:', { binName, colorCode })
    
    if (!colorCode) {
      console.log('Invalid bin name:', binName)
      return NextResponse.json(
        { error: "Invalid bin name" },
        { status: 400 }
      )
    }

    // Update all items in the bin
    const updatePromises = items.map(item => {
      // Extract base SKU and update color code
      const skuParts = item.sku.split('-')
      skuParts[2] = colorCode // Update color code
      const newSku = skuParts.join('-')

      const metadata = {
        scanned_out_at: new Date().toISOString(),
        previous_sku: item.sku,
        previous_location: item.location
      }

      if (typeof item.metadata === 'object' && item.metadata !== null) {
        Object.assign(metadata, item.metadata)
      }

      return prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          location: 'LAUNDRY',
          sku: newSku,
          metadata
        }
      })
    })

    const updatedItems = await Promise.all(updatePromises)
    console.log('Updated items:', updatedItems)

    return NextResponse.json({
      success: true,
      itemsUpdated: items.length,
      binCode: binQrCode,
      items: updatedItems
    })

  } catch (error) {
    console.error("Error details:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to scan out bin",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 