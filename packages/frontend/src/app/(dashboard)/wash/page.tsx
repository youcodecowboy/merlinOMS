"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { cn } from "@/lib/utils"
import { Timer, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface WashRequest {
  id: string
  sku: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  created_at: string
  updated_at: string
  source_location?: string
  target_bin?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  order_id: string
  item_status: string
  order_status: string
  target_sku: string
}

const columns: {
  key: keyof WashRequest
  label: string
  sortable?: boolean
  render?: (value: any, row: WashRequest) => React.ReactNode
}[] = [
  {
    key: "id",
    label: "Request ID",
    sortable: true,
  },
  {
    key: "sku",
    label: "Current SKU",
    sortable: true,
    render: (value: string, row: WashRequest) => (
      <div className="space-y-1">
        <div className="font-mono">{value}</div>
        {row.target_sku && row.target_sku !== value && (
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            {row.target_sku}
          </div>
        )}
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
          'bg-blue-500/10 text-blue-500': value === 'PENDING',
          'bg-yellow-500/10 text-yellow-500': value === 'IN_PROGRESS',
          'bg-green-500/10 text-green-500': value === 'COMPLETED',
          'bg-red-500/10 text-red-500': value === 'FAILED',
        }
      )}>
        {value.replace(/_/g, ' ')}
      </div>
    ),
  },
  {
    key: "item_status",
    label: "Item Status",
    sortable: true,
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (value: string) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          'bg-red-500/10 text-red-500': value === 'HIGH',
          'bg-yellow-500/10 text-yellow-500': value === 'MEDIUM',
          'bg-blue-500/10 text-blue-500': value === 'LOW',
        }
      )}>
        {value}
      </div>
    ),
  },
  {
    key: "source_location",
    label: "Source",
    sortable: true,
  },
  {
    key: "target_bin",
    label: "Target Bin",
    sortable: true,
  },
  {
    key: "order_id",
    label: "Order",
    sortable: true,
    render: (value: string, row: WashRequest) => (
      <div className="space-y-1">
        <Link 
          href={`/orders/${value}`}
          className="hover:underline text-primary"
        >
          {value}
        </Link>
        {row.order_status && (
          <div className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            {
              'bg-gray-500/10 text-gray-500': row.order_status === 'NEW',
              'bg-blue-500/10 text-blue-500': row.order_status === 'PENDING_ASSIGNMENT',
              'bg-purple-500/10 text-purple-500': row.order_status === 'ASSIGNED',
              'bg-yellow-500/10 text-yellow-500': row.order_status === 'IN_PRODUCTION',
              'bg-orange-500/10 text-orange-500': row.order_status === 'IN_WASH',
              'bg-green-500/10 text-green-500': row.order_status === 'COMPLETED',
              'bg-red-500/10 text-red-500': row.order_status === 'CANCELLED',
            }
          )}>
            {row.order_status.replace(/_/g, ' ')}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "updated_at",
    label: "Last Updated",
    sortable: true,
    render: (value: string) => new Date(value).toLocaleString(),
  },
]

export default function WashPage() {
  const [washRequests, setWashRequests] = useState<WashRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch wash requests
  const fetchWashRequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/wash/requests')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch wash requests')
      }
      const data = await response.json()
      setWashRequests(data)
    } catch (error) {
      console.error('Error fetching wash requests:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch wash requests')
    } finally {
      setIsLoading(false)
    }
  }

  // Process next request
  const processNext = async () => {
    try {
      setIsProcessing(true)
      const nextRequest = washRequests.find(req => req.status === 'PENDING')
      if (!nextRequest) {
        toast.info('No pending requests to process')
        return
      }

      const response = await fetch(`/api/wash/requests/${nextRequest.id}/process`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process request')
      }

      toast.success(`Processing request ${nextRequest.id}`)
      fetchWashRequests() // Refresh the list
    } catch (error) {
      console.error('Error processing request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process request')
    } finally {
      setIsProcessing(false)
    }
  }

  // Set up polling for new requests
  useEffect(() => {
    // Initial fetch
    fetchWashRequests()

    // Set up polling every 5 seconds
    const interval = setInterval(fetchWashRequests, 5000)

    // Clean up on unmount
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wash Requests</h1>
          <p className="text-muted-foreground">
            Process wash requests for inventory items
          </p>
        </div>
        <Button 
          onClick={processNext}
          disabled={isProcessing || !washRequests.some(req => req.status === 'PENDING')}
        >
          <Timer className="mr-2 h-4 w-4" />
          Process Next
        </Button>
      </div>

      <DataTable
        data={washRequests}
        columns={columns}
        isLoading={isLoading}
      />
    </div>
  )
} 