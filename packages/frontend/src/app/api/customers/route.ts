import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schema for customer creation
const createCustomerSchema = z.object({
  email: z.string().email("Invalid email address"),
  profile: z.object({
    metadata: z.object({
      firstName: z.string().min(2, "First name must be at least 2 characters"),
      lastName: z.string().min(2, "Last name must be at least 2 characters"),
      phoneNumber: z.string().optional(),
      company: z.string().optional(),
      totalOrders: z.number().default(0),
      lastOrderDate: z.string().optional(),
      lifetimeValue: z.number().default(0)
    })
  })
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate request body
    const validatedData = createCustomerSchema.parse(body)

    // Check if customer with email already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: validatedData.email }
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Customer with this email already exists" },
        { status: 400 }
      )
    }

    // Create customer and profile
    const customer = await prisma.customer.create({
      data: {
        email: validatedData.email,
        profile: {
          create: {
            metadata: validatedData.profile.metadata
          }
        }
      },
      include: {
        profile: true
      }
    })

    return NextResponse.json(customer, { status: 201 })

  } catch (error) {
    console.error('Error creating customer:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build where clause for search
    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { metadata: { path: ['firstName'], string_contains: search } } },
        { profile: { metadata: { path: ['lastName'], string_contains: search } } },
        { profile: { metadata: { path: ['company'], string_contains: search } } }
      ]
    } : {}

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          profile: true,
          orders: {
            select: {
              id: true,
              created_at: true,
              status: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.customer.count({ where })
    ])

    return NextResponse.json({
      customers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    })

  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      )
    }

    // Validate update data
    const validatedData = createCustomerSchema.partial().parse(updateData)

    // Update customer and profile
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        email: validatedData.email,
        profile: validatedData.profile ? {
          update: {
            metadata: validatedData.profile.metadata
          }
        } : undefined
      },
      include: {
        profile: true
      }
    })

    return NextResponse.json(customer)

  } catch (error) {
    console.error('Error updating customer:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    )
  }
} 