"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/PageHeader"
import { WashRequestsTable } from "./components/WashRequestsTable"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Box } from "lucide-react"
import Link from "next/link"

interface WashRequest {
  id: string
  sku: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  created_at: string
  updated_at: string
  source_location?: string
  target_bin?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  order_id: string
  item_status: string
  order_status: string
  target_sku: string
}

export default function WashPage() {
  const [requests, setRequests] = useState<WashRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
    // Set up polling every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      // Fetch requests
      const requestsResponse = await fetch('/api/requests?type=WASH')
      if (!requestsResponse.ok) {
        throw new Error('Failed to fetch wash requests')
      }
      const requestsData = await requestsResponse.json()
      setRequests(requestsData.requests || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load wash data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <PageHeader
          title="Wash Station"
          description="View and process wash requests"
        />
        <Link href="./bins">
          <Button variant="outline" className="gap-2">
            <Box className="h-4 w-4" />
            View Wash Bins
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading wash data...</div>
        </div>
      ) : (
        <div className="rounded-lg border bg-background p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Wash Requests</h2>
          {requests.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">No wash requests found</div>
            </div>
          ) : (
            <WashRequestsTable requests={requests} />
          )}
        </div>
      )}
    </div>
  )
} 