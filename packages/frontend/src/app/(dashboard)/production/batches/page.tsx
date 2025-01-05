"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface ProductionBatch {
  id: string
  sku: string
  quantity: number
  status: string
  created_at: string
  updated_at: string
  requests_count: number
  items_count: number
  pattern: {
    id: string
    status: string
    created_at: string
  } | null
}

type Column = {
  key: keyof ProductionBatch
  label: string
  render?: (row: ProductionBatch) => React.ReactNode
}

export default function ProductionBatchesPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/production/batches')
      const data = await response.json()
      
      if (data.success) {
        console.log('Fetched batches:', data.batches)
        setBatches(data.batches || [])
      } else {
        setError(data.error || 'Failed to fetch batches')
        toast.error(data.error || 'Failed to fetch batches')
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
      setError('Failed to fetch batches')
      toast.error('Failed to fetch batches')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleRow = (id: string) => {
    if (!id) return;
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const columns: Column[] = [
    {
      key: 'id',
      label: 'Batch ID',
      render: (row) => {
        if (!row?.id) return null;
        const isExpanded = expandedRows.includes(row.id)
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleRow(row.id)
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <span className="font-mono">{row.id}</span>
          </div>
        )
      }
    },
    {
      key: 'sku',
      label: 'SKU',
      render: (row) => (
        <div className="font-mono">
          {row.sku || '-'}
        </div>
      )
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (row) => {
        if (!row) return null;
        return (
          <div className="flex items-center space-x-2">
            <span>{row.quantity || 0}</span>
            <span className="text-muted-foreground text-xs">
              ({row.items_count || 0} created)
            </span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'PENDING'
              ? 'warning'
              : row.status === 'IN_PROGRESS'
              ? 'secondary'
              : 'success'
          }
        >
          {row.status || 'UNKNOWN'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '-'
    }
  ]

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production Batches</h1>
          <p className="text-muted-foreground">
            View and manage production batches.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={batches}
        isLoading={isLoading}
        onRowClick={(row) => {
          if (row?.id) {
            toggleRow(row.id)
          }
        }}
        renderRowDetails={(row: ProductionBatch) => {
          if (!row?.id || !expandedRows.includes(row.id)) return null;
          
          return (
            <div className="p-4 bg-muted/50 border-t border-border">
              <div className="space-y-4">
                <div className="text-sm font-medium">Batch Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Production Requests</div>
                        <Badge variant="outline">{row.requests_count || 0}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Items Created</div>
                        <Badge variant="outline">{row.items_count || 0} / {row.quantity || 0}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Pattern Status</div>
                        {row.pattern ? (
                          <Badge variant={
                            row.pattern.status === 'PENDING'
                              ? 'warning'
                              : row.pattern.status === 'IN_PROGRESS'
                              ? 'secondary'
                              : 'success'
                          }>
                            {row.pattern.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Pattern</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }}
      />
    </div>
  )
} 