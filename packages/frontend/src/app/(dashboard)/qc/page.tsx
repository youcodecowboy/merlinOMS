"use client"

import { useEffect, useState } from "react"
import { QCRequestsTable } from "./components/QCRequestsTable"
import { QRScanner } from "@/components/qr/QRScanner"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Scan } from "lucide-react"

export default function QCPage() {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [scannerOpen, setScannerOpen] = useState(false)

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/requests/qc')
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.requests)
      } else {
        throw new Error(data.error || 'Failed to fetch QC requests')
      }
    } catch (error) {
      console.error('Error fetching QC requests:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch QC requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScan = async (qrCode: string) => {
    try {
      const response = await fetch('/api/inventory/items/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrCode })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      if (data.request) {
        toast.success('QC request created')
        setScannerOpen(false)
        fetchRequests()
      } else {
        toast.info(data.message)
      }
    } catch (error) {
      console.error('Error scanning item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to scan item')
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Control</h1>
          <p className="text-muted-foreground">
            Manage and track quality control requests for items returning from laundry
          </p>
        </div>
        <Button onClick={() => setScannerOpen(true)}>
          <Scan className="mr-2 h-4 w-4" />
          Scan Item
        </Button>
      </div>

      <QCRequestsTable
        requests={requests}
        onRequestComplete={fetchRequests}
      />

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Item QR Code</DialogTitle>
          </DialogHeader>
          <QRScanner
            onScan={handleScan}
            onError={(error) => toast.error(error)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
} 