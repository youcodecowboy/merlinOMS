"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Plus } from "lucide-react"
import { CreateBinDialog } from "@/components/bins/CreateBinDialog"
import { toast } from "sonner"
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
  metadata: {
    rack: string
    shelf: string
    position: string
  }
}

export default function BinsPage() {
  const [bins, setBins] = useState<Bin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    fetchBins()
  }, [])

  const fetchBins = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/inventory/bins')
      const data = await response.json()
      
      if (data.success) {
        setBins(data.bins)
      } else {
        toast.error(data.error || 'Failed to fetch bins')
      }
    } catch (error) {
      console.error('Error fetching bins:', error)
      toast.error('Failed to fetch bins')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    fetchBins()
  }

  const columns = [
    {
      key: "code",
      label: "Bin Code",
      sortable: true,
      render: (value: string, row: Bin) => (
        <Link 
          href={`/inventory/bins/${row.id}`}
          className="font-mono text-primary hover:underline"
        >
          {value}
        </Link>
      )
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
      )
    },
    {
      key: "zone",
      label: "Zone",
      sortable: true,
      render: (value: string, row: Bin) => (
        <div className="space-y-1">
          <div>Zone {value}</div>
          <div className="text-xs text-muted-foreground">
            Rack {row.metadata.rack}, Shelf {row.metadata.shelf}
          </div>
        </div>
      )
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
      )
    },
    {
      key: "qr_code",
      label: "QR Code",
      render: (value: string) => value || '-'
    },
    {
      key: "updated_at",
      label: "Last Updated",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleString()
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bins</h1>
          <p className="text-muted-foreground">
            Manage and track your storage bins across all zones.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bin
        </Button>
      </div>

      <DataTable
        data={bins}
        columns={columns}
        isLoading={isLoading}
      />

      <CreateBinDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
} 