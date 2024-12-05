"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Plus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface InventoryItem {
  id: string
  sku: string
  status1: 'PRODUCTION' | 'STOCK' | 'WASH'
  status2: 'UNCOMMITTED' | 'COMMITTED' | 'ASSIGNED'
  location: string
  qr_code?: string
  bin_id?: string
  current_bin?: {
    id: string
    code: string
    zone: string
  } | null
  created_at: string
  updated_at: string
}

const columns: {
  key: keyof InventoryItem
  label: string
  sortable?: boolean
  render?: (value: any, item?: InventoryItem) => React.ReactNode
}[] = [
  {
    key: "id",
    label: "ID",
    sortable: true,
  },
  {
    key: "sku",
    label: "SKU",
    sortable: true,
  },
  {
    key: "status1",
    label: "Primary Status",
    sortable: true,
    render: (value: string) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          'bg-blue-500/10 text-blue-500': value === 'PRODUCTION',
          'bg-green-500/10 text-green-500': value === 'STOCK',
          'bg-yellow-500/10 text-yellow-500': value === 'WASH',
        }
      )}>
        {value}
      </div>
    ),
  },
  {
    key: "status2",
    label: "Secondary Status",
    sortable: true,
    render: (value: string) => (
      <div className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          'bg-gray-500/10 text-gray-500': value === 'UNCOMMITTED',
          'bg-purple-500/10 text-purple-500': value === 'COMMITTED',
          'bg-orange-500/10 text-orange-500': value === 'ASSIGNED',
        }
      )}>
        {value}
      </div>
    ),
  },
  {
    key: "location",
    label: "Location",
    sortable: true,
  },
  {
    key: "qr_code",
    label: "QR Code",
  },
  {
    key: "current_bin",
    label: "Bin",
    sortable: true,
    render: (bin: InventoryItem['current_bin']) => bin?.code || '-'
  },
  {
    key: "updated_at",
    label: "Last Updated",
    sortable: true,
    render: (value: string) => new Date(value).toLocaleString()
  },
]

export default function InventoryPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<InventoryItem[]>([])

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/inventory/items')
        const data = await response.json()
        
        if (data.success) {
          setItems(data.items)
        } else {
          toast.error('Failed to load inventory items')
        }
      } catch (error) {
        console.error('Error fetching inventory items:', error)
        toast.error('Error loading inventory items')
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage and track your inventory across all locations.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/inventory/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        onRowClick={(row) => {
          console.log("Clicked row:", row)
        }}
      />
    </div>
  )
} 