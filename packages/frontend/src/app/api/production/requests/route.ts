import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const requests = await prisma.productionRequest.findMany({
      where: {
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Parse orderIds JSON string back to array
    const formattedRequests = requests.map((request: any) => ({
      ...request,
      orderIds: JSON.parse(request.orderIdsJson)
    }))

    return NextResponse.json({
      success: true,
      requests: formattedRequests
    })
  } catch (error) {
    console.error('Error fetching production requests:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch production requests'
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { sku, quantity, orderIds, type = 'PRODUCTION' } = await req.json()

    if (!sku || !quantity || !orderIds?.length) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const request = await prisma.productionRequest.create({
      data: {
        id: `PR-${Date.now()}`,
        sku,
        quantity,
        orderIdsJson: JSON.stringify(orderIds),
        type,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      request: {
        ...request,
        orderIds: JSON.parse(request.orderIdsJson)
      }
    })
  } catch (error) {
    console.error('Error creating production request:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create production request'
    }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const request = await prisma.productionRequest.create({
      data: {
        id: `PR-${Date.now()}`,
        sku: 'ST-32-X-36-RAW',
        quantity: 5,
        orderIdsJson: JSON.stringify(['TEST-ORDER-1', 'TEST-ORDER-2']),
        type: 'PRODUCTION',
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      request: {
        ...request,
        orderIds: JSON.parse(request.orderIdsJson)
      }
    })
  } catch (error) {
    console.error('Error creating test production request:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create test production request'
    }, { status: 500 })
  }
}
