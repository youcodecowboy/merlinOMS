"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Plus } from "lucide-react"
import Link from "next/link"

interface Bin {
  id: string
  code: string
  sku: string
  type: 'STORAGE' | 'PROCESSING' | 'SHIPPING' | 'TEMPORARY'
  zone: string
  capacity: number
  current_count: number
  is_active: boolean
  qr_code?: string
  created_at: string
  updated_at: string
}

// Sample data - this would come from your API
const binData: Bin[] = [
  {
    id: "BIN001",
    code: "BIN-A1",
    sku: "BIN-A1-ZONE1-SH1-RK1-P1",
    type: "STORAGE",
    zone: "ZONE1",
    capacity: 50,
    current_count: 30,
    is_active: true,
    qr_code: "QR-BIN001",
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
  },
  {
    id: "BIN002",
    code: "BIN-B2",
    sku: "BIN-B2-ZONE2-SH2-RK1-P1",
    type: "PROCESSING",
    capacity: 30,
    current_count: 15,
    zone: "ZONE2",
    is_active: true,
    created_at: "2024-01-14",
    updated_at: "2024-01-14",
  },
  {
    id: "BIN003",
    code: "BIN-C3",
    sku: "BIN-C3-ZONE1-SH3-RK2-P2",
    type: "SHIPPING",
    capacity: 40,
    current_count: 40,
    zone: "ZONE1",
    is_active: false,
    qr_code: "QR-BIN003",
    created_at: "2024-01-13",
    updated_at: "2024-01-13",
  },
]

type ColumnDef<T> = {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

const columns: ColumnDef<Bin>[] = [
  {
    key: "code",
    label: "Bin Code",
    sortable: true,
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (value: string) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          'bg-blue-500/10 text-blue-500': value === 'STORAGE',
          'bg-yellow-500/10 text-yellow-500': value === 'PROCESSING',
          'bg-green-500/10 text-green-500': value === 'SHIPPING',
          'bg-gray-500/10 text-gray-500': value === 'TEMPORARY',
        }
      )}>
        {value}
      </div>
    ),
  },
  {
    key: "zone",
    label: "Zone",
    sortable: true,
  },
  {
    key: "current_count",
    label: "Items",
    sortable: true,
    render: (value: number, row: Bin) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full",
              {
                'bg-green-500': (value / row.capacity) < 0.8,
                'bg-yellow-500': (value / row.capacity) >= 0.8 && (value / row.capacity) < 0.95,
                'bg-red-500': (value / row.capacity) >= 0.95,
              }
            )}
            style={{ width: `${(value / row.capacity) * 100}%` }}
          />
        </div>
        <span className="text-sm">
          {value}/{row.capacity}
        </span>
      </div>
    )
  },
  {
    key: "is_active",
    label: "Status",
    sortable: true,
    render: (value: boolean) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        value ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
      )}>
        {value ? 'Active' : 'Inactive'}
      </div>
    ),
  },
  {
    key: "qr_code",
    label: "QR Code",
    render: (value: string) => value || '-',
  },
  {
    key: "updated_at",
    label: "Last Updated",
    sortable: true,
  },
]

export default function BinsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bins</h1>
          <p className="text-muted-foreground">
            Manage and track your storage bins across all zones.
          </p>
        </div>
        <Link href="/inventory/bins/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Bin
          </Button>
        </Link>
      </div>

      <DataTable
        data={binData}
        columns={columns}
        onRowClick={(row) => {
          console.log("Clicked row:", row)
        }}
      />
    </div>
  )
} 