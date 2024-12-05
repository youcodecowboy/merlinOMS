declare module 'qrcode.react' {
  import { FC } from 'react'

  interface QRCodeProps {
    value: string
    size?: number
    level?: 'L' | 'M' | 'Q' | 'H'
    includeMargin?: boolean
    className?: string
  }

  export const QRCodeSVG: FC<QRCodeProps>
  export const QRCodeCanvas: FC<QRCodeProps>
} 