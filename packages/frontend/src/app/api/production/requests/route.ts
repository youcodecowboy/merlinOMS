import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Request {
  id: string
  type: string
  status: string
  metadata: any
  createdAt: Date
  updatedAt: Date
  order?: {
    id: string
    shopify_id: string
  }
}

export async function GET() {
  try {
    // Get requests from database
    const requests = await prisma.request.findMany({
      where: {
        type: 'PRODUCTION',
        status: 'PENDING'
      },
      include: {
        order: {
          include: {
            order_items: true
          }
        }
      }
    })

    // Transform and validate each request
    const transformedRequests = requests.map(request => {
      // Parse metadata if it's a string
      let parsedMetadata = request.metadata
      if (typeof request.metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(request.metadata)
        } catch (e) {
          console.warn('Failed to parse metadata for request:', request.id)
          parsedMetadata = {}
        }
      }

      // Ensure metadata is an object
      if (!parsedMetadata || typeof parsedMetadata !== 'object') {
        parsedMetadata = {}
      }

      // Build the transformed request
      return {
        id: request.id,
        type: request.type,
        status: request.status,
        metadata: {
          sku: parsedMetadata.sku || 'Unknown',
          quantity: Number(parsedMetadata.quantity) || 0,
          order_ids: Array.isArray(parsedMetadata.order_ids) ? parsedMetadata.order_ids : 
                     request.order ? [request.order.id] : []
        },
        order: request.order ? {
          id: request.order.id,
          shopify_id: request.order.shopify_id,
          created_at: request.order.created_at,
          order_items: request.order.order_items
        } : null,
        createdAt: request.created_at,
        updatedAt: request.updated_at
      }
    })

    return NextResponse.json({
      success: true,
      requests: transformedRequests
    })
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch production requests'
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { sku, quantity, orderIds } = await req.json()

    if (!sku || !quantity || !orderIds?.length) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Create production request
    const request = await prisma.request.create({
      data: {
        type: 'PRODUCTION',
        status: 'PENDING',
        metadata: {
          sku,
          quantity,
          order_ids: orderIds,
          universal_sku: sku.split('-').slice(0, -1).join('-')
        }
      }
    })

    return NextResponse.json({
      success: true,
      request
    })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create production request'
    }, { status: 500 })
  }
}

// Test endpoint for development
export async function PUT(req: Request) {
  try {
    const request = await prisma.request.create({
      data: {
        id: `PR-${Date.now()}`,
        type: 'PRODUCTION',
        status: 'PENDING',
        metadata: {
          sku: 'ST-32-X-36-RAW',
          quantity: 5,
          order_ids: ['TEST-ORDER-1', 'TEST-ORDER-2']
        }
      }
    })

    return NextResponse.json({
      success: true,
      request
    })
  } catch (error) {
    console.error('Error creating test request:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create test production request'
    }, { status: 500 })
  }
}
