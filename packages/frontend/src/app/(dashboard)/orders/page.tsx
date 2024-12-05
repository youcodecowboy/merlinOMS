"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Plus, Settings, Trash } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
  created_at: string
  updated_at: string
  metadata?: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH'
    notes?: string
  }
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
    render: (value: string) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          'bg-gray-500/10 text-gray-500': value === 'NEW',
          'bg-blue-500/10 text-blue-500': value === 'PENDING_ASSIGNMENT',
          'bg-purple-500/10 text-purple-500': value === 'ASSIGNED',
          'bg-yellow-500/10 text-yellow-500': value === 'IN_PRODUCTION',
          'bg-orange-500/10 text-orange-500': value === 'WASH',
          'bg-green-500/10 text-green-500': value === 'COMPLETED',
          'bg-red-500/10 text-red-500': value === 'CANCELLED',
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
  const [isResetting, setIsResetting] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])

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
    </div>
  )
} 