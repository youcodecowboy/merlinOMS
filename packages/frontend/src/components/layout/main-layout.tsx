"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background font-mono">
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-border transform transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Backdrop - Mobile Only */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300 ease-in-out",
        sidebarOpen && "md:ml-72"
      )}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="p-4 md:p-8 pt-16 md:pt-20 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-border">
        <MobileNav />
      </div>
    </div>
  )
} 