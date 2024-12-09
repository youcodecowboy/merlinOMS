"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/PageHeader"
import { DataTable } from "@/components/ui/data-table"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Box } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LaundryItem {
  id: string
  sku: string
  status1?: string
  status2?: string
  location: string
  metadata?: {
    scanned_out_at?: string
    previous_sku?: string
    previous_location?: string
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

interface WashMetrics {
  STARDUST: number
  INDIGO: number
  ONYX: number
  JAGGER: number
}

const WASH_COLORS = {
  STARDUST: { name: 'Stardust', color: 'bg-zinc-100/10 hover:bg-zinc-100/20' },
  INDIGO: { name: 'Indigo', color: 'bg-indigo-500/10 hover:bg-indigo-500/20' },
  ONYX: { name: 'Onyx', color: 'bg-slate-500/10 hover:bg-slate-500/20' },
  JAGGER: { name: 'Jagger', color: 'bg-purple-500/10 hover:bg-purple-500/20' }
} as const

export default function LaundryPage() {
  const [items, setItems] = useState<LaundryItem[]>([])
  const [metrics, setMetrics] = useState<WashMetrics>({
    STARDUST: 0,
    INDIGO: 0,
    ONYX: 0,
    JAGGER: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
    // Set up polling every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      console.log('Fetching laundry items...')
      const response = await fetch('/api/inventory/items?location=LAUNDRY')
      
      if (!response.ok) {
        throw new Error('Failed to fetch laundry items')
      }

      const data = await response.json()
      console.log('Received data:', data)

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch laundry items')
      }

      // Ensure all items have the required properties
      const processedItems = (data.items || []).map((item: any) => ({
        id: item.id || 'Unknown',
        sku: item.sku || 'Unknown SKU',
        status1: item.status1 || 'Unknown',
        status2: item.status2 || 'Unknown',
        location: item.location || 'LAUNDRY',
        metadata: item.metadata || {},
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }))

      setItems(processedItems)

      // Calculate metrics
      const newMetrics = {
        STARDUST: 0,
        INDIGO: 0,
        ONYX: 0,
        JAGGER: 0
      }

      processedItems.forEach((item: LaundryItem) => {
        // Check both previous location and wash_type to determine wash type
        const washType = item.metadata?.wash_type || item.metadata?.previous_location
        if (washType && Object.keys(WASH_COLORS).includes(washType)) {
          newMetrics[washType as keyof WashMetrics]++
        }
      })

      setMetrics(newMetrics)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load laundry items',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <PageHeader
          title="Laundry Items"
          description="Track items currently at laundry"
        />
        <Link href="/wash/bins">
          <Button variant="outline" className="gap-2">
            <Box className="h-4 w-4" />
            View Wash Bins
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(WASH_COLORS).map(([key, { name, color }]) => (
          <Card key={key} className={`${color} transition-colors border-border`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">{name} Wash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metrics[key as keyof WashMetrics]}</div>
              <p className="text-xs text-muted-foreground mt-1">items at laundry</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading laundry items...</div>
        </div>
      ) : (
        <div className="rounded-lg border">
          <DataTable
            data={items}
            columns={[
              {
                key: "order",
                label: "Order #",
                render: (row: LaundryItem | undefined) => {
                  if (!row) return <div className="font-mono">-</div>
                  return (
                    <div className="font-mono">
                      {row.metadata?.order_id || '-'}
                    </div>
                  )
                }
              },
              {
                key: "sku",
                label: "SKU",
                render: (row: LaundryItem | undefined) => {
                  if (!row) return <div className="font-mono">Unknown SKU</div>
                  return (
                    <div className="font-mono">
                      {row.sku}
                    </div>
                  )
                }
              },
              {
                key: "qr_code",
                label: "QR ID",
                render: (row: LaundryItem | undefined) => {
                  if (!row) return <div className="font-mono">-</div>
                  return (
                    <div className="font-mono">
                      {row.qr_code || '-'}
                    </div>
                  )
                }
              },
              {
                key: "location",
                label: "Location",
                render: (row: LaundryItem | undefined) => {
                  if (!row) return <div className="text-sm">-</div>
                  return (
                    <div className="text-sm">
                      {row.location}
                    </div>
                  )
                }
              },
              {
                key: "scanned_out",
                label: "Scanned Out",
                render: (row: LaundryItem | undefined) => {
                  if (!row) return <div className="text-sm text-muted-foreground">N/A</div>
                  return (
                    <div className="text-sm text-muted-foreground">
                      {row.metadata?.scanned_out_at ? 
                        new Date(row.metadata.scanned_out_at).toLocaleString() :
                        'N/A'
                      }
                    </div>
                  )
                }
              }
            ]}
          />
        </div>
      )}
    </div>
  )
} 