"use client"

import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

interface PackingRequest {
  id: string;
  requestNumber: string;
  status: string;
  orderNumber: string;
  customerName: string;
  requestedBy: string;
  requestDate: string;
  priority: string;
  itemCount: number;
  destination: string;
}

interface Row {
  getValue: (key: string) => string;
}

const mockPackingRequests: PackingRequest[] = [
  {
    id: "1",
    requestNumber: 'PCK-2024-001',
    status: 'Pending',
    orderNumber: 'ORD-2024-123',
    customerName: 'Fashion Corp',
    requestedBy: 'John Doe',
    requestDate: '2024-03-20',
    priority: 'High',
    itemCount: 250,
    destination: 'New York'
  },
  {
    id: "2",
    requestNumber: 'PCK-2024-002',
    status: 'In Progress',
    orderNumber: 'ORD-2024-124',
    customerName: 'Style Inc',
    requestedBy: 'Jane Smith',
    requestDate: '2024-03-21',
    priority: 'Medium',
    itemCount: 100,
    destination: 'Los Angeles'
  }
]

const columns = [
  { 
    key: 'requestNumber',
    label: 'Request #',
    accessorKey: 'requestNumber',
    header: 'Request #'
  },
  { 
    key: 'status',
    label: 'Status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: { row: Row }) => {
      const status = row.getValue('status')
      return (
        <div className={
          status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
          status === 'In Progress' ? 'bg-blue-500/20 text-blue-500' :
          'bg-green-500/20 text-green-500'
        + ' px-2 py-1 rounded-full text-xs font-medium text-center'}>
          {status}
        </div>
      )
    }
  },
  { 
    key: 'orderNumber',
    label: 'Order #',
    accessorKey: 'orderNumber',
    header: 'Order #'
  },
  { 
    key: 'customerName',
    label: 'Customer',
    accessorKey: 'customerName',
    header: 'Customer'
  },
  { 
    key: 'itemCount',
    label: 'Items',
    accessorKey: 'itemCount',
    header: 'Items'
  },
  { 
    key: 'destination',
    label: 'Destination',
    accessorKey: 'destination',
    header: 'Destination'
  },
  { 
    key: 'requestedBy',
    label: 'Requested By',
    accessorKey: 'requestedBy',
    header: 'Requested By'
  },
  { 
    key: 'requestDate',
    label: 'Date',
    accessorKey: 'requestDate',
    header: 'Date'
  },
  { 
    key: 'priority',
    label: 'Priority',
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }: { row: Row }) => {
      const priority = row.getValue('priority')
      return (
        <div className={
          priority === 'High' ? 'bg-red-500/20 text-red-500' :
          priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' :
          'bg-green-500/20 text-green-500'
        + ' px-2 py-1 rounded-full text-xs font-medium text-center'}>
          {priority}
        </div>
      )
    }
  }
]

export function PackingClient() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packing Requests</h1>
          <p className="text-muted-foreground">
            Manage and track packing requests for orders
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/packing/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </Link>
        </div>
      </div>
      
      <DataTable
        data={mockPackingRequests}
        columns={columns}
        onRowClick={(row) => {
          console.log("Clicked row:", row)
        }}
      />
    </div>
  )
} 