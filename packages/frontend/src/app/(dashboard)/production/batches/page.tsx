"use client"

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
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductionBatch {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  items: {
    sku: string
    quantity: number
    waitlist_count: number
  }[]
  created_at: string
  estimated_completion: string
  assigned_to?: string
  notes?: string
}

const productionBatches: ProductionBatch[] = [
  {
    id: 'PB001',
    status: 'IN_PROGRESS',
    items: [
      { sku: 'ST-32-R-36-RAW', quantity: 10, waitlist_count: 8 },
      { sku: 'ST-34-R-36-BRW', quantity: 15, waitlist_count: 12 }
    ],
    created_at: '2024-01-15',
    estimated_completion: '2024-01-20',
    assigned_to: 'John Doe',
    notes: 'Priority batch for backorders'
  },
  {
    id: 'PB002',
    status: 'PENDING',
    items: [
      { sku: 'PT-32-S-36-RAW', quantity: 8, waitlist_count: 5 }
    ],
    created_at: '2024-01-14',
    estimated_completion: '2024-01-19'
  },
  {
    id: 'PB003',
    status: 'COMPLETED',
    items: [
      { sku: 'ST-30-R-32-RAW', quantity: 12, waitlist_count: 0 },
      { sku: 'ST-32-R-32-RAW', quantity: 8, waitlist_count: 0 }
    ],
    created_at: '2024-01-10',
    estimated_completion: '2024-01-15',
    assigned_to: 'Jane Smith',
    notes: 'Regular production batch'
  }
]

const columns = [
  {
    key: 'id' as keyof ProductionBatch,
    label: 'Batch ID',
    sortable: true,
  },
  {
    key: 'items' as keyof ProductionBatch,
    label: 'Items',
    render: (items: ProductionBatch['items']) => (
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="font-mono">{item.sku}</span>
            <div className="flex items-center gap-2">
              <span>×{item.quantity}</span>
              {item.waitlist_count > 0 && (
                <div className="flex items-center gap-1 text-orange-500">
                  <Timer className="h-3 w-3" />
                  <span className="text-xs">{item.waitlist_count}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    key: 'status' as keyof ProductionBatch,
    label: 'Status',
    sortable: true,
    render: (value: ProductionBatch['status']) => {
      const styles = {
        PENDING: 'bg-yellow-500/10 text-yellow-500',
        IN_PROGRESS: 'bg-blue-500/10 text-blue-500',
        COMPLETED: 'bg-green-500/10 text-green-500',
        FAILED: 'bg-red-500/10 text-red-500'
      }[value]

      const icons = {
        PENDING: AlertTriangle,
        IN_PROGRESS: Scissors,
        COMPLETED: CheckCircle,
        FAILED: XCircle
      } as const

      const Icon = icons[value]

      return (
        <div className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          styles
        )}>
          <Icon className="h-3.5 w-3.5" />
          {value}
        </div>
      )
    }
  },
  {
    key: 'estimated_completion' as keyof ProductionBatch,
    label: 'Est. Completion',
    sortable: true,
  },
  {
    key: 'assigned_to' as keyof ProductionBatch,
    label: 'Assigned To',
    sortable: true,
  }
]

export default function ProductionBatchesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Batches</h1>
          <p className="text-muted-foreground">
            View and manage production batches across all stages.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <Scissors className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">1</p>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        data={productionBatches}
        columns={columns}
        onRowClick={(row) => {
          console.log('Viewing batch:', row.id)
        }}
      />
    </div>
  )
} 