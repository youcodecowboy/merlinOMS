"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { MoveRequestDrawer } from "@/components/drawers/MoveRequestDrawer"
import { useDevUser } from "@/lib/auth"
import { RequestMetrics } from "@/components/metrics/RequestMetrics"
import { Badge } from "@/components/ui/badge"
import { Timer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Request {
  id: string
  type: string
  status: string
  item?: {
    id: string
    sku: string
    location: string
  }
  metadata?: {
    source?: string
    destination?: string
    destination_id?: string
    notes?: string
    sku?: string
  }
  created_at: string
}

function getTimeRemaining(created_at: string): { hours: number, minutes: number } {
  const createdTime = new Date(created_at).getTime()
  const now = new Date().getTime()
  const timeElapsed = now - createdTime
  const timeRemaining = Math.max(0, 24 * 60 * 60 * 1000 - timeElapsed) // 24 hours in milliseconds
  
  return {
    hours: Math.floor(timeRemaining / (1000 * 60 * 60)),
    minutes: Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
  }
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { devUser, getUserDisplayName } = useDevUser()

  useEffect(() => {
    const fetchRequests = async () => {
      if (!devUser?.id) return

      try {
        const response = await fetch(`/api/users/${devUser.id}/requests`)
        const data = await response.json()
        
        if (data.success) {
          setRequests(data.requests)
        } else {
          console.error('API error:', data.error)
        }
      } catch (error) {
        console.error('Error fetching requests:', error)
      }
    }

    if (devUser?.id) {
      fetchRequests()
      const interval = setInterval(fetchRequests, 30000) // Poll every 30 seconds
      return () => clearInterval(interval)
    }
  }, [devUser?.id])

  const handleRequestClick = (request: Request) => {
    if (request.type === 'PATTERN') {
      window.location.href = '/pattern'
      return
    }
    if (request.type === 'CUTTING') {
      window.location.href = '/pattern/cutting'
      return
    }
    setSelectedRequest(request)
    setIsDrawerOpen(true)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{getUserDisplayName()} Requests</h1>
        <p className="text-muted-foreground mb-6">
          View and manage your assigned requests.
        </p>

        <RequestMetrics />
      </div>
      
      <div className="border rounded-lg">
        <DataTable
          data={requests}
          columns={[
            {
              key: "type",
              label: "Type",
              render: (row: Request) => (
                <Badge variant="outline">{row.type}</Badge>
              )
            },
            {
              key: "item",
              label: "Item",
              render: (row: Request) => {
                const sku = row?.item?.sku || row?.metadata?.sku || 'N/A'
                return (
                  <div className="font-mono">{sku}</div>
                )
              }
            },
            {
              key: "location",
              label: "Location",
              render: (row: Request) => {
                const source = row?.metadata?.source || row?.item?.location || 'Unknown'
                const destination = row?.metadata?.destination || 'TBD'
                return (
                  <div className="flex items-center gap-2">
                    <span>{source}</span>
                    <span>→</span>
                    <span className="text-muted-foreground">{destination}</span>
                  </div>
                )
              }
            },
            {
              key: "created_at",
              label: "Created",
              render: (row: Request) => (
                <div className="text-sm text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </div>
              )
            },
            {
              key: "time_remaining",
              label: "Time Remaining",
              render: (row: Request) => {
                if (!row?.created_at) {
                  return (
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      <span>Unknown</span>
                    </div>
                  )
                }
                const { hours, minutes } = getTimeRemaining(row.created_at)
                const isExpired = hours === 0 && minutes === 0
                return (
                  <div className={`flex items-center gap-2 ${isExpired ? 'text-red-500' : ''}`}>
                    <Timer className="h-4 w-4" />
                    {isExpired ? (
                      <span>LATE</span>
                    ) : (
                      <span>{hours}h {minutes}m</span>
                    )}
                  </div>
                )
              }
            },
            {
              key: "status",
              label: "Status",
              render: (row: Request) => (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      row.status === "COMPLETED"
                        ? "success"
                        : row.status === "FAILED"
                        ? "destructive"
                        : row.status === "IN_PROGRESS"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {row.status}
                  </Badge>
                  {(row.type === 'PATTERN' || row.type === 'CUTTING') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = row.type === 'PATTERN' ? '/pattern' : '/pattern/cutting'
                      }}
                    >
                      View Request
                    </Button>
                  )}
                </div>
              )
            }
          ]}
          onRowClick={handleRequestClick}
        />
      </div>

      {selectedRequest && (
        <MoveRequestDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false)
            setSelectedRequest(null)
          }}
          requestData={{
            id: selectedRequest.id,
            status: selectedRequest.status,
            item: selectedRequest.item || {
              id: selectedRequest.metadata?.sku || 'UNKNOWN',
              sku: selectedRequest.metadata?.sku || 'UNKNOWN',
              location: selectedRequest.metadata?.source || 'UNKNOWN'
            },
            metadata: selectedRequest.metadata || {}
          }}
        />
      )}
    </div>
  )
} 