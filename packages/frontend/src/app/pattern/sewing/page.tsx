"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useToast } from '@/components/ui/use-toast'
import { useSewingRequests } from '../hooks/useSewingRequests'
import { PageHeader } from '@/components/PageHeader'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkuInfo {
  sku: string
  quantity: number
  fabric_type?: string
  color?: string
  size?: string
  style?: string
  fabricCode?: string
  fabricConsumption?: number
  shadeCode?: string
}

interface SewingRequest {
  id: string
  status: string
  metadata: {
    skus: SkuInfo[]
    total_quantity: number
    pattern_request_ids: string[]
    notes: string
    cutting_completion_data?: {
      fabricCode: string
      fabricConsumption: number
      shadeCode: string
      notes: string
    }
  }
  created_at: string
}

export default function SewingPage() {
  const { data, error, isLoading } = useSewingRequests()
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const { toast } = useToast()

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const columns = [
    {
      key: 'id',
      label: 'Request #',
      render: (row: SewingRequest | null) => {
        if (!row?.id) return '-'
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
            <span>{row.id}</span>
          </div>
        )
      }
    },
    {
      key: 'metadata',
      label: 'Total Quantity',
      render: (row: SewingRequest | null) => {
        if (!row?.metadata) return 0
        return row.metadata.total_quantity || 0
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: SewingRequest | null) => {
        if (!row?.status) return '-'
        return (
          <div className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
            {
              'bg-blue-500/10 text-blue-500': row.status === 'SEW',
              'bg-green-500/10 text-green-500': row.status === 'COMPLETED',
              'bg-gray-500/10 text-gray-500': !row.status
            }
          )}>
            {row.status}
          </div>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row: SewingRequest | null) => {
        if (!row?.created_at) return 'Unknown'
        return new Date(row.created_at).toLocaleDateString()
      }
    }
  ]

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600">Error loading sewing requests: {error.message}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div>Loading sewing requests...</div>
      </div>
    )
  }

  const requests = data?.requests || []

  if (!Array.isArray(requests) || requests.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Sewing"
          description="View active sewing requests"
        />
        <div className="p-4">
          <div className="text-muted-foreground">No sewing requests found.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sewing"
        description="View active sewing requests"
      />

      <DataTable<SewingRequest>
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
                  {(row.metadata?.skus?.length ?? 0) > 0 ? (
                    row.metadata.skus.map((sku: SkuInfo) => (
                      <div 
                        key={`${row.id}-${sku.sku}-${sku.quantity}-${sku.fabric_type || ''}`} 
                        className="p-3 rounded-lg border border-border bg-background"
                      >
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-foreground">{sku.sku}</span>
                            <span className="text-sm text-muted-foreground">Qty: {sku.quantity}</span>
                          </div>
                          <div className="text-sm space-y-1 text-muted-foreground">
                            {sku.fabric_type && <div>Fabric: {sku.fabric_type}</div>}
                            {sku.color && <div>Color: {sku.color}</div>}
                            {sku.size && <div>Size: {sku.size}</div>}
                            {sku.style && <div>Style: {sku.style}</div>}
                          </div>
                          {row.metadata.cutting_completion_data && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <div className="text-sm space-y-1 text-muted-foreground">
                                <div>Fabric Code: {row.metadata.cutting_completion_data.fabricCode}</div>
                                <div>Fabric Used: {row.metadata.cutting_completion_data.fabricConsumption}m</div>
                                <div>Shade Code: {row.metadata.cutting_completion_data.shadeCode}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground col-span-3">No SKUs found</div>
                  )}
                </div>
                {row.metadata?.notes && (
                  <div className="mt-4 text-sm">
                    <strong className="text-foreground">Notes:</strong>
                    <p className="text-muted-foreground mt-1">{row.metadata.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )
        }}
      />
    </div>
  )
} 