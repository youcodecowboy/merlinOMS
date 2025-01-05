"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Plus, Users } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: string
  email: string
  profile: {
    metadata: Record<string, any>
  } | null
  created_at: string
  updated_at: string
}

type CustomerColumn = {
  key: keyof Customer | 'profile'
  label: string
  sortable?: boolean
  render?: (value: any, row: Customer) => React.ReactNode
}

const columns: CustomerColumn[] = [
  {
    key: "id",
    label: "ID",
    sortable: true
  },
  {
    key: "email",
    label: "Email",
    sortable: true
  },
  {
    key: "profile",
    label: "Name",
    sortable: true,
    render: (value: Customer["profile"]) => {
      const firstName = value?.metadata?.firstName;
      const lastName = value?.metadata?.lastName;
      return firstName && lastName ? `${firstName} ${lastName}` : "N/A";
    }
  },
  {
    key: "profile",
    label: "Company",
    render: (value: Customer["profile"]) => 
      value?.metadata?.company || "N/A"
  },
  {
    key: "profile",
    label: "Total Orders",
    sortable: true,
    render: (value: Customer["profile"]) =>
      value?.metadata?.totalOrders || 0
  },
  {
    key: "profile",
    label: "Last Order",
    sortable: true,
    render: (value: Customer["profile"]) =>
      value?.metadata?.lastOrderDate
        ? new Date(value.metadata.lastOrderDate).toLocaleDateString()
        : "Never"
  },
  {
    key: "profile",
    label: "Lifetime Value",
    sortable: true,
    render: (value: Customer["profile"]) =>
      value?.metadata?.lifetimeValue
        ? `$${value.metadata.lifetimeValue.toLocaleString()}`
        : "$0"
  }
]

export default function CustomersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers/items')
        const data = await response.json()
        
        if (data.success) {
          setCustomers(data.customers)
        } else {
          toast.error('Failed to load customers')
        }
      } catch (error) {
        console.error('Error fetching customers:', error)
        toast.error('Error loading customers')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  // Calculate total metrics
  const totalCustomers = customers.length
  const totalOrders = customers.reduce((sum, customer) => 
    sum + (customer.profile?.metadata?.totalOrders || 0), 0)
  const totalRevenue = customers.reduce((sum, customer) => 
    sum + (customer.profile?.metadata?.lifetimeValue || 0), 0)
  const averageOrderValue = totalOrders > 0 
    ? (totalRevenue / totalOrders).toFixed(2)
    : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage and track your customer relationships
          </p>
        </div>
        <Link href="/customers/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Avg. Order Value</p>
              <p className="text-2xl font-bold">${averageOrderValue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <DataTable
        data={customers}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => {
          router.push(`/customers/${row.id}`)
        }}
      />
    </div>
  )
} 