"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable, Column } from "@/components/ui/data-table"
import { Plus, Package } from "lucide-react"
import { CreateBinDialog } from "@/components/bins/CreateBinDialog"
import { toast } from "sonner"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

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

  const columns: Column<Bin>[] = [
    {
      key: "id",
      label: "Bin ID",
      sortable: true,
      render: (row) => (
        <Link href={`/inventory/bins/${row.id}`} className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{row.code}</span>
          <Badge variant={row.is_active ? "outline" : "destructive"} className="ml-2">
            {row.is_active ? "Active" : "Inactive"}
          </Badge>
        </Link>
      )
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary">
          {row.type}
        </Badge>
      )
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      render: (row) => (
        <div className="font-mono">
          Zone {row.zone} • Rack {row.metadata?.rack || '?'} • Shelf {row.metadata?.shelf || '?'}
        </div>
      )
    },
    {
      key: "capacity",
      label: "Capacity",
      sortable: true,
      render: (row) => {
        const usagePercent = (row.current_count / row.capacity) * 100
        return (
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{row.current_count} / {row.capacity}</span>
              <span className={cn(
                "font-medium",
                usagePercent >= 90 ? "text-red-500" :
                usagePercent >= 75 ? "text-yellow-500" :
                "text-green-500"
              )}>
                {Math.round(usagePercent)}%
              </span>
            </div>
            <Progress 
              value={usagePercent} 
              className={cn(
                usagePercent >= 90 ? "bg-red-100" :
                usagePercent >= 75 ? "bg-yellow-100" :
                "bg-green-100"
              )}
              indicatorClassName={cn(
                usagePercent >= 90 ? "bg-red-500" :
                usagePercent >= 75 ? "bg-yellow-500" :
                "bg-green-500"
              )}
            />
          </div>
        )
      }
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