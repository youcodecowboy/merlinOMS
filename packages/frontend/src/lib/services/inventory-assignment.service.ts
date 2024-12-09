import { PrismaClient } from '@prisma/client'

export class InventoryAssignmentService {
  constructor(private prisma: PrismaClient) {}

  async assignInventoryToOrder(orderId: string, actorId: string) {
    // Get order and its items
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        order_items: true
      }
    })

    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // Process each order item
    const results = await Promise.all(
      order.order_items.map(item => this.processOrderItem(item, orderId, actorId))
    )

    return results[0] // For now, we're just returning the first result since we're dealing with single items
  }

  private async processOrderItem(orderItem: any, orderId: string, actorId: string) {
    try {
      // Step 1: Try exact SKU match
      const exactMatch = await this.findExactMatch(orderItem.target_sku)
      if (exactMatch) {
        const result = await this.assignItemToOrder(exactMatch.id, orderItem.id, orderId, actorId)
        return {
          success: true,
          action: 'direct_assignment',
          itemId: exactMatch.id,
          message: 'Found exact match and assigned item',
          details: result
        }
      }

      // Step 2: Try universal SKU match
      const universalMatch = await this.findUniversalMatch(orderItem.target_sku)
      if (universalMatch) {
        const result = await this.assignItemToOrder(universalMatch.id, orderItem.id, orderId, actorId, true)
        return {
          success: true,
          action: 'universal_assignment',
          itemId: universalMatch.id,
          message: 'Found universal match and assigned item',
          details: result
        }
      }

      // Step 3: Create production request
      const universalSKU = this.getUniversalSKU(orderItem.target_sku)
      await this.createPendingProduction(universalSKU, orderId, actorId)
      return {
        success: true,
        action: 'production_request',
        message: 'Created production request'
      }

    } catch (error) {
      console.error('Error processing order item:', error)
      return {
        success: false,
        action: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async findExactMatch(targetSKU: string) {
    return await this.prisma.inventoryItem.findFirst({
      where: {
        sku: targetSKU,
        OR: [
          {
            status1: 'STOCK',
            status2: 'UNCOMMITTED'
          },
          {
            status1: 'PRODUCTION',
            status2: 'UNCOMMITTED'
          }
        ]
      }
    })
  }

  private async findUniversalMatch(targetSKU: string) {
    const [style, waist, shape, targetLength, wash] = targetSKU.split('-')
    const universalWash = ['STA', 'IND'].includes(wash) ? 'RAW' : 'BRW'

    console.log('Finding universal match for:', {
      style,
      waist,
      shape,
      targetLength,
      wash,
      universalWash
    })

    // First find all candidates with matching base components (style/waist/shape)
    const candidates = await this.prisma.inventoryItem.findMany({
      where: {
        AND: [
          // Match base components (style/waist/shape)
          {
            sku: {
              startsWith: `${style}-${waist}-${shape}`
            }
          },
          // Match universal wash
          {
            sku: {
              endsWith: `-${universalWash}`
            }
          },
          // Only consider available items
          {
            status1: 'STOCK'
          },
          {
            status2: 'UNCOMMITTED'
          }
        ]
      }
    })

    console.log('Found candidates:', candidates.map((c: any) => ({
      id: c.id,
      sku: c.sku,
      status1: c.status1,
      status2: c.status2
    })))

    if (candidates.length === 0) {
      console.log('No universal matches found')
      return null
    }

    // Filter candidates to only include those with sufficient length
    const targetLengthNum = parseInt(targetLength)
    const matches = candidates.filter((item: any) => {
      const itemLength = parseInt(item.sku.split('-')[3])
      const isValid = itemLength >= targetLengthNum

      console.log(`Checking length for ${item.sku}:`, {
        itemLength,
        targetLength: targetLengthNum,
        isValid
      })

      return isValid
    })

    if (matches.length === 0) {
      console.log('No valid length matches found')
      return null
    }

    // Sort matches by length (ascending) to get the closest match
    matches.sort((a: any, b: any) => {
      const aLength = parseInt(a.sku.split('-')[3])
      const bLength = parseInt(b.sku.split('-')[3])
      return aLength - bLength // Sort ascending so shortest valid length is first
    })

    const bestMatch = matches[0]
    console.log('Selected best match:', {
      id: bestMatch.id,
      sku: bestMatch.sku,
      length: parseInt(bestMatch.sku.split('-')[3])
    })

    return bestMatch
  }

  private getUniversalSKU(targetSKU: string) {
    const [style, waist, shape, , wash] = targetSKU.split('-')
    const universalWash = ['STA', 'IND'].includes(wash) ? 'RAW' : 'BRW'
    return `${style}-${waist}-${shape}-36-${universalWash}` // Always use length 36 for production
  }

  private async assignItemToOrder(
    itemId: string,
    orderItemId: string,
    orderId: string,
    actorId: string,
    isUniversalMatch: boolean = false
  ) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId }
    })

    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId }
    })

    if (!item || !orderItem) {
      throw new Error('Item or order item not found')
    }

    // Execute assignment in a transaction
    return await this.prisma.$transaction(async tx => {
      if (item.status1 === 'PRODUCTION') {
        // For PRODUCTION items, do soft commitment
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            status2: 'COMMITTED',
            metadata: {
              waitlisted_order_id: orderId,
              waitlisted_at: new Date().toISOString()
            }
          }
        })

        await tx.orderItem.update({
          where: { id: orderItemId },
          data: {
            status: 'IN_PRODUCTION',
            metadata: {
              committed_item_id: itemId,
              position: 1 // First in line for this item
            }
          }
        })
      } else {
        // For STOCK items, do hard assignment and create wash request
        const updatedItem = await tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            status1: 'WASH',
            status2: 'ASSIGNED',
            assigned_order_id: orderId
          }
        })

        const updatedOrderItem = await tx.orderItem.update({
          where: { id: orderItemId },
          data: {
            status: 'ASSIGNED',
            assigned_item_id: itemId
          },
          include: {
            order: {
              include: {
                customer: true
              }
            }
          }
        })

        // Create wash request with appropriate wash type
        const [, , , , targetWash] = orderItem.target_sku.split('-')
        const washRequest = await tx.request.create({
          data: {
            type: 'WASH',
            status: 'PENDING',
            item_id: itemId,
            order_id: orderId,
            assigned_to: '2d40fc18-e02a-41f1-8c4e-92f770133029', // Warehouse user ID
            metadata: {
              order_item_id: orderItemId,
              requires_qr_scan: true,
              requires_bin_assignment: true,
              target_wash: targetWash,
              is_universal_match: isUniversalMatch,
              source: item.location || 'WAREHOUSE',
              sku: item.sku,
              target_sku: orderItem.target_sku,
              order_shopify_id: updatedOrderItem.order.shopify_id,
              customer_name: updatedOrderItem.order.customer?.profile?.metadata?.firstName 
                ? `${updatedOrderItem.order.customer.profile.metadata.firstName} ${updatedOrderItem.order.customer.profile.metadata.lastName}`
                : 'Unknown Customer',
              customer_email: updatedOrderItem.order.customer?.email || 'unknown@example.com',
              assigned_at: new Date().toISOString()
            }
          },
          include: {
            item: true,
            order: {
              include: {
                order_items: true,
                customer: {
                  include: {
                    profile: true
                  }
                }
              }
            }
          }
        })

        // Update order status to WASH
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'WASH'
          }
        })

        return {
          updatedItem,
          updatedOrderItem,
          washRequest
        }
      }
    })
  }

  private async createPendingProduction(universalSKU: string, orderId: string, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      // Create production request
      const request = await tx.request.create({
        data: {
          type: 'PRODUCTION',
          status: 'PENDING',
          order_id: orderId,
          metadata: {
            universal_sku: universalSKU,
            quantity: 1
          }
        }
      })

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING_PRODUCTION'
        }
      })

      // Log the event
      await tx.event.create({
        data: {
          type: 'PRODUCTION_REQUEST_CREATED',
          actor_id: actorId,
          order_id: orderId,
          request_id: request.id,
          metadata: {
            universal_sku: universalSKU,
            quantity: 1
          }
        }
      })
    })
  }
} 