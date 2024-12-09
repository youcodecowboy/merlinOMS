import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { QrCode } from "lucide-react"

interface ScanOutDialogProps {
  isOpen: boolean
  onClose: () => void
  onScanOut: (binQrCode: string) => Promise<void>
}

export function ScanOutDialog({ isOpen, onClose, onScanOut }: ScanOutDialogProps) {
  const [binQrCode, setBinQrCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleScanOut = async () => {
    if (!binQrCode) {
      toast({
        title: "Error",
        description: "Please enter a bin QR code",
        variant: "destructive",
      })
      return
    }

    const normalizedBinCode = binQrCode.toUpperCase()
    if (!['STARDUST', 'INDIGO', 'ONYX', 'JAGGER'].includes(normalizedBinCode)) {
      toast({
        title: "Error",
        description: "Invalid bin name. Must be one of: STARDUST, INDIGO, ONYX, JAGGER",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await onScanOut(normalizedBinCode)
      toast({
        title: "Success",
        description: "Bin scanned out successfully",
      })
      onClose()
    } catch (error) {
      console.error("Error scanning out bin:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to scan out bin",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Out Wash Bin</DialogTitle>
          <DialogDescription>
            Scan the bin QR code to move all items to LAUNDRY and update their SKUs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bin-qr">Bin QR Code</Label>
            <div className="flex gap-2">
              <Input
                id="bin-qr"
                placeholder="Scan or enter bin QR code"
                value={binQrCode}
                onChange={(e) => setBinQrCode(e.target.value)}
              />
              <Button variant="outline" size="icon">
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleScanOut} disabled={isLoading}>
            {isLoading ? "Processing..." : "Scan Out Bin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 