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
        current_bin: true,
        order_assignment: {
          include: {
            order: {
              include: {
                customer: {
                  include: {
                    profile: true
                  }
                },
                order_items: true
              }
            }
          }
        },
        requests: {
          orderBy: {
            created_at: 'desc'
          },
          include: {
            order: {
              include: {
                customer: {
                  include: {
                    profile: true
                  }
                }
              }
            }
          }
        },
        events: {
          orderBy: {
            created_at: 'desc'
          },
          include: {
            actor: true
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      )
    }

    console.log('Found item with events:', item.events)
    
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