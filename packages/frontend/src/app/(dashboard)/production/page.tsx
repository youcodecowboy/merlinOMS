"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Scissors } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PendingRequest {
  id: string
  sku: string
  quantity: number
  orderIds: string[]
  status: string
  requiresApproval: boolean
  createdAt: string
  updatedAt: string
}

const columns: {
  key: keyof PendingRequest
  label: string
  render?: (value: any) => React.ReactNode
}[] = [
  {
    key: "sku",
    label: "Universal SKU",
  },
  {
    key: "quantity",
    label: "Quantity",
  },
  {
    key: "orderIds",
    label: "Waiting Orders",
    render: (value: string[]) => value.length
  },
  {
    key: "createdAt",
    label: "Created",
    render: (value: string) => new Date(value).toLocaleString()
  },
  {
    key: "requiresApproval",
    label: "Approval Required",
    render: (value: boolean) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        value
          ? "bg-yellow-500/10 text-yellow-500"
          : "bg-green-500/10 text-green-500"
      )}>
        {value ? "Yes" : "No"}
      </div>
    )
  }
]

export default function PendingProductionPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [selectedRequests, setSelectedRequests] = useState<string[]>([])

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/production/requests')
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.requests)
      } else {
        toast.error('Failed to load production requests')
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Error loading production requests')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSelect = (request: PendingRequest) => {
    setSelectedRequests(prev => {
      const isSelected = prev.includes(request.id)
      if (isSelected) {
        return prev.filter(id => id !== request.id)
      } else {
        return [...prev, request.id]
      }
    })
  }

  const canCreateBatch = selectedRequests.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Production</h1>
          <p className="text-muted-foreground">
            Manage and group production requests into batches.
          </p>
        </div>
        <Button
          disabled={!canCreateBatch}
          onClick={() => {
            // Handle batch creation
            console.log('Creating batch with:', selectedRequests)
          }}
        >
          <Scissors className="mr-2 h-4 w-4" />
          Create Batch
        </Button>
      </div>

      <DataTable
        data={requests}
        columns={columns}
        onRowClick={handleRequestSelect}
        selectable
        selectedRows={selectedRequests}
        isLoading={loading}
      />
    </div>
  )
} 