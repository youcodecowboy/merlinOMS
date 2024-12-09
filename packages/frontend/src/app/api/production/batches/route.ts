import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { PrismaClient, ProductionWaitlist, Prisma } from '@prisma/client'

interface SkuGroup {
  requests: any[]
  totalQuantity: number
  metadata: Record<string, any>
}

interface ProductionRequest {
  id: string
  type: string
  status: string
  metadata: {
    sku: string
    quantity: number
    order_ids?: string[]
  }
}

export async function POST(request: Request) {
  try {
    const { requestIds, quantity, metadata } = await request.json()

    if (!requestIds?.length || !quantity || !metadata?.sku) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get all requests and validate they're for the same SKU
      const requests = await tx.request.findMany({
        where: {
          id: { in: requestIds },
          type: 'PRODUCTION',
          status: 'PENDING'
        }
      })

      if (requests.length !== requestIds.length) {
        throw new Error('One or more requests not found or not in PENDING status')
      }

      const skus = new Set(requests.map(r => (r.metadata as any)?.sku))
      if (skus.size !== 1) {
        throw new Error('All requests must be for the same SKU')
      }

      const sku = metadata.sku
      if (!sku) {
        throw new Error('Invalid SKU in request')
      }

      // Extract style from SKU (e.g., "ST-32-X-36-RAW" -> "ST")
      const style = sku.split('-')[0]
      if (!style) {
        throw new Error('Could not determine style from SKU')
      }

      const totalRequestedQuantity = requests.reduce((sum: number, r) => {
        const qty = (r.metadata as any)?.quantity || 0
        return sum + qty
      }, 0)
      
      if (quantity < totalRequestedQuantity) {
        throw new Error(`Batch quantity (${quantity}) must be at least equal to total requested quantity (${totalRequestedQuantity})`)
      }

      // 2. Create the production batch
      const batchId = `PB-${nanoid(8)}`
      const batch = await tx.productionBatch.create({
        data: {
          id: batchId,
          status: 'PENDING',
          sku: metadata.sku,
          quantity: quantity
        }
      })

      // Create a regular batch for request tracking
      const regularBatch = await tx.batch.create({
        data: {
          id: batchId,
          status: 'PENDING',
          style: style,
          quantity: quantity,
          metadata: {
            ...metadata,
            production_batch_id: batch.id
          }
        }
      })

      // 3. Create inventory items with QR codes as their IDs
      const items = await Promise.all(
        Array.from({ length: quantity }).map(async (_, i) => {
          // Generate QR code that will serve as the item_id
          const qrCode = nanoid(8).toUpperCase()
          return tx.inventoryItem.create({
            data: {
              id: qrCode, // Use QR code as the item_id
              sku: metadata.sku,
              status1: 'PRODUCTION',
              status2: 'UNCOMMITTED',
              location: 'PATTERN',
              qr_code: qrCode, // Same as id for scanning
              batch: {
                connect: {
                  id: regularBatch.id
                }
              },
              metadata: {
                ...metadata,
                batch_id: regularBatch.id,
                production_batch_id: batch.id,
                position: i + 1,
                production_stage: 'PATTERN',
                universal_sku: metadata.sku.split('-').slice(0, -1).join('-')
              }
            }
          })
        })
      )

      // 4. Create pattern requests for each item
      const patternRequests = await Promise.all(
        items.map(item => 
          tx.request.create({
            data: {
              type: 'PATTERN',
              status: 'PENDING',
              item_id: item.id,
              batch_id: regularBatch.id,
              metadata: {
                sku: item.sku,
                universal_sku: (item.metadata as any)?.universal_sku,
                batch_id: regularBatch.id,
                production_batch_id: batch.id,
                position: (item.metadata as any)?.position,
                quantity: 1
              }
            }
          })
        )
      )

      // 5. Update original production requests to link them to batch
      await Promise.all(
        requests.map(request => 
          tx.request.update({
            where: { id: request.id },
            data: {
              status: 'IN_PROGRESS',
              batch_id: regularBatch.id,
              metadata: {
                ...request.metadata,
                production_batch_id: batch.id,
                completed_at: new Date().toISOString()
              }
            }
          })
        )
      )

      // 6. Check waitlist and update item statuses
      const waitlistEntries = await tx.productionWaitlist.findMany({
        where: {
          production_request: {
            type: 'PRODUCTION',
            status: 'PENDING'
          }
        },
        orderBy: {
          position: 'asc'
        },
        take: quantity,
        include: {
          order_item: true,
          production_request: true
        }
      })

      // Filter waitlist entries that match the universal SKU
      const universalSku = metadata.sku.split('-').slice(0, -1).join('-')
      const matchingWaitlistEntries = waitlistEntries.filter(entry => {
        const requestMetadata = entry.production_request.metadata as any
        return requestMetadata?.universal_sku === universalSku
      })

      if (matchingWaitlistEntries.length > 0) {
        // Update items to COMMITTED for waitlisted orders
        await Promise.all(
          matchingWaitlistEntries.map((entry, index) => 
            tx.inventoryItem.update({
              where: { id: items[index].id },
              data: {
                status2: 'COMMITTED',
                metadata: {
                  sku: items[index].sku,
                  universal_sku: metadata.sku.split('-').slice(0, -1).join('-'),
                  batch_id: regularBatch.id,
                  production_batch_id: batch.id,
                  position: index + 1,
                  production_stage: 'PATTERN',
                  committed_to_order_id: entry.order_item_id,
                  committed_at: new Date().toISOString(),
                  waitlist_position: entry.position
                }
              }
            })
          )
        )
      }

      return {
        productionBatch: batch,
        batch: regularBatch,
        items,
        patternRequests,
        waitlistAssignments: matchingWaitlistEntries.length
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Production batch created successfully',
      data: result
    })

  } catch (error) {
    console.error('Error creating production batch:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create production batch'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const batches = await prisma.productionBatch.findMany({
      include: {
        requests: true,
        items: true,
        pattern: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      batches: batches.map(batch => ({
        id: batch.id,
        sku: batch.sku,
        quantity: batch.quantity,
        status: batch.status,
        created_at: batch.createdAt.toISOString(),
        updated_at: batch.updatedAt.toISOString(),
        requests_count: batch.requests.length,
        items_count: batch.items.length,
        pattern: batch.pattern ? {
          id: batch.pattern.id,
          status: batch.pattern.status,
          created_at: batch.pattern.createdAt.toISOString()
        } : null
      }))
    })
  } catch (error) {
    console.error('Error fetching batches:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch batches'
    }, { status: 500 })
  }
} 