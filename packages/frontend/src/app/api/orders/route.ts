import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { InventoryAssignmentService } from "@/lib/services/inventory-assignment.service"

// Validation schema for order creation
const createOrderSchema = z.object({
  customer_id: z.string(),
  items: z.array(z.object({
    target_sku: z.string(),
    quantity: z.number().min(1)
  }))
})

// Initialize services
const inventoryAssignmentService = new InventoryAssignmentService(prisma)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = createOrderSchema.parse(body)

    // Create order and process it in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          shopify_id: `SHOP-${Date.now()}`,
          customer_id: validatedData.customer_id,
          status: 'NEW',
          order_items: {
            create: validatedData.items.map(item => ({
              target_sku: item.target_sku,
              quantity: item.quantity,
              status: 'NEW'
            }))
          }
        },
        include: {
          order_items: true,
          customer: {
            include: {
              profile: true
            }
          }
        }
      })

      // Process each order item
      const processingResults = await Promise.all(
        order.order_items.map(async (item) => {
          const result = await inventoryAssignmentService.assignInventoryToOrder(
            order.id,
            '00000000-0000-0000-0000-000000000000' // System operator ID
          )
          return { item, result }
        })
      )

      // Update order status based on processing results
      const allSuccessful = processingResults.every(r => r.result.success)
      const anyProduction = processingResults.some(r => r.result.action === 'production_request')
      const anyDirectAssignment = processingResults.some(r => r.result.action === 'direct_assignment')

      let newStatus = 'NEW'
      if (allSuccessful) {
        if (anyProduction) {
          newStatus = 'PENDING_PRODUCTION'
        } else if (anyDirectAssignment) {
          newStatus = 'PROCESSING'
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: newStatus },
        include: {
          order_items: true,
          customer: {
            include: {
              profile: true
            }
          }
        }
      })

      return {
        order: updatedOrder,
        processing: processingResults
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Order created and processed successfully',
      ...result
    })

  } catch (error) {
    console.error('Error creating order:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const customer_id = searchParams.get('customer_id')

    // Build filter conditions
    const where: any = {}
    if (status) where.status = status
    if (customer_id) where.customer_id = customer_id

    const orders = await prisma.order.findMany({
      where,
      include: {
        order_items: true,
        customer: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      orders
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
} 