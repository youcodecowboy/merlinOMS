import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schema for wash request
const washRequestSchema = z.object({
  sku: z.string().regex(/^[A-Z]{2}-\d{2}-[A-Z]-\d{2}-[A-Z]{3}$/, {
    message: "Invalid SKU format. Expected format: ST-32-X-32-IND"
  }),
  source_location: z.string().min(1, "Source location is required"),
  target_bin: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  order_id: z.string().optional(),
})

interface WashRequest {
  id: string;
  type: 'WASH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
  item?: {
    id: string;
    sku: string;
    location: string;
    status1: string;
    status2: string;
  };
  order?: {
    id: string;
    shopify_id: string;
    status: string;
    order_items: {
      id: string;
      target_sku: string;
      quantity: number;
      status: string;
    }[];
  };
  metadata: any;
  priority?: string;
  order_id?: string;
}

export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/wash/requests - Starting request')
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const order_id = searchParams.get('order_id')

    // Build filter conditions
    const where: any = {
      type: 'WASH'
    }
    if (status) where.status = status
    if (priority) {
      where.metadata = {
        path: ['priority'],
        equals: priority
      }
    }
    if (order_id) where.order_id = order_id

    console.log('Querying wash requests with where:', where)
    const washRequests = await prisma.request.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            location: true,
            status1: true,
            status2: true,
            current_bin: true
          }
        },
        order: {
          select: {
            id: true,
            shopify_id: true,
            status: true,
            order_items: {
              select: {
                id: true,
                target_sku: true,
                quantity: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: [
        { created_at: 'asc' }
      ],
      take: 100
    })
    console.log('Found wash requests:', washRequests.length)

    // Transform the data to match the expected format
    const formattedRequests = washRequests.map((req: WashRequest) => ({
      id: req.id,
      sku: req.item?.sku || '',
      status: req.status,
      created_at: req.created_at,
      updated_at: req.updated_at,
      source_location: req.item?.location || '',
      target_bin: req.metadata?.target_bin,
      priority: req.metadata?.priority || 'LOW',
      order_id: req.order?.shopify_id || req.order_id || '',
      item_status: req.item ? `${req.item.status1}/${req.item.status2}` : '',
      order_status: req.order?.status || '',
      target_sku: req.order?.order_items[0]?.target_sku || ''
    }))

    if (formattedRequests.length === 0) {
      console.log('No wash requests found')
      return NextResponse.json([])
    }

    console.log('Returning formatted requests:', formattedRequests.length)
    return NextResponse.json(formattedRequests)

  } catch (error) {
    console.error('Error fetching wash requests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch wash requests" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/wash/requests - Starting request')
    const body = await req.json()
    console.log('Request body:', body)

    // Validate request body
    const validatedData = washRequestSchema.parse(body)
    console.log('Validated data:', validatedData)

    // Check if target bin exists and has capacity (if provided)
    if (validatedData.target_bin) {
      console.log('Checking bin:', validatedData.target_bin)
      const bin = await prisma.bin.findUnique({
        where: { id: validatedData.target_bin }
      })

      if (!bin) {
        console.log('Bin not found')
        return NextResponse.json(
          { error: "Target bin not found" },
          { status: 404 }
        )
      }

      if (bin.current_count >= bin.capacity) {
        console.log('Bin capacity exceeded')
        return NextResponse.json(
          { error: "Bin capacity exceeded" },
          { status: 400 }
        )
      }
    }

    console.log('Creating wash request')
    // Create wash request
    const washRequest = await prisma.request.create({
      data: {
        type: 'WASH',
        status: 'PENDING',
        metadata: {
          target_bin: validatedData.target_bin,
          source_location: validatedData.source_location,
          priority: validatedData.priority
        },
        order_id: validatedData.order_id
      }
    })
    console.log('Created wash request:', washRequest)

    // Update bin count if target_bin was provided
    if (validatedData.target_bin) {
      console.log('Updating bin count')
      await prisma.bin.update({
        where: { id: validatedData.target_bin },
        data: {
          current_count: {
            increment: 1
          }
        }
      })
    }

    return NextResponse.json(washRequest, { status: 201 })

  } catch (error) {
    console.error('Error creating wash request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create wash request" },
      { status: 500 }
    )
  }
} 