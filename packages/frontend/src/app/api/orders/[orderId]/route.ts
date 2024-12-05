import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: params.orderId
      },
      include: {
        order_items: {
          include: {
            assigned_item: true
          }
        },
        customer: {
          include: {
            profile: true
          }
        },
        events: {
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      order
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// Update order status based on its items
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        order_items: {
          include: {
            assigned_item: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Calculate new status based on items
    const hasUnassignedItems = order.order_items.some(item => !item.assigned_item_id)
    const hasProductionItems = order.order_items.some(item => 
      item.assigned_item?.status1 === 'PRODUCTION'
    )
    const hasWashItems = order.order_items.some(item => 
      item.status === 'ASSIGNED' && 
      item.assigned_item?.status2 === 'ASSIGNED'
    )

    let newStatus = order.status
    if (hasUnassignedItems) {
      newStatus = 'NEW'
    } else if (hasProductionItems) {
      newStatus = 'IN_PRODUCTION'
    } else if (hasWashItems) {
      newStatus = 'IN_WASH'
    } else if (order.order_items.every(item => item.assigned_item_id)) {
      newStatus = 'ASSIGNED'
    }

    // Update order status if changed
    if (newStatus !== order.status) {
      const updatedOrder = await prisma.order.update({
        where: { id: params.orderId },
        data: { 
          status: newStatus,
          events: {
            create: {
              type: 'STATUS_CHANGED',
              message: `Order status changed from ${order.status} to ${newStatus}`,
              created_by: 'system',
              metadata: {
                oldStatus: order.status,
                newStatus: newStatus
              }
            }
          }
        },
        include: {
          order_items: {
            include: {
              assigned_item: true
            }
          },
          events: {
            orderBy: {
              created_at: 'desc'
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        order: updatedOrder
      })
    }

    return NextResponse.json({
      success: true,
      order: order
    })

  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
} 