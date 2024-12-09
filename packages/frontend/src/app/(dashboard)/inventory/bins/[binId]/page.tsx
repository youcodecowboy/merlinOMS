"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Box } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface BinItem {
  id: string
  sku: string
  qr_code: string
  added_at: string
}

interface BinSlot {
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
  const params = useParams<{ binId: string }>()
  const [bin, setBin] = useState<Bin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params.binId) {
      fetchBin()
    }
  }, [params.binId])

  const fetchBin = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/inventory/bins/${params.binId}`)
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
      position: i + 1,
      item: item || null
    }
  }) : []

  const columns = [
    {
      key: "position",
      label: "Position",
      render: (value: number) => (
        <div className="font-mono">{value}</div>
      )
    },
    {
      key: "item",
      label: "Status",
      render: (value: BinItem | null) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Occupied" : "Empty"}
        </Badge>
      )
    },
    {
      key: "item",
      label: "SKU",
      render: (value: BinItem | null) => (
        value ? (
          <Link 
            href={`/inventory/${value.id}`}
            className="font-mono text-primary hover:underline"
          >
            {value.sku}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: "item",
      label: "QR ID",
      render: (value: BinItem | null) => (
        value ? (
          <div className="font-mono">{value.qr_code}</div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: "item",
      label: "Added",
      render: (value: BinItem | null) => (
        value ? (
          <div>{new Date(value.added_at).toLocaleString()}</div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    }
  ]

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!bin) {
    return <div>Bin not found</div>
  }

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
          <div className="flex items-center gap-2 rounded-lg border bg-card p-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Capacity</span>
              <span className="text-2xl font-bold">{bin.capacity}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Occupied</span>
              <span className={cn(
                "text-2xl font-bold",
                bin.current_count >= bin.capacity ? "text-red-500" :
                bin.current_count >= bin.capacity * 0.8 ? "text-yellow-500" :
                "text-green-500"
              )}>
                {bin.current_count}
              </span>
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