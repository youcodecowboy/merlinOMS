"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Clock, Package, User, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface TimelineEvent {
  id: string
  type: 'ORDER_CREATED' | 'STATUS_CHANGED' | 'ITEM_ASSIGNED' | 'NOTE_ADDED'
  message: string
  actor: string
  timestamp: string
  metadata?: {
    oldStatus?: string
    newStatus?: string
    itemId?: string
    note?: string
  }
}

interface OrderItem {
  id: string
  target_sku: string
  quantity: number
  status: string
  assigned_item_id?: string
}

interface Order {
  id: string
  shopify_id: string
  status: 'NEW' | 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'IN_PRODUCTION' | 'IN_WASH' | 'COMPLETED' | 'CANCELLED'
  customer_id: string
  customer: {
    email: string
    profile?: {
      firstName?: string
      lastName?: string
    }
  }
  order_items: OrderItem[]
  events: TimelineEvent[]
  created_at: string
  updated_at: string
  metadata?: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH'
    notes?: string
  }
}

// This would come from your API
const orderData: Order = {
  id: "ORD001",
  shopify_id: "SHOP-001",
  status: "NEW",
  customer_id: "CUST001",
  customer: {
    email: "customer1@example.com",
    profile: {
      firstName: "John",
      lastName: "Doe"
    }
  },
  order_items: [
    {
      id: "ITEM001",
      target_sku: "ST-32-R-32-IND",
      quantity: 1,
      status: "NEW"
    }
  ],
  events: [
    {
      id: "EVT001",
      type: "ORDER_CREATED",
      message: "Order created",
      actor: "system",
      timestamp: "2024-01-15T10:00:00Z"
    },
    {
      id: "EVT002",
      type: "NOTE_ADDED",
      message: "Rush order note added",
      actor: "John Smith",
      timestamp: "2024-01-15T10:05:00Z",
      metadata: {
        note: "Rush order"
      }
    },
    {
      id: "EVT003",
      type: "STATUS_CHANGED",
      message: "Order status updated",
      actor: "Jane Doe",
      timestamp: "2024-01-15T10:30:00Z",
      metadata: {
        oldStatus: "NEW",
        newStatus: "PENDING_ASSIGNMENT"
      }
    }
  ],
  created_at: "2024-01-15",
  updated_at: "2024-01-15",
  metadata: {
    priority: "HIGH",
    notes: "Rush order"
  }
}

function TimelineEvent({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex gap-4 text-sm">
      <div className="w-32 shrink-0 text-muted-foreground">
        {new Date(event.timestamp).toLocaleTimeString()}
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
          by {event.actor}
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
              Order {orderData.shopify_id}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {orderData.id}
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
            'bg-gray-500/10 text-gray-500': orderData.status === 'NEW',
            'bg-blue-500/10 text-blue-500': orderData.status === 'PENDING_ASSIGNMENT',
            'bg-purple-500/10 text-purple-500': orderData.status === 'ASSIGNED',
            'bg-yellow-500/10 text-yellow-500': orderData.status === 'IN_PRODUCTION',
            'bg-orange-500/10 text-orange-500': orderData.status === 'IN_WASH',
            'bg-green-500/10 text-green-500': orderData.status === 'COMPLETED',
            'bg-red-500/10 text-red-500': orderData.status === 'CANCELLED',
          }
        )}>
          {orderData.status.replace(/_/g, ' ')}
        </div>
        {orderData.metadata?.priority && (
          <div className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            {
              'bg-green-500/10 text-green-500': orderData.metadata.priority === 'LOW',
              'bg-yellow-500/10 text-yellow-500': orderData.metadata.priority === 'MEDIUM',
              'bg-red-500/10 text-red-500': orderData.metadata.priority === 'HIGH',
            }
          )}>
            {orderData.metadata.priority} Priority
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
                  {orderData.customer.profile?.firstName} {orderData.customer.profile?.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {orderData.customer.email}
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
              {orderData.events.map((event) => (
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
              {orderData.order_items.map((item) => (
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
                    {item.assigned_item_id && (
                      <div className="text-sm text-muted-foreground">
                        Assigned Item: {item.assigned_item_id}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    Assign Item
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {orderData.metadata?.notes && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 text-lg font-semibold mb-4">
            <AlertTriangle className="h-5 w-5" />
            <h2>Notes</h2>
          </div>
          <p className="text-muted-foreground">
            {orderData.metadata.notes}
          </p>
        </div>
      )}
    </div>
  )
} 