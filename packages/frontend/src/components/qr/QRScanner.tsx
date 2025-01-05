import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { ScanLine, StopCircle, QrCode, XCircle } from "lucide-react"

interface QRScannerProps {
  onScan: (qrCode: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const startScanning = async () => {
    if (!containerRef.current) return

    try {
      const scanner = new Html5Qrcode("qr-scanner")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText: string) => {
          onScan(decodedText)
        },
        (errorMessage: string) => {
          console.error("QR Scan error:", errorMessage)
          onError?.(errorMessage)
        }
      )

      setIsScanning(true)
    } catch (error) {
      console.error("Error starting scanner:", error)
      onError?.(error instanceof Error ? error.message : "Failed to start scanner")
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
      } catch (error) {
        console.error("Error stopping scanner:", error)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <div
        id="qr-scanner"
        ref={containerRef}
        className="w-full max-w-[300px] h-[300px] mx-auto bg-muted rounded-lg overflow-hidden"
      />
      <div className="flex justify-center">
        <Button
          variant={isScanning ? "destructive" : "default"}
          onClick={isScanning ? stopScanning : startScanning}
        >
          {isScanning ? (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Stop Scanning
            </>
          ) : (
            <>
              <QrCode className="h-4 w-4 mr-2" />
              Start Scanning
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 