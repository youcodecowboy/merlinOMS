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
  type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  item?: {
    sku: string;
    location: string;
  };
  metadata: any;
  priority?: string;
  order_id?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const order_id = searchParams.get('order_id')

    // Build filter conditions
    const where: any = {
      type: 'WASH'
    }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (order_id) where.order_id = order_id

    const washRequests = await prisma.request.findMany({
      where,
      include: {
        item: {
          select: {
            sku: true,
            location: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'asc' }
      ],
      take: 100
    })

    // Transform the data to match the expected format
    const formattedRequests = washRequests.map((req: WashRequest) => ({
      id: req.id,
      sku: req.item?.sku || '',
      status: req.status,
      created_at: req.created_at,
      updated_at: req.updated_at,
      source_location: req.item?.location || '',
      target_bin: req.metadata?.target_bin,
      priority: req.priority || 'LOW',
      order_id: req.order_id
    }))

    return NextResponse.json(formattedRequests)

  } catch (error) {
    console.error('Error fetching wash requests:', error)
    return NextResponse.json(
      { error: "Failed to fetch wash requests" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate request body
    const validatedData = washRequestSchema.parse(body)

    // Check if target bin exists and has capacity (if provided)
    if (validatedData.target_bin) {
      const bin = await prisma.bin.findUnique({
        where: { id: validatedData.target_bin }
      })

      if (!bin) {
        return NextResponse.json(
          { error: "Target bin not found" },
          { status: 404 }
        )
      }

      if (bin.current_count >= bin.capacity) {
        return NextResponse.json(
          { error: "Bin capacity exceeded" },
          { status: 400 }
        )
      }
    }

    // Create wash request
    const washRequest = await prisma.request.create({
      data: {
        type: 'WASH',
        ...validatedData,
        status: 'PENDING',
        metadata: {
          target_bin: validatedData.target_bin,
          source_location: validatedData.source_location
        }
      }
    })

    // Update bin count if target_bin was provided
    if (validatedData.target_bin) {
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
      { error: "Failed to create wash request" },
      { status: 500 }
    )
  }
} 