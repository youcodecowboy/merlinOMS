"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { usePatternRequests } from '../hooks/usePatternRequests'
import { ChevronDown, ChevronRightIcon } from 'lucide-react'

interface PatternRequest {
  id: string
  type: string
  status: string
  created_at: string
  metadata: {
    universal_sku: string
    style: string
    quantity: number
    batch_id: string
    measurements?: Record<string, number>
    notes?: string
    order_ids?: string[]
  } | null
  order?: {
    id: string
    shopify_id: string
    created_at: string
    order_items: {
      target_sku: string
      quantity: number
    }[]
  }
}

export function PatternRequestsTable() {
  const { toast } = useToast()
  const router = useRouter()
  const { data, isLoading, error } = usePatternRequests()
  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [expandedRows, setExpandedRows] = useState<string[]>([])

  const requests = data?.requests as PatternRequest[] || []

  const handleSelect = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    )
  }

  const toggleRow = (requestId: string) => {
    setExpandedRows(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    )
  }

  const handleCreateCuttingRequest = async () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "No patterns selected",
        description: "Please select at least one pattern request to create a cutting request.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      console.log('Creating cutting request with IDs:', selectedRequests)
      const response = await fetch('/api/requests/cutting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern_request_ids: selectedRequests,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create cutting request')
      }

      const { cuttingRequest } = result.data
      const totalSkus = cuttingRequest.metadata.skus.length
      const totalQuantity = cuttingRequest.metadata.total_quantity

      toast({
        title: "Success",
        description: `Created cutting request with ${totalSkus} SKU(s) and total quantity of ${totalQuantity} units`,
      })

      // Reset selection and refresh data
      setSelectedRequests([])
      router.refresh()
    } catch (error) {
      console.error('Error creating cutting request:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create cutting request',
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Group requests by SKU for display
  const groupedRequests = requests.reduce((acc, request) => {
    const sku = request.metadata?.universal_sku || 'unknown'
    if (!acc[sku]) {
      acc[sku] = {
        requests: [],
        totalQuantity: 0
      }
    }
    acc[sku].requests.push(request)
    acc[sku].totalQuantity += request.metadata?.quantity || 0
    return acc
  }, {} as Record<string, { requests: PatternRequest[], totalQuantity: number }>)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {selectedRequests.length} patterns selected
        </div>
        <Button
          onClick={handleCreateCuttingRequest}
          disabled={selectedRequests.length === 0 || isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Cutting Request'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Select</TableHead>
              <TableHead>Universal SKU</TableHead>
              <TableHead>Style</TableHead>
              <TableHead>Total Quantity</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Error loading pattern requests
                </TableCell>
              </TableRow>
            ) : Object.entries(groupedRequests).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No pattern requests found
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedRequests).map(([sku, { requests: skuRequests, totalQuantity }]) => (
                <>
                  <TableRow key={sku}>
                    <TableCell>
                      <Checkbox
                        checked={skuRequests.every(r => selectedRequests.includes(r.id))}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedRequests(prev => [
                              ...prev,
                              ...skuRequests.map(r => r.id).filter(id => !prev.includes(id))
                            ])
                          } else {
                            setSelectedRequests(prev => 
                              prev.filter(id => !skuRequests.find(r => r.id === id))
                            )
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(sku)}
                        >
                          {expandedRows.includes(sku) ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                        </Button>
                        <span>{sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>{skuRequests[0]?.metadata?.style || '-'}</TableCell>
                    <TableCell>{totalQuantity}</TableCell>
                    <TableCell>{skuRequests.length}</TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        skuRequests.every(r => r.status === 'PENDING')
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : skuRequests.some(r => r.status === 'IN_PROGRESS')
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-green-500/10 text-green-500'
                      }`}>
                        {skuRequests.every(r => r.status === 'PENDING')
                          ? 'PENDING'
                          : skuRequests.some(r => r.status === 'IN_PROGRESS')
                          ? 'IN_PROGRESS'
                          : 'COMPLETED'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(Math.min(...skuRequests.map(r => new Date(r.created_at).getTime()))).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                  {expandedRows.includes(sku) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/50 p-4">
                        <div className="space-y-4">
                          <div className="text-sm font-medium">Orders</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {skuRequests.map(request => (
                              <div 
                                key={request.id}
                                className="p-3 rounded-lg border border-border bg-background"
                              >
                                <div className="flex flex-col space-y-2">
                                  {request.order ? (
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">{request.order.shopify_id}</span>
                                        <span className="text-muted-foreground">
                                          {new Date(request.order.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="text-muted-foreground">
                                        Target SKU: {request.order.order_items[0]?.target_sku}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">No order information</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 