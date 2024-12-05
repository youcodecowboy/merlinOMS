"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { 
  ChevronLeft, 
  Building, 
  Mail, 
  Phone, 
  User, 
  Calendar,
  DollarSign,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from 'sonner'
import { useCustomerEvents } from '@/hooks/use-customer-events'

interface CustomerOrder {
  id: string
  date: string
  status: string
  total: number
  items: number
}

interface TimelineEvent {
  id: string
  type: 'order_created' | 'order_updated' | 'order_completed' | 'profile_updated'
  description: string
  timestamp: string
  metadata?: {
    orderId?: string
    status?: string
    changes?: string[]
  }
}

// Sample data - replace with API call
const orderData: CustomerOrder[] = [
  {
    id: "ORD001",
    date: "2024-01-02",
    status: "Completed",
    total: 750,
    items: 2
  },
  {
    id: "ORD002",
    date: "2024-01-04",
    status: "Processing",
    total: 1250,
    items: 3
  }
]

const timelineData: TimelineEvent[] = [
  {
    id: "EVT001",
    type: "order_created",
    description: "New order placed",
    timestamp: "2024-01-04T10:30:00Z",
    metadata: {
      orderId: "ORD002",
      status: "Processing"
    }
  },
  {
    id: "EVT002",
    type: "profile_updated",
    description: "Customer profile updated",
    timestamp: "2024-01-03T15:45:00Z",
    metadata: {
      changes: ["Phone number updated", "Company name added"]
    }
  },
  {
    id: "EVT003",
    type: "order_completed",
    description: "Order completed",
    timestamp: "2024-01-02T14:20:00Z",
    metadata: {
      orderId: "ORD001",
      status: "Completed"
    }
  }
]

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  company: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const orderColumns = [
  {
    key: "id" as const,
    label: "Order ID",
    sortable: true
  },
  {
    key: "date" as const,
    label: "Date",
    sortable: true,
    render: (value: string) => new Date(value).toLocaleDateString()
  },
  {
    key: "status" as const,
    label: "Status",
    sortable: true,
    render: (value: string) => (
      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        value === "Completed" 
          ? "bg-green-500/10 text-green-500"
          : "bg-blue-500/10 text-blue-500"
      }`}>
        {value}
      </div>
    )
  },
  {
    key: "total" as const,
    label: "Total",
    sortable: true,
    render: (value: number) => `$${value.toLocaleString()}`
  },
  {
    key: "items" as const,
    label: "Items",
    sortable: true
  }
]

function TimelineEvent({ event }: { event: TimelineEvent }) {
  const getIcon = () => {
    switch (event.type) {
      case 'order_created':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'order_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'order_updated':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'profile_updated':
        return <Edit className="h-4 w-4 text-violet-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="flex gap-4 pb-8 last:pb-0">
      <div className="relative flex items-center">
        <div className="absolute top-8 bottom-0 left-[7px] w-[2px] bg-border last:hidden" />
        {getIcon()}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{event.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <time dateTime={event.timestamp}>
            {new Date(event.timestamp).toLocaleString()}
          </time>
        </div>
        {event.metadata?.orderId && (
          <Link 
            href={`/orders/${event.metadata.orderId}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Package className="h-3 w-3" />
            View Order {event.metadata.orderId}
          </Link>
        )}
        {event.metadata?.changes && (
          <ul className="mt-2 space-y-1">
            {event.metadata.changes.map((change, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                • {change}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params.customerId as string
  const [isEditing, setIsEditing] = useState(false)
  const { events, isConnected } = useCustomerEvents(customerId)

  // Sample customer data - replace with API call
  const customer = {
    id: customerId,
    email: "john@example.com",
    profile: {
      metadata: {
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+1 (555) 123-4567",
        company: "Acme Inc",
        totalOrders: 5,
        lastOrderDate: "2024-01-02",
        lifetimeValue: 2500
      }
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: customer.email,
      firstName: customer.profile.metadata.firstName,
      lastName: customer.profile.metadata.lastName,
      phoneNumber: customer.profile.metadata.phoneNumber,
      company: customer.profile.metadata.company,
    },
  })

  async function onSubmit(data: FormValues) {
    try {
      toast.promise(
        fetch(`/api/customers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: customerId,
            email: data.email,
            profile: {
              metadata: {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                company: data.company,
              },
            },
          }),
        }),
        {
          loading: 'Updating customer profile...',
          success: () => {
            setIsEditing(false)
            return 'Customer profile updated successfully!'
          },
          error: 'Failed to update customer profile',
        }
      )
    } catch (error) {
      console.error("Error updating customer:", error)
      toast.error("Something went wrong while updating the customer profile")
    }
  }

  const hasActiveOrder = orderData.some(order => order.status === "Processing")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {customer.profile.metadata.firstName} {customer.profile.metadata.lastName}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Customer details and order history
              {isConnected && (
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                  Live
                </span>
              )}
            </p>
          </div>
        </div>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Customer Profile</DialogTitle>
              <DialogDescription>
                Update customer information. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customer Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {customer.profile.metadata.firstName} {customer.profile.metadata.lastName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.profile.metadata.phoneNumber}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{customer.profile.metadata.company}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Orders</span>
                </div>
                <p className="text-2xl font-bold">{customer.profile.metadata.totalOrders}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Last Order</span>
                </div>
                <p className="text-2xl font-bold">
                  {new Date(customer.profile.metadata.lastOrderDate).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Lifetime Value</span>
                </div>
                <p className="text-2xl font-bold">
                  ${customer.profile.metadata.lifetimeValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Order History</h2>
        <DataTable
          data={orderData}
          columns={orderColumns}
          onRowClick={(row) => {
            window.location.href = `/orders/${row.id}`
          }}
        />
      </div>

      {/* Activity Timeline - Only shown if customer has active orders */}
      {hasActiveOrder && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="rounded-lg border bg-card">
            <div className="p-6">
              <div className="space-y-6">
                {/* Real-time events */}
                {events.map((event, index) => (
                  <div key={event.data.timestamp} className="flex gap-4 pb-8 last:pb-0">
                    <div className="relative flex items-center">
                      <div className="absolute top-8 bottom-0 left-[7px] w-[2px] bg-border last:hidden" />
                      <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {event.data.changes?.map((change, changeIndex) => (
                          <p key={changeIndex} className="text-sm font-medium">
                            {change}
                          </p>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <time dateTime={event.data.timestamp}>
                          {event.data.timestamp && new Date(event.data.timestamp).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Static timeline events */}
                {timelineData.map((event) => (
                  <TimelineEvent key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 