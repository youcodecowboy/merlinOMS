"use client"

import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

interface FinishingRequest {
  id: string;
  requestNumber: string;
  status: string;
  productName: string;
  requestedBy: string;
  requestDate: string;
  priority: string;
  finishingType: string;
  quantity: number;
}

interface Row {
  getValue: (key: string) => string;
}

const mockFinishingRequests: FinishingRequest[] = [
  {
    id: "1",
    requestNumber: 'FIN-2024-001',
    status: 'Pending',
    productName: 'Denim Jacket',
    requestedBy: 'John Doe',
    requestDate: '2024-03-20',
    priority: 'High',
    finishingType: 'Stone Wash',
    quantity: 100
  },
  {
    id: "2",
    requestNumber: 'FIN-2024-002',
    status: 'In Progress',
    productName: 'Vintage Jeans',
    requestedBy: 'Jane Smith',
    requestDate: '2024-03-21',
    priority: 'Medium',
    finishingType: 'Acid Wash',
    quantity: 50
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
    key: 'productName',
    label: 'Product',
    accessorKey: 'productName',
    header: 'Product'
  },
  { 
    key: 'finishingType',
    label: 'Finishing Type',
    accessorKey: 'finishingType',
    header: 'Finishing Type'
  },
  { 
    key: 'quantity',
    label: 'Quantity',
    accessorKey: 'quantity',
    header: 'Quantity'
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

export function FinishingClient() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finishing Requests</h1>
          <p className="text-muted-foreground">
            Manage and track finishing requests for garments
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/finishing/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </Link>
        </div>
      </div>
      
      <DataTable
        data={mockFinishingRequests}
        columns={columns}
        onRowClick={(row) => {
          console.log("Clicked row:", row)
        }}
      />
    </div>
  )
} 