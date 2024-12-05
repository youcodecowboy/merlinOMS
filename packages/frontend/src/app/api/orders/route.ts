import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { OrderStatus, OrderItemStatus } from "@prisma/client"

// Validation schema for order creation
const createOrderSchema = z.object({
  customer_id: z.string(),
  items: z.array(z.object({
    target_sku: z.string(),
    quantity: z.number().min(1)
  }))
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = createOrderSchema.parse(body)

    // Create order
    const order = await prisma.order.create({
      data: {
        shopify_id: `SHOP-${Date.now()}`,
        customer_id: validatedData.customer_id,
        status: OrderStatus.NEW,
        order_items: {
          create: validatedData.items.map(item => ({
            target_sku: item.target_sku,
            quantity: item.quantity,
            status: OrderItemStatus.PENDING_ASSIGNMENT
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

    // Automatically process the order
    const processResponse = await fetch(`${req.nextUrl.origin}/api/orders/${order.id}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operatorId: '00000000-0000-0000-0000-000000000000', // System operator ID
      }),
    })

    const processResult = await processResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Order created and processed successfully',
      order: {
        ...order,
        status: processResult.newStatus,
        processing: processResult
      }
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