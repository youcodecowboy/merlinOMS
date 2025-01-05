import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schema for customer profile
const customerProfileSchema = z.object({
  metadata: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().min(1, "Phone number is required"),
    address: z.string().min(1, "Address is required")
  })
})

// Validation schema for customer
const customerSchema = z.object({
  email: z.string().email("Invalid email address"),
  profile: customerProfileSchema
})

// Validation schema for order items
const orderItemSchema = z.object({
  target_sku: z.string().regex(/^[A-Z]{2}-\d{2}-[A-Z]-\d{2}-[A-Z]{3}$/, {
    message: "Invalid SKU format. Expected format: ST-32-X-36-RAW"
  }),
  quantity: z.number().min(1, "Quantity must be at least 1")
})

// Validation schema for order creation
const createOrderSchema = z.object({
  shopify_id: z.string().optional(),
  customer: customerSchema,
  order_items: z.array(orderItemSchema).min(1, "At least one order item is required")
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate request body
    const validatedData = createOrderSchema.parse(body)

    // Create order and process it in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update customer
      const customer = await tx.customer.upsert({
        where: { email: validatedData.customer.email },
        update: {
          profile: {
            upsert: {
              create: {
                metadata: validatedData.customer.profile.metadata
              },
              update: {
                metadata: validatedData.customer.profile.metadata
              }
            }
          }
        },
        create: {
          email: validatedData.customer.email,
          profile: {
            create: {
              metadata: validatedData.customer.profile.metadata
            }
          }
        },
        include: {
          profile: true
        }
      })

      // Create order
      const order = await tx.order.create({
        data: {
          shopify_id: validatedData.shopify_id || `SHOP-${Date.now()}`,
          customer_id: customer.id,
          status: 'NEW',
          order_items: {
            create: validatedData.order_items.map(item => ({
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

      // For each order item, try to find matching inventory
      const processingResults = await Promise.all(
        order.order_items.map(async (orderItem) => {
          // Try exact match first
          const exactMatch = await tx.inventoryItem.findFirst({
            where: {
              sku: orderItem.target_sku,
              status1: 'STOCK',
              status2: 'UNCOMMITTED'
            }
          })

          if (exactMatch) {
            // Update item status
            await tx.inventoryItem.update({
              where: { id: exactMatch.id },
              data: {
                status2: 'ASSIGNED',
                order_assignment: {
                  connect: { id: orderItem.id }
                }
              }
            })

            // Update order item status
            await tx.orderItem.update({
              where: { id: orderItem.id },
              data: {
                status: 'ASSIGNED',
                assigned_item_id: exactMatch.id
              }
            })

            // Create wash request
            const washRequest = await tx.request.create({
              data: {
                type: 'WASH',
                status: 'PENDING',
                item_id: exactMatch.id,
                order_id: order.id,
                metadata: {
                  sku: exactMatch.sku,
                  universal_sku: orderItem.target_sku.split('-').slice(0, -1).join('-'),
                  wash_code: orderItem.target_sku.split('-').pop(),
                  priority: 'NORMAL'
                }
              }
            })

            return {
              success: true,
              action: 'direct_assignment',
              item: exactMatch,
              request: washRequest
            }
          }

          // Try universal match
          const [style, waist, shape, length, targetWash] = orderItem.target_sku.split('-')
          const universalSku = `${style}-${waist}-${shape}-${length}-RAW`

          const universalMatch = await tx.inventoryItem.findFirst({
            where: {
              sku: universalSku,
              status1: 'STOCK',
              status2: 'UNCOMMITTED'
            }
          })

          if (universalMatch) {
            // Update item status
            await tx.inventoryItem.update({
              where: { id: universalMatch.id },
              data: {
                status2: 'ASSIGNED',
                order_assignment: {
                  connect: { id: orderItem.id }
                }
              }
            })

            // Update order item status
            await tx.orderItem.update({
              where: { id: orderItem.id },
              data: {
                status: 'ASSIGNED',
                assigned_item_id: universalMatch.id
              }
            })

            // Create wash request
            const washRequest = await tx.request.create({
              data: {
                type: 'WASH',
                status: 'PENDING',
                item_id: universalMatch.id,
                order_id: order.id,
                metadata: {
                  sku: universalMatch.sku,
                  universal_sku: orderItem.target_sku.split('-').slice(0, -1).join('-'),
                  wash_code: targetWash,
                  priority: 'NORMAL'
                }
              }
            })

            return {
              success: true,
              action: 'universal_assignment',
              item: universalMatch,
              request: washRequest
            }
          }

          // No match found - create production request
          const productionRequest = await tx.request.create({
            data: {
              type: 'PRODUCTION',
              status: 'PENDING',
              order_id: order.id,
              metadata: {
                target_sku: orderItem.target_sku,
                universal_sku: `${style}-${waist}-${shape}-${length}`,
                quantity: orderItem.quantity
              }
            }
          })

          // Update order item status
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: { status: 'IN_PRODUCTION' }
          })

          return {
            success: true,
            action: 'production_request',
            request: productionRequest
          }
        })
      )

      // Update order status based on processing results
      const anyProduction = processingResults.some(r => r.action === 'production_request')
      const anyDirectAssignment = processingResults.some(r => ['direct_assignment', 'universal_assignment'].includes(r.action))

      const newStatus = anyProduction ? 'PENDING_PRODUCTION' : anyDirectAssignment ? 'PROCESSING' : 'NEW'

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
      const issues = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          issues 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to create order"
      },
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