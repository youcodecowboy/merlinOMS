"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Clock, Package, User, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface OrderItem {
  id: string
  target_sku: string
  quantity: number
  status: string
  assigned_item_id?: string
  assigned_item?: {
    id: string
    sku: string
    status1: string
    status2: string
    location: string
  }
}

interface Event {
  id: string
  type: string
  message: string
  metadata: Record<string, any>
  created_at: string
  created_by: string
}

interface Order {
  id: string
  shopify_id: string
  status: string
  customer_id: string
  customer: {
    email: string
    profile?: {
      metadata: {
        firstName: string
        lastName: string
      }
    }
  }
  order_items: OrderItem[]
  events: Event[]
  created_at: string
  updated_at: string
  metadata?: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH'
    notes?: string
  }
}

function TimelineEvent({ event }: { event: Event }) {
  return (
    <div className="flex gap-4 text-sm">
      <div className="w-32 shrink-0 text-muted-foreground">
        {new Date(event.created_at).toLocaleTimeString()}
      </div>
      <div className="flex-1 space-y-1">
        <div className="font-medium">{event.message}</div>
        {event.metadata?.oldStatus && event.metadata?.newStatus && (
          <div className="text-muted-foreground">
            Status changed from{' '}
            <span className="font-mono">{event.metadata.oldStatus}</span> to{' '}
            <span className="font-mono">{event.metadata.newStatus}</span>
          </div>
        )}
        {event.metadata?.note && (
          <div className="text-muted-foreground">
            Note: {event.metadata.note}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          by {event.created_by}
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage({
  params
}: {
  params: { orderId: string }
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${params.orderId}`)
        const data = await response.json()
        
        if (data.success) {
          setOrder(data.order)
          
          const updateResponse = await fetch(`/api/orders/${params.orderId}`, {
            method: 'PATCH'
          })
          const updateData = await updateResponse.json()
          
          if (updateData.success && updateData.order.status !== data.order.status) {
            setOrder(updateData.order)
            toast.success('Order status updated')
          }
        } else {
          setError(data.error || 'Failed to load order')
          toast.error(data.error || 'Failed to load order')
        }
      } catch (error) {
        console.error('Error fetching order:', error)
        setError('Error loading order')
        toast.error('Error loading order')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [params.orderId])

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">{error || 'Order not found'}</div>
        <Button variant="outline" onClick={() => router.push('/orders')}>
          Back to Orders
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Order {order.shopify_id}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {order.id}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline">Cancel Order</Button>
          <Button>Process Order</Button>
        </div>
      </div>

      {/* Status and Priority */}
      <div className="flex items-center gap-4">
        <div className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
          {
            'bg-gray-500/10 text-gray-500': order.status === 'NEW',
            'bg-blue-500/10 text-blue-500': order.status === 'PENDING_ASSIGNMENT',
            'bg-purple-500/10 text-purple-500': order.status === 'ASSIGNED',
            'bg-yellow-500/10 text-yellow-500': order.status === 'IN_PRODUCTION',
            'bg-orange-500/10 text-orange-500': order.status === 'IN_WASH',
            'bg-green-500/10 text-green-500': order.status === 'COMPLETED',
            'bg-red-500/10 text-red-500': order.status === 'CANCELLED',
          }
        )}>
          {order.status.replace(/_/g, ' ')}
        </div>
        {order.metadata?.priority && (
          <div className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            {
              'bg-green-500/10 text-green-500': order.metadata.priority === 'LOW',
              'bg-yellow-500/10 text-yellow-500': order.metadata.priority === 'MEDIUM',
              'bg-red-500/10 text-red-500': order.metadata.priority === 'HIGH',
            }
          )}>
            {order.metadata.priority} Priority
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="col-span-1 space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <User className="h-5 w-5" />
              <h2>Customer</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="font-medium">
                  {order.customer.profile?.metadata.firstName} {order.customer.profile?.metadata.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.customer.email}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Clock className="h-5 w-5" />
              <h2>Timeline</h2>
            </div>
            <div className="space-y-6">
              {order.events.map((event) => (
                <TimelineEvent key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="col-span-2 rounded-lg border bg-card">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5" />
              <h2>Order Items</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      <span className="font-mono">{item.target_sku}</span>
                      <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status: {item.status}
                    </div>
                    {item.assigned_item && (
                      <div className="text-sm text-muted-foreground">
                        Assigned Item: {item.assigned_item.sku} ({item.assigned_item.status1}/{item.assigned_item.status2})
                        <div className="text-xs">Location: {item.assigned_item.location}</div>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!!item.assigned_item_id}
                  >
                    {item.assigned_item_id ? 'Assigned' : 'Assign Item'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.metadata?.notes && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 text-lg font-semibold mb-4">
            <AlertTriangle className="h-5 w-5" />
            <h2>Notes</h2>
          </div>
          <p className="text-muted-foreground">
            {order.metadata.notes}
          </p>
        </div>
      )}
    </div>
  )
} 