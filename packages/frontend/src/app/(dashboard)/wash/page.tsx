"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { cn } from "@/lib/utils"
import { Timer, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface WashRequest {
  id: string
  sku: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  created_at: string
  updated_at: string
  source_location?: string
  target_bin?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  order_id?: string
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
    label: "SKU",
    sortable: true,
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
        {value}
      </div>
    ),
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
      if (!response.ok) throw new Error('Failed to fetch wash requests')
      const data = await response.json()
      setWashRequests(data)
    } catch (error) {
      console.error('Error fetching wash requests:', error)
      toast.error('Failed to fetch wash requests')
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

      if (!response.ok) throw new Error('Failed to process request')

      toast.success(`Processing request ${nextRequest.id}`)
      fetchWashRequests() // Refresh the list
    } catch (error) {
      console.error('Error processing request:', error)
      toast.error('Failed to process request')
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

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wash Requests</h1>
          <p className="text-muted-foreground">
            Manage and track wash requests across all locations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2">
            <Timer className="h-4 w-4" />
            History
          </Button>
          <Button 
            onClick={processNext}
            disabled={isProcessing || washRequests.every(req => req.status !== 'PENDING')}
          >
            {isProcessing ? 'Processing...' : 'Process Next'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <DataTable
        data={washRequests}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => {
          console.log("Clicked row:", row)
        }}
      />
    </div>
  )
} 