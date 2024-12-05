import { z } from 'zod'

// QR Code Data Schemas
const inventoryItemQRSchema = z.object({
  id: z.string(),
  sku: z.string(),
  qr: z.string(),
  type: z.literal('INVENTORY_ITEM')
})

const locationQRSchema = z.object({
  id: z.string(),
  type: z.literal('LOCATION'),
  locationType: z.enum(['ZONE', 'BIN', 'RACK']),
  code: z.string()
})

const batchQRSchema = z.object({
  id: z.string(),
  type: z.literal('BATCH'),
  items: z.array(z.string()) // Array of item IDs
})

export type InventoryItemQR = z.infer<typeof inventoryItemQRSchema>
export type LocationQR = z.infer<typeof locationQRSchema>
export type BatchQR = z.infer<typeof batchQRSchema>

// QR Code Generation
export function generateInventoryItemQR(item: {
  id: string
  sku: string
  qr: string
}): string {
  return JSON.stringify({
    id: item.id,
    sku: item.sku,
    qr: item.qr,
    type: 'INVENTORY_ITEM' as const
  })
}

export function generateLocationQR(location: {
  id: string
  locationType: LocationQR['locationType']
  code: string
}): string {
  return JSON.stringify({
    id: location.id,
    type: 'LOCATION' as const,
    locationType: location.locationType,
    code: location.code
  })
}

export function generateBatchQR(batch: {
  id: string
  items: string[]
}): string {
  return JSON.stringify({
    id: batch.id,
    type: 'BATCH' as const,
    items: batch.items
  })
}

// QR Code Parsing
export function parseQRCode(data: string): InventoryItemQR | LocationQR | BatchQR | null {
  try {
    const parsed = JSON.parse(data)
    
    switch (parsed.type) {
      case 'INVENTORY_ITEM':
        return inventoryItemQRSchema.parse(parsed)
      case 'LOCATION':
        return locationQRSchema.parse(parsed)
      case 'BATCH':
        return batchQRSchema.parse(parsed)
      default:
        return null
    }
  } catch (error) {
    console.error('Error parsing QR code:', error)
    return null
  }
}

// QR Code Validation
export function validateQRCode(data: string): {
  isValid: boolean
  type?: 'INVENTORY_ITEM' | 'LOCATION' | 'BATCH'
  error?: string
} {
  try {
    const parsed = parseQRCode(data)
    if (!parsed) {
      return {
        isValid: false,
        error: 'Invalid QR code format'
      }
    }

    return {
      isValid: true,
      type: parsed.type
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 