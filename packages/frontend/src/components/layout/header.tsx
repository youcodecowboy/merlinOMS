"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, Search } from "lucide-react"
import Image from "next/image"
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown"
import { MoveRequestDrawer } from "@/components/drawers/MoveRequestDrawer"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const handleRequestClick = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}`)
      const data = await response.json()
      
      if (data.success) {
        setSelectedRequest(data.request)
        setIsDrawerOpen(true)
      } else {
        console.error('Failed to load request:', data.error)
      }
    } catch (error) {
      console.error('Error loading request:', error)
    }
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 border-b border-border bg-black/95 backdrop-blur z-20">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-10 w-10"
            aria-label="Toggle Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Logo - Mobile Only */}
          <div className="md:hidden flex items-center">
            <div className="relative h-[40px] w-[40px] overflow-hidden">
              <Image
                src="/wizard-hat.png"
                alt="Merlin Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 items-center">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search anything..."
                className="h-10 w-full rounded-lg border border-border bg-black/50 pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <NotificationsDropdown onRequestClick={handleRequestClick} />
          </div>
        </div>
      </div>

      {selectedRequest && (
        <MoveRequestDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false)
            setSelectedRequest(null)
          }}
          requestData={selectedRequest}
        />
      )}
    </>
  )
} 