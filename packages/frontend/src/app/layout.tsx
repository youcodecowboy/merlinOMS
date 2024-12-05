import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MainLayout } from '@/components/layout/main-layout'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OMS - Order Management System',
  description: 'Advanced order management and inventory tracking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-black text-white antialiased`}>
        <MainLayout>
          {children}
        </MainLayout>
        <Toaster 
          theme="dark" 
          position="top-right"
          closeButton
          richColors
          expand
        />
      </body>
    </html>
  )
}
