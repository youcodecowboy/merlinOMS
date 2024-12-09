"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/PageHeader"
import { WashBinsTable } from "../components/WashBinsTable"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { QrCode, Box } from "lucide-react"
import { ScanOutDialog } from "../components/ScanOutDialog"
import Link from "next/link"

interface InventoryItem {
  id: string
  sku: string
  status1: string
  status2: string
  location: string
  metadata?: Record<string, any>
}

const WASH_BINS = ['STARDUST', 'INDIGO', 'ONYX', 'JAGGER'] as const
type WashBin = typeof WASH_BINS[number]

interface BinContents {
  name: WashBin
  items: InventoryItem[]
  capacity: number
}

export default function WashBinsPage() {
  const [bins, setBins] = useState<Record<WashBin, BinContents>>(() => {
    // Initialize empty bins
    return WASH_BINS.reduce((acc, bin) => ({
      ...acc,
      [bin]: {
        name: bin,
        items: [],
        capacity: 100 // Default capacity
      }
    }), {} as Record<WashBin, BinContents>)
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isScanOutDialogOpen, setIsScanOutDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
    // Set up polling every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      console.log('Fetching items in wash bins...')
      const response = await fetch('/api/inventory/items?location=WASH')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Failed to fetch wash items: ${errorText}`)
      }

      const data = await response.json()
      console.log('Received data:', data)

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch wash items')
      }

      // Group items by their bin location
      const updatedBins = { ...bins }
      WASH_BINS.forEach(bin => {
        updatedBins[bin].items = data.items.filter(
          (item: InventoryItem) => item.location === bin
        )
      })

      setBins(updatedBins)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load wash items',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanOut = async (binQrCode: string) => {
    try {
      const response = await fetch('/api/wash/scan-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ binQrCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan out bin')
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to scan out bin')
      }

      toast({
        title: 'Success',
        description: `Successfully scanned out ${data.itemsUpdated} items from bin ${data.binCode}`,
      })

      // Refresh the data
      await fetchData()
    } catch (error) {
      console.error('Error scanning out bin:', error)
      throw error // Re-throw to be handled by the dialog
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <PageHeader
          title="Wash Bins"
          description="Monitor and manage items in wash bins"
        />
        <div className="flex gap-2">
          <Link href="/wash/laundry">
            <Button variant="outline" className="gap-2">
              <Box className="h-4 w-4" />
              View Laundry Items
            </Button>
          </Link>
          <Button onClick={() => setIsScanOutDialogOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Scan Out Bin
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading wash bins...</div>
        </div>
      ) : (
        <Tabs defaultValue="STARDUST" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            {WASH_BINS.map(bin => (
              <TabsTrigger key={bin} value={bin}>
                {bin.charAt(0) + bin.slice(1).toLowerCase()}
              </TabsTrigger>
            ))}
          </TabsList>

          {WASH_BINS.map(bin => (
            <TabsContent key={bin} value={bin}>
              <WashBinsTable bin={bins[bin]} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <ScanOutDialog
        isOpen={isScanOutDialogOpen}
        onClose={() => setIsScanOutDialogOpen(false)}
        onScanOut={handleScanOut}
      />
    </div>
  )
} 