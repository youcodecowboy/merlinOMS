"use client"

import { Toaster } from "sonner"
import { DevDashboard } from "@/components/dev/dashboard"
import { FloatingQRScanner } from "@/components/qr/FloatingQRScanner"

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      {children}
      <Toaster 
        theme="dark" 
        position="top-right"
        closeButton
        richColors
        expand
      />
      <DevDashboard />
      <FloatingQRScanner />
    </>
  )
} 