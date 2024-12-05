import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST() {
  try {
    // 1. Create test production request
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

    // 2. Create production batch
    const batch = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const requests = await tx.productionRequest.findMany({
        where: {
          id: request.id,
          status: 'PENDING'
        }
      })

      if (requests.length === 0) {
        throw new Error('Request not found')
      }

      const sku = requests[0].sku
      const quantity = requests[0].quantity

      // Create batch
      const batch = await tx.productionBatch.create({
        data: {
          id: `PB-${Date.now()}`,
          sku,
          quantity,
          status: 'PENDING',
          requests: {
            connect: [{ id: request.id }]
          }
        }
      })

      // Update request status
      await tx.productionRequest.update({
        where: { id: request.id },
        data: { status: 'IN_PROGRESS' }
      })

      return batch
    })

    return NextResponse.json({
      success: true,
      data: {
        request,
        batch
      }
    })
  } catch (error) {
    console.error('Error running production test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run production test'
    }, { status: 500 })
  }
} 