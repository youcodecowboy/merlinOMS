import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./button"

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function Drawer({
  open,
  onClose,
  children,
  header,
  footer
}: DrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 h-full w-full sm:w-[600px] lg:w-[800px] bg-background border-l shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex-none border-b bg-background">
          <div className="flex items-center justify-between p-4 sm:p-6">
            <div className="flex-1 min-w-0">{header}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full ml-4 hover:bg-primary/10 flex-none"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-none border-t bg-background p-4 sm:p-6">
            {footer}
          </div>
        )}
      </div>
    </>
  )
} 