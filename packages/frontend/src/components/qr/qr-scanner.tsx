"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QrCode } from 'lucide-react'

interface QRScannerProps {
  onScan: (data: string) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let stream: MediaStream | null = null

    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        setError('Unable to access camera. Please ensure you have granted camera permissions.')
        console.error('Error accessing camera:', err)
      }
    }

    if (isOpen) {
      setupCamera()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          {error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full aspect-square rounded-lg bg-muted"
              />
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function QRScanButton({ onScan }: { onScan: (data: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-10 w-10"
      >
        <QrCode className="h-4 w-4" />
      </Button>
      <QRScanner
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onScan={onScan}
      />
    </>
  )
} 