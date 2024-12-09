"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { 
  Scissors,
  Timer,
  PackageSearch,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
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
        setBatches(data.batches)
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
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const columns = [
    {
      key: 'id',
      label: 'Batch ID',
      render: (value: string, row: ProductionBatch) => {
        console.log('Rendering batch ID:', value, row)
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
      render: (value: string) => (
        <div className="font-mono">
          {value || '-'}
        </div>
      )
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (value: number, row: ProductionBatch) => (
        <div className="flex items-center space-x-2">
          <span>{value}</span>
          <span className="text-muted-foreground text-xs">
            ({row.items_count} created)
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge
          variant={
            value === 'PENDING'
              ? 'warning'
              : value === 'IN_PROGRESS'
              ? 'secondary'
              : 'success'
          }
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleString()
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
          toggleRow(row.id)
        }}
        renderRowDetails={(row) => {
          if (!expandedRows.includes(row.id)) return null
          
          return (
            <div className="p-4 bg-muted/50 border-t border-border">
              <div className="space-y-4">
                <div className="text-sm font-medium">Batch Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Production Requests</div>
                        <Badge variant="outline">{row.requests_count}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Items Created</div>
                        <Badge variant="outline">{row.items_count} / {row.quantity}</Badge>
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