import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

interface OrderUpdate {
  orderId: string
  status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
  timestamp: string
  details?: {
    location?: string
    assignedTo?: string
    notes?: string
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  const customerId = params.customerId

  const encoder = new TextEncoder()
  const customStream = new TransformStream()
  const writer = customStream.writable.getWriter()

  // Send initial connection message
  const initialData = {
    type: 'connected',
    data: { message: 'Connected to customer events stream' }
  }
  writer.write(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`))

  // Mock active orders for demo
  const mockOrders = [
    { orderId: 'ORD001', status: 'PROCESSING' },
    { orderId: 'ORD002', status: 'NEW' }
  ]

  // For demo purposes, we'll send periodic updates
  const interval = setInterval(async () => {
    try {
      // Randomly decide which type of update to send
      const updateType = Math.random() > 0.5 ? 'order_update' : 'customer_update'

      if (updateType === 'order_update') {
        // Simulate order status update
        const orderUpdate: OrderUpdate = {
          orderId: mockOrders[Math.floor(Math.random() * mockOrders.length)].orderId,
          status: ['PROCESSING', 'COMPLETED'][Math.floor(Math.random() * 2)] as 'PROCESSING' | 'COMPLETED',
          timestamp: new Date().toISOString(),
          details: {
            location: ['Warehouse', 'Production', 'QC'][Math.floor(Math.random() * 3)],
            notes: 'Order status automatically updated'
          }
        }

        const data = {
          type: 'order_update',
          data: orderUpdate
        }

        await writer.write(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      } else {
        // Simulate customer update
        const data = {
          type: 'customer_updated',
          data: {
            id: customerId,
            timestamp: new Date().toISOString(),
            changes: [
              'New order received',
              'Profile information updated',
              'Customer preferences changed',
              'Contact details modified'
            ][Math.floor(Math.random() * 4)]
          }
        }

        await writer.write(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      }
    } catch (error) {
      console.error('Error sending SSE update:', error)
    }
  }, 5000) // Send update every 5 seconds

  // Clean up on disconnect
  req.signal.addEventListener('abort', () => {
    clearInterval(interval)
    writer.close()
  })

  return new Response(customStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
} 