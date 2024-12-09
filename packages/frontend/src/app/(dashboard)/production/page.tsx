"use client"

import { useEffect, useState } from "react"
import { DataTable, Column } from "@/components/ui/data-table"
import { toast } from "sonner"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface PendingRequest {
  id: string
  metadata: {
    sku: string
    quantity: number
    order_ids: string[]
    target_sku?: string
    universal_sku?: string
  }
  status: string
  type: string
  createdAt: string
  updatedAt: string
  order?: {
    id: string
    shopify_id: string
    created_at: string
    order_items: {
      target_sku: string
      quantity: number
    }[]
  }
}

interface GroupedRequest {
  sku: string
  requests: PendingRequest[]
  totalQuantity: number
  status: string
  createdAt: string
}

export default function ProductionPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [quantity, setQuantity] = useState(0)

  // Group requests by SKU
  const groupedRequests = requests.reduce<Record<string, GroupedRequest>>((acc, request) => {
    const sku = request.metadata?.sku || 'Unknown'
    if (!acc[sku]) {
      acc[sku] = {
        sku,
        requests: [],
        totalQuantity: 0,
        status: request.status,
        createdAt: request.createdAt
      }
    }
    acc[sku].requests.push(request)
    acc[sku].totalQuantity += request.metadata?.quantity || 0
    // Update status based on priority: IN_PROGRESS > PENDING > COMPLETED
    if (request.status === 'IN_PROGRESS' || 
        (request.status === 'PENDING' && acc[sku].status === 'COMPLETED')) {
      acc[sku].status = request.status
    }
    // Keep earliest created date
    if (new Date(request.createdAt) < new Date(acc[sku].createdAt)) {
      acc[sku].createdAt = request.createdAt
    }
    return acc
  }, {})

  const columns: Column<GroupedRequest>[] = [
    {
      key: "select",
      label: "",
      render: (value, row) => (
        <input
          type="checkbox"
          checked={row.requests.every(r => selectedRequests.includes(r.id))}
          onChange={(e) => {
            const requestIds = row.requests.map(r => r.id)
            if (e.target.checked) {
              setSelectedRequests(prev => [...prev, ...requestIds.filter(id => !prev.includes(id))])
            } else {
              setSelectedRequests(prev => prev.filter(id => !requestIds.includes(id)))
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300"
        />
      )
    },
    {
      key: "sku",
      label: "SKU",
      render: (value, row) => (
        <div className="font-mono">{row.sku}</div>
      )
    },
    {
      key: "totalQuantity",
      label: "Total Quantity",
      render: (value, row) => row.totalQuantity.toString()
    },
    {
      key: "requests",
      label: "Requests",
      render: (value, row) => row.requests.length.toString()
    },
    {
      key: "status",
      label: "Status",
      render: (value, row) => (
        <Badge
          variant={
            row.status === 'PENDING'
              ? 'warning'
              : row.status === 'IN_PROGRESS'
              ? 'secondary'
              : 'success'
          }
        >
          {row.status}
        </Badge>
      )
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value, row) => {
        const date = new Date(row.createdAt)
        return date.toLocaleString()
      }
    }
  ]

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/production/requests')
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.requests)
      } else {
        toast.error('Failed to fetch requests')
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBatch = async () => {
    if (!selectedRequests.length || !quantity) {
      toast.error('Please select requests and enter quantity')
      return
    }

    try {
      const selectedRequest = requests.find(r => r.id === selectedRequests[0])
      if (!selectedRequest) {
        toast.error('Selected request not found')
        return
      }

      const response = await fetch('/api/production/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          quantity,
          metadata: {
            sku: selectedRequest.metadata.sku,
            universal_sku: selectedRequest.metadata.universal_sku
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Production batch created')
        setDialogOpen(false)
        setSelectedRequests([])
        setQuantity(0)
        fetchRequests()
      } else {
        toast.error(data.error || 'Failed to create batch')
      }
    } catch (error) {
      console.error('Error creating batch:', error)
      toast.error('Failed to create batch')
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Production</h1>
          <p className="text-muted-foreground">
            Manage and group production requests into batches.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={!selectedRequests.length}
        >
          Create Batch
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={Object.values(groupedRequests)}
        isLoading={loading}
        onRowClick={(row) => {
          setExpandedRows(prev => 
            prev.includes(row.sku) 
              ? prev.filter(id => id !== row.sku)
              : [...prev, row.sku]
          )
        }}
        renderRowDetails={(row) => {
          if (!expandedRows.includes(row.sku)) return null
          
          return (
            <div className="p-4 bg-muted/50 border-t border-border">
              <div className="space-y-4">
                <div className="text-sm font-medium">Orders</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {row.requests.map(request => (
                    request.order ? (
                      <div 
                        key={request.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-mono text-sm">
                              {request.order.shopify_id}
                            </div>
                            <Badge variant="outline">
                              {request.metadata.quantity} units
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created {new Date(request.order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        key={request.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-mono text-sm">
                              No order attached
                            </div>
                            <Badge variant="outline">
                              {request.metadata.quantity} units
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Production Batch</DialogTitle>
            <DialogDescription>
              Enter the quantity for this production batch.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBatch}>
              Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 