"use client"

import { useEffect, useState, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDevUser } from "@/lib/auth"

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
  request_id: string | null
  metadata: {
    request_type: string
    item_id?: string
    item_sku?: string
  }
}

interface NotificationsDropdownProps {
  onRequestClick?: (requestId: string) => void
}

export function NotificationsDropdown({ onRequestClick }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const { devUser } = useDevUser()
  const audioRef = useRef<HTMLAudioElement>(null)
  const prevUnreadCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Clear notifications and interval when user changes
  useEffect(() => {
    setNotifications([])
    prevUnreadCountRef.current = 0

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Start new polling if we have a user
    if (devUser?.id) {
      fetchNotifications().then(() => {
        // Play sound if there are unread notifications when switching users
        const unreadCount = notifications.filter(n => !n.read).length
        if (unreadCount > 0) {
          playNotificationSound()
        }
      })
      intervalRef.current = setInterval(fetchNotifications, 30000)
    }

    // Cleanup on unmount or user change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [devUser?.id])

  const fetchNotifications = async () => {
    if (!devUser?.id) return

    try {
      console.log('Fetching notifications for user:', devUser?.id)
      const response = await fetch("/api/notifications", {
        headers: {
          'x-dev-user-id': devUser.id
        }
      })
      const data = await response.json()
      console.log('Notifications response:', data)

      // Only set notifications if this is still the same user
      if (devUser?.id) {
        setNotifications(data.notifications || [])

        const currentUnreadCount = (data.notifications || []).filter((n: Notification) => !n.read).length
        // Play sound if there are new unread notifications OR if this is initial load with unread notifications
        if (currentUnreadCount > prevUnreadCountRef.current || (prevUnreadCountRef.current === 0 && currentUnreadCount > 0)) {
          playNotificationSound()
        }
        prevUnreadCountRef.current = currentUnreadCount
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error("Failed to play notification sound:", error)
      })
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!devUser?.id) return

    try {
      // Mark as read
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
        headers: {
          'x-dev-user-id': devUser.id
        }
      })
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ))

      // Close the dropdown
      setOpen(false)

      // If it's a pattern request, navigate to the pattern requests page
      if (notification.metadata?.request_type === 'PATTERN') {
        window.location.href = '/pattern'
        return
      }

      // If it's a cutting request, navigate to the cutting requests page
      if (notification.metadata?.request_type === 'CUTTING') {
        window.location.href = '/pattern/cutting'
        return
      }

      // For other request types, open the request drawer
      if (notification.request_id && onRequestClick) {
        onRequestClick(notification.request_id)
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      <audio ref={audioRef} src="/sounds/notification.wav" />
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-2 border-b border-border">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                You have {unreadCount} unread notifications
              </p>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="grid gap-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className={`w-full text-left p-3 text-sm transition-colors hover:bg-accent ${
                      !notification.read ? "bg-accent/50" : ""
                    } ${notification.request_id ? "cursor-pointer" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <p className="line-clamp-2 font-medium leading-none tracking-tight">
                      {notification.message}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </>
  )
} 