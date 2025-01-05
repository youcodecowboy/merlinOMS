"use client"

import { useState } from "react"
import { QRScanner } from "./QRScanner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrCode } from "lucide-react"
import { toast } from "sonner"

export function FloatingQRScanner() {
  const [isOpen, setIsOpen] = useState(false)

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
        setIsOpen(false)
      } else {
        toast.info(data.message)
      }
    } catch (error) {
      console.error('Error scanning item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to scan item')
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <QrCode className="h-6 w-6" />
          <span className="sr-only">Open QR Scanner</span>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
    </>
  )
} 