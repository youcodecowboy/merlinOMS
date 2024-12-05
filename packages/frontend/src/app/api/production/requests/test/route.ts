import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Create a test production request
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