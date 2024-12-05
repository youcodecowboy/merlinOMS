"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Scissors } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PendingRequest {
  id: string
  sku: string
  quantity: number
  orderIds: string[]
  status: string
  type: 'PRODUCTION' | 'PATTERN'
  requiresApproval: boolean
  createdAt: string
  updatedAt: string
}

interface BatchDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedSku: string
  baseQuantity: number
  onConfirm: (quantity: number) => void
}

function BatchDialog({ isOpen, onClose, selectedSku, baseQuantity, onConfirm }: BatchDialogProps) {
  const [quantity, setQuantity] = useState(baseQuantity)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Production Batch</DialogTitle>
          <DialogDescription>
            Create a new production batch for {selectedSku}. You can adjust the quantity if needed.
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
              min={baseQuantity}
            />
            <p className="text-sm text-muted-foreground">
              Minimum quantity: {baseQuantity} (based on waitlist)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(quantity)}>Create Batch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const columns = [
  { 
    key: 'sku' as keyof PendingRequest,
    label: "Universal SKU",
  },
  { 
    key: 'quantity' as keyof PendingRequest,
    label: "Quantity",
  },
  { 
    key: 'orderIds' as keyof PendingRequest,
    label: "Waiting Orders",
    render: (value: string[]) => value.length
  },
  { 
    key: 'type' as keyof PendingRequest,
    label: "Type",
    render: (value: string) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        value === 'PRODUCTION' 
          ? "bg-yellow-500/10 text-yellow-500"
          : "bg-blue-500/10 text-blue-500"
      )}>
        {value}
      </div>
    )
  },
  { 
    key: 'createdAt' as keyof PendingRequest,
    label: "Created",
    render: (value: string) => new Date(value).toLocaleString()
  },
  { 
    key: 'requiresApproval' as keyof PendingRequest,
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
        // Only allow selection if no other SKU is selected
        const selectedSku = requests.find(r => r.id === prev[0])?.sku
        if (!selectedSku || selectedSku === request.sku) {
          return [...prev, request.id]
        }
        toast.error('Can only select requests for the same SKU')
        return prev
      }
    })
  }

  const getSelectedSku = () => {
    if (selectedRequests.length === 0) return null
    return requests.find(r => r.id === selectedRequests[0])?.sku || null
  }

  const getBaseQuantity = () => {
    return selectedRequests.reduce((total, requestId) => {
      const request = requests.find(r => r.id === requestId)
      return total + (request?.quantity || 0)
    }, 0)
  }

  const handleCreateBatch = async (quantity: number) => {
    try {
      const response = await fetch('/api/production/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          quantity,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        // Create a blob from the base64 PDF data
        const binaryString = atob(data.data.pdf)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const pdfBlob = new Blob([bytes], { type: 'application/pdf' })

        // Create download link
        const url = window.URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `batch-${data.data.batchId}-qr-codes.pdf`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        toast.success('Production batch created')
        setSelectedRequests([])
        fetchRequests()
      } else {
        toast.error(data.error || 'Failed to create batch')
      }
    } catch (error) {
      console.error('Error creating batch:', error)
      toast.error('Error creating production batch')
    }
    setIsDialogOpen(false)
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
          onClick={() => setIsDialogOpen(true)}
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

      <BatchDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedSku={getSelectedSku() || ''}
        baseQuantity={getBaseQuantity()}
        onConfirm={handleCreateBatch}
      />
    </div>
  )
} 