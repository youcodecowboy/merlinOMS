"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DataTable, Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftCircle as ArrowLeft, Box, Package } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface BinItem {
  id: string
  sku: string
  qr_code: string
  added_at: string
  name?: string
  status1?: string
  status2?: string
}

interface BinSlot {
  id: string
  position: number
  item: BinItem | null
}

interface Bin {
  id: string
  code: string
  type: string
  zone: string
  capacity: number
  current_count: number
  is_active: boolean
  metadata: {
    rack: string
    shelf: string
    position: string
  }
  items: BinItem[]
}

export default function BinPage() {
  const params = useParams()
  const [bin, setBin] = useState<Bin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params?.binId) {
      fetchBin()
    }
  }, [params?.binId])

  const fetchBin = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/inventory/bins/${params?.binId}`)
      const data = await response.json()
      
      if (data.success) {
        setBin(data.bin)
      } else {
        toast.error(data.error || 'Failed to fetch bin')
      }
    } catch (error) {
      console.error('Error fetching bin:', error)
      toast.error('Failed to fetch bin')
    } finally {
      setIsLoading(false)
    }
  }

  // Create array of slots, filling empty positions
  const slots: BinSlot[] = bin ? Array.from({ length: bin.capacity }, (_, i) => {
    const item = bin.items.find(item => item.id === `slot-${i + 1}`)
    return {
      id: `slot-${i + 1}`,
      position: i + 1,
      item: item || null
    }
  }) : []

  const columns: Column<BinSlot>[] = [
    {
      key: "position",
      label: "Position",
      render: (row) => (
        <div className="font-mono">
          {row.position}
        </div>
      )
    },
    {
      key: "item",
      label: "Item",
      render: (row) => {
        if (!row.item) return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Empty</span>
          </div>
        )
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              <span className="font-medium">{row.item.name || 'Unnamed Item'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">SKU: {row.item.sku}</span>
              {row.item.status1 && row.item.status2 && (
                <Badge variant="secondary">
                  {row.item.status1} • {row.item.status2}
                </Badge>
              )}
            </div>
          </div>
        )
      }
    }
  ]

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!bin) {
    return <div>Bin not found</div>
  }

  const usagePercent = (bin.current_count / bin.capacity) * 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/inventory/bins">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Bins
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{bin.code}</h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">
              Zone {bin.zone}, Rack {bin.metadata.rack}, Shelf {bin.metadata.shelf}
            </p>
            <Badge variant={bin.is_active ? "default" : "destructive"}>
              {bin.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
            <span className="text-sm font-medium text-muted-foreground">Capacity</span>
            <div className="space-y-2">
              <div className="flex justify-between text-2xl font-bold">
                <span>{bin.current_count} / {bin.capacity}</span>
                <span className={cn(
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
          </div>
        </div>
      </div>

      <DataTable
        data={slots}
        columns={columns}
        isLoading={isLoading}
      />
    </div>
  )
} 