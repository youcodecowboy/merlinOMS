"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useCuttingRequests } from '../hooks/useCuttingRequests'
import { PageHeader } from '@/components/PageHeader'
import { ChevronDown, ChevronRight, Scissors, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CompletionFormData {
  fabricCode: string
  fabricConsumption: number
  shadeCode: string
  notes: string
}

interface SkuInfo {
  sku: string
  quantity: number
  fabric_type?: string
  color?: string
  size?: string
  style?: string
}

interface CuttingRequest {
  id: string
  status: string
  metadata: {
    pattern_request_ids: string[]
    sku_groups: {
      sku: string
      quantity: number
      pattern_requests: string[]
    }[]
    item_ids: string[]
  }
  created_at: string
}

export default function CuttingRequestsPage() {
  const { data, error, mutate, isLoading } = useCuttingRequests()
  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [selectedRequestForCompletion, setSelectedRequestForCompletion] = useState<string | null>(null)
  const [completionForm, setCompletionForm] = useState<CompletionFormData>({
    fabricCode: '',
    fabricConsumption: 0,
    shadeCode: '',
    notes: ''
  })
  const { toast } = useToast()

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const handleMarkComplete = (requestId: string) => {
    setSelectedRequestForCompletion(requestId)
    setCompletionDialogOpen(true)
  }

  const handleCompletionSubmit = async () => {
    if (!selectedRequestForCompletion) return

    try {
      const response = await fetch(`/api/requests/cutting/${selectedRequestForCompletion}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete cutting request')
      }

      toast({
        title: "Success",
        description: "Cutting request completed successfully",
      })

      setCompletionDialogOpen(false)
      setSelectedRequestForCompletion(null)
      setCompletionForm({
        fabricCode: '',
        fabricConsumption: 0,
        shadeCode: '',
        notes: ''
      })
      mutate()
    } catch (error) {
      console.error('Error completing cutting request:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to complete cutting request',
        variant: "destructive",
      })
    }
  }

  const columns = [
    {
      key: 'select',
      label: '',
      render: (row: CuttingRequest) => {
        const rowId = row?.id
        if (!rowId) return null
        return (
          <Checkbox
            checked={selectedRequests.includes(rowId)}
            onCheckedChange={(checked: boolean) => {
              setSelectedRequests(prev => 
                checked 
                  ? [...prev, rowId]
                  : prev.filter(id => id !== rowId)
              )
            }}
            aria-label="Select row"
          />
        )
      }
    },
    {
      key: 'id',
      label: 'Request #',
      render: (row: CuttingRequest) => {
        const rowId = row?.id
        if (!rowId) return null
        const isExpanded = expandedRows.includes(rowId)
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleRow(rowId)
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <span>{rowId}</span>
          </div>
        )
      }
    },
    {
      key: 'metadata',
      label: 'Total Quantity',
      render: (row: CuttingRequest) => {
        if (!row?.metadata?.sku_groups) return 0
        return row.metadata.sku_groups.reduce((total, group) => total + (group.quantity || 0), 0)
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: CuttingRequest) => {
        if (!row) return null
        const status = row.status || 'UNKNOWN'
        return (
          <div className={
            status === 'PENDING' ? 'text-yellow-600' :
            status === 'IN_PROGRESS' ? 'text-blue-600' :
            'text-green-600'
          }>
            {status}
          </div>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row: CuttingRequest) => {
        if (!row) return 'Unknown'
        return row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Unknown'
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: CuttingRequest) => {
        const rowId = row?.id
        if (!rowId) return null

        if (row.status === 'PENDING') {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                handleStartCutting(rowId)
              }}
            >
              <Scissors className="h-4 w-4 mr-2" />
              Start Cutting
            </Button>
          )
        }

        if (row.status === 'IN_PROGRESS') {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                handleMarkComplete(rowId)
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )
        }

        return null
      }
    }
  ] as const

  const handleStartCutting = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/cutting/${requestId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          started_at: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start cutting process')
      }

      toast({
        title: "Success",
        description: "Started cutting process successfully",
      })

      mutate()
    } catch (error) {
      console.error('Error starting cutting process:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start cutting process',
        variant: "destructive",
      })
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600">Error loading cutting requests: {error.message}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div>Loading cutting requests...</div>
      </div>
    )
  }

  const requests = data?.requests || []

  if (!Array.isArray(requests) || requests.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cutting Requests"
          description="Manage and process cutting requests"
        />
        <div className="p-4">
          <div className="text-gray-600">No cutting requests found.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cutting Requests"
        description="Manage and process cutting requests"
      />

      <div className="flex justify-end space-x-4">
        <Button
          onClick={handleStartCutting}
          disabled={selectedRequests.length === 0}
        >
          <Scissors className="mr-2 h-4 w-4" />
          Start Cutting
        </Button>
      </div>

      <DataTable<CuttingRequest>
        data={requests}
        columns={columns}
        onRowClick={(row) => {
          if (row.id) {
            toggleRow(row.id)
          }
        }}
        renderRowDetails={(row) => {
          if (!row.id || !expandedRows.includes(row.id)) return null
          
          return (
            <div className="p-4 bg-muted/50 border-t border-border">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(row.metadata?.sku_groups?.length ?? 0) > 0 ? (
                    row.metadata.sku_groups.map((group) => (
                      <div 
                        key={`${row.id}-${group.sku}`} 
                        className="p-3 rounded-lg border border-border bg-background"
                      >
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-foreground">{group.sku || 'UNKNOWN'}</span>
                            <span className="text-sm text-muted-foreground">Qty: {group.quantity || 0}</span>
                          </div>
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <div>Pattern Requests: {group.pattern_requests?.length || 0}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground col-span-3">No SKUs found</div>
                  )}
                </div>
                <div className="mt-4 text-sm">
                  <strong className="text-foreground">Pattern Request IDs:</strong>
                  <p className="text-muted-foreground mt-1 font-mono">
                    {row.metadata.pattern_request_ids.join(', ') || 'None'}
                  </p>
                </div>
              </div>
            </div>
          )
        }}
      />

      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Cutting Request</DialogTitle>
            <DialogDescription>
              Please provide the following information to complete the cutting request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fabricCode">Fabric Code</Label>
              <Input
                id="fabricCode"
                value={completionForm.fabricCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompletionForm(prev => ({ ...prev, fabricCode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fabricConsumption">Fabric Consumption (meters)</Label>
              <Input
                id="fabricConsumption"
                type="number"
                min="0"
                step="0.1"
                value={completionForm.fabricConsumption}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompletionForm(prev => ({ ...prev, fabricConsumption: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shadeCode">Shade Code</Label>
              <Input
                id="shadeCode"
                value={completionForm.shadeCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompletionForm(prev => ({ ...prev, shadeCode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={completionForm.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCompletionForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompletionSubmit}>
              Complete Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 