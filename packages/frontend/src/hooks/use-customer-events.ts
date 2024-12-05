import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface OrderUpdate {
  orderId: string
  status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
  timestamp: string
  details?: {
    location?: string
    assignedTo?: string
    notes?: string
  }
}

interface CustomerUpdate {
  id?: string
  timestamp?: string
  changes?: string
  message?: string
}

type CustomerEvent = {
  type: 'connected'
  data: { message: string }
} | {
  type: 'customer_updated'
  data: CustomerUpdate
} | {
  type: 'order_update'
  data: OrderUpdate
}

export function useCustomerEvents(customerId: string) {
  const [events, setEvents] = useState<CustomerEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [activeOrders, setActiveOrders] = useState<Record<string, OrderUpdate>>({})

  const handleOrderUpdate = useCallback((update: OrderUpdate) => {
    setActiveOrders(prev => ({
      ...prev,
      [update.orderId]: update
    }))

    // Show different toast styles based on status
    switch (update.status) {
      case 'COMPLETED':
        toast.success(`Order ${update.orderId} completed`, {
          description: update.details?.notes,
        })
        break
      case 'PROCESSING':
        toast.info(`Order ${update.orderId} status updated`, {
          description: `Now ${update.status.toLowerCase()} at ${update.details?.location}`,
        })
        break
      case 'CANCELLED':
        toast.error(`Order ${update.orderId} cancelled`, {
          description: update.details?.notes,
        })
        break
      default:
        toast(`Order ${update.orderId} status: ${update.status}`)
    }
  }, [])

  useEffect(() => {
    const eventSource = new EventSource(`/api/customers/${customerId}/events`)
    let reconnectAttempt = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 1000 // Start with 1 second

    const connect = () => {
      eventSource.onmessage = (event) => {
        const data: CustomerEvent = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          setIsConnected(true)
          reconnectAttempt = 0 // Reset reconnect attempts on successful connection
          toast.success('Connected to real-time updates')
        } else if (data.type === 'customer_updated') {
          setEvents(prev => [data, ...prev])
          
          // Show toast for important updates
          if (data.data.changes) {
            toast.info('Customer update received', {
              description: data.data.changes
            })
          }
        } else if (data.type === 'order_update') {
          setEvents(prev => [data, ...prev])
          handleOrderUpdate(data.data)
        }
      }
    }

    const handleError = () => {
      console.error('SSE Error:', eventSource)
      setIsConnected(false)
      
      if (reconnectAttempt < maxReconnectAttempts) {
        toast.error('Connection lost, attempting to reconnect...', {
          description: `Attempt ${reconnectAttempt + 1} of ${maxReconnectAttempts}`
        })
        
        setTimeout(() => {
          reconnectAttempt++
          connect()
        }, reconnectDelay * Math.pow(2, reconnectAttempt)) // Exponential backoff
      } else {
        toast.error('Failed to maintain connection', {
          description: 'Please refresh the page to reconnect'
        })
        eventSource.close()
      }
    }

    eventSource.onerror = handleError
    connect()

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [customerId, handleOrderUpdate])

  return {
    events,
    isConnected,
    activeOrders: Object.values(activeOrders)
  }
} 