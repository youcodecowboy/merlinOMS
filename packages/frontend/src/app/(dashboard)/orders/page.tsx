"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Plus, Settings, PlayCircle, Trash } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { OrderStatus, OrderItemStatus } from "@prisma/client"

interface OrderItem {
  id: string
  target_sku: string
  quantity: number
  status: OrderItemStatus
  assigned_item_id?: string
}

interface Order {
  id: string
  shopify_id: string
  status: OrderStatus
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
  created_at: string
  updated_at: string
  metadata?: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH'
    notes?: string
  }
}

interface ProcessingResult {
  orderId: string
  success: boolean
  error?: string
  newStatus?: OrderStatus
  details?: string
}

const columns = [
  {
    key: "shopify_id",
    label: "Order ID",
    sortable: true,
    render: (value: string, row: Order) => (
      <div className="font-medium">
        <div>{value}</div>
        <div className="text-xs text-muted-foreground font-mono">
          {row.id}
        </div>
      </div>
    )
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value: OrderStatus) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          'bg-gray-500/10 text-gray-500': value === OrderStatus.NEW,
          'bg-blue-500/10 text-blue-500': value === OrderStatus.PENDING_ASSIGNMENT,
          'bg-purple-500/10 text-purple-500': value === OrderStatus.ASSIGNED,
          'bg-yellow-500/10 text-yellow-500': value === OrderStatus.IN_PRODUCTION,
          'bg-orange-500/10 text-orange-500': value === OrderStatus.WASH,
          'bg-green-500/10 text-green-500': value === OrderStatus.COMPLETED,
          'bg-red-500/10 text-red-500': value === OrderStatus.CANCELLED,
        }
      )}>
        {value.replace(/_/g, ' ')}
      </div>
    ),
  },
  {
    key: "customer",
    label: "Customer",
    render: (value: Order['customer']) => (
      <div>
        <div className="font-medium">
          {value.profile?.metadata.firstName} {value.profile?.metadata.lastName}
        </div>
        <div className="text-sm text-muted-foreground">
          {value.email}
        </div>
      </div>
    ),
  },
  {
    key: "order_items",
    label: "Items",
    render: (value: OrderItem[]) => (
      <div className="space-y-1">
        {value.map((item) => (
          <div key={item.id} className="text-sm">
            <span className="font-mono">{item.target_sku}</span>
            <span className="text-muted-foreground"> × {item.quantity}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "metadata",
    label: "Priority",
    render: (value: Order['metadata']) => value?.priority ? (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          'bg-green-500/10 text-green-500': value.priority === 'LOW',
          'bg-yellow-500/10 text-yellow-500': value.priority === 'MEDIUM',
          'bg-red-500/10 text-red-500': value.priority === 'HIGH',
        }
      )}>
        {value.priority}
      </div>
    ) : null,
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (value: string) => new Date(value).toLocaleString()
  },
]

export default function OrdersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      
      if (data.success) {
        setOrders(data.orders)
      } else {
        toast.error('Failed to load orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Error loading orders')
    } finally {
      setIsLoading(false)
    }
  }

  const processNewOrders = async () => {
    try {
      setIsProcessing(true)
      setProcessingResults([])
      const newOrders = orders.filter(order => order.status === OrderStatus.NEW)
      
      if (newOrders.length === 0) {
        toast.info('No new orders to process')
        return
      }

      const results: ProcessingResult[] = []

      for (const order of newOrders) {
        try {
          const response = await fetch(`/api/orders/${order.id}/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operatorId: '00000000-0000-0000-0000-000000000000', // System operator ID
            }),
          })

          const result = await response.json()

          if (response.ok && result.success) {
            results.push({
              orderId: order.id,
              success: true,
              newStatus: result.order.status,
              details: result.message
            })
          } else {
            results.push({
              orderId: order.id,
              success: false,
              error: result.error || 'Unknown error',
              details: result.details || 'Failed to process order'
            })
          }
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error)
          results.push({
            orderId: order.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: 'Failed to process order'
          })
        }
      }

      setProcessingResults(results)

      const processed = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      if (processed > 0) {
        toast.success(`Successfully processed ${processed} orders`)
      }
      if (failed > 0) {
        toast.error(`Failed to process ${failed} orders`, {
          description: 'Check the results table for details'
        })
      }

      // Refresh the orders list
      await fetchOrders()
    } catch (error) {
      console.error('Error processing orders:', error)
      toast.error('Error processing orders')
    } finally {
      setIsProcessing(false)
    }
  }

  const retryOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: '00000000-0000-0000-0000-000000000000', // System operator ID
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(`Successfully processed order ${orderId}`)
        setProcessingResults(prev => 
          prev.map(r => r.orderId === orderId ? {
            ...r,
            success: true,
            error: undefined,
            newStatus: result.order.status,
            details: result.message
          } : r)
        )
      } else {
        toast.error(`Failed to process order ${orderId}`, {
          description: result.error || 'Unknown error'
        })
      }

      // Refresh the orders list
      await fetchOrders()
    } catch (error) {
      console.error(`Error retrying order ${orderId}:`, error)
      toast.error(`Failed to retry order ${orderId}`)
    }
  }

  const resetDatabase = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL orders and inventory items. This action cannot be undone. Are you sure?')) {
      return
    }
    
    try {
      setIsResetting(true)
      const response = await fetch('/api/dev/reset-database', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Database reset successfully')
        await fetchOrders() // Refresh the list
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to reset database')
      }
    } catch (error) {
      console.error('Error resetting database:', error)
      toast.error('Failed to reset database')
    } finally {
      setIsResetting(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track customer orders across all stages.
          </p>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline"
            onClick={processNewOrders}
            disabled={isProcessing || !orders.some(order => order.status === OrderStatus.NEW)}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Process New Orders'}
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Link href="/orders/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="destructive" 
              onClick={resetDatabase}
              disabled={isResetting}
            >
              <Trash className="mr-2 h-4 w-4" />
              {isResetting ? 'Resetting...' : 'Reset Database'}
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => {
          router.push(`/orders/${row.id}`)
        }}
      />

      {processingResults.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Processing Results</h2>
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processingResults.map((result) => (
                  <tr key={result.orderId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        result.success
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}>
                        {result.success ? 'Success' : 'Failed'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {result.success
                        ? `Processed - New Status: ${result.newStatus}`
                        : result.error}
                      <br />
                      <span className="text-xs">{result.details}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!result.success && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryOrder(result.orderId)}
                        >
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
} 