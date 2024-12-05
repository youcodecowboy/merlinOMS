import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface QRCodeProps {
  value: string
  size?: number
  className?: string
}

export function QRCode({ value, size = 128, className }: QRCodeProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin
        className="rounded-lg bg-white p-2"
      />
    </div>
  )
} 