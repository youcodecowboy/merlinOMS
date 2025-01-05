import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { QCRequestDrawer } from "./QCRequestDrawer"
import { ClipboardCheck, Eye, AlertTriangle } from "lucide-react"

export interface QCRequest {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  item?: {
    id: string
    sku: string
    qr_code: string
    location: string
    status1: string
    status2: string
    metadata: Record<string, any>
  }
  assignedTo: {
    id: string
    email: string
    name: string
  } | null
  metadata: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    measurements: Record<string, any>
    visual_inspection: Record<string, any>
    defects: Array<any>
    batch_id?: string
    started_at?: string
    completed_at?: string
  }
  created_at: string
}

interface QCRequestsTableProps {
  requests: QCRequest[]
  onRequestComplete: () => void
}

export function QCRequestsTable({ requests, onRequestComplete }: QCRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<QCRequest | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const columns = [
    {
      key: "item",
      label: "Item",
      render: (value: any, row: QCRequest) => {
        if (!row.item) return '-'
        return (
          <div>
            <div className="font-medium">{row.item.sku}</div>
            <div className="text-sm text-muted-foreground">{row.item.qr_code}</div>
          </div>
        )
      }
    },
    {
      key: "status",
      label: "Status",
      render: (value: QCRequest['status']) => {
        if (!value) return '-'
        return (
          <Badge
            variant={
              value === 'COMPLETED' ? 'success' :
              value === 'IN_PROGRESS' ? 'warning' :
              value === 'FAILED' ? 'destructive' :
              'default'
            }
          >
            {value}
          </Badge>
        )
      }
    },
    {
      key: "priority",
      label: "Priority",
      render: (value: any, row: QCRequest) => (
        <Badge variant={
          row.metadata.priority === 'HIGH' ? 'destructive' :
          row.metadata.priority === 'MEDIUM' ? 'warning' :
          'default'
        }>
          {row.metadata.priority}
        </Badge>
      )
    },
    {
      key: "measurements",
      label: "Measurements",
      render: (value: any, row: QCRequest) => {
        const measurementsCount = Object.keys(row.metadata.measurements).length
        return (
          <div className="flex items-center gap-2">
            <ClipboardCheck className={`h-4 w-4 ${measurementsCount > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span>{measurementsCount} recorded</span>
          </div>
        )
      }
    },
    {
      key: "visual",
      label: "Visual",
      render: (value: any, row: QCRequest) => {
        const hasVisualInspection = Object.keys(row.metadata.visual_inspection).length > 0
        return (
          <div className="flex items-center gap-2">
            <Eye className={`h-4 w-4 ${hasVisualInspection ? 'text-green-500' : 'text-muted-foreground'}`} />
            {hasVisualInspection ? 'Completed' : 'Pending'}
          </div>
        )
      }
    },
    {
      key: "defects",
      label: "Defects",
      render: (value: any, row: QCRequest) => {
        const defectsCount = row.metadata.defects.length
        return (
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${defectsCount > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <span>{defectsCount} found</span>
          </div>
        )
      }
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      render: (value: any, row: QCRequest) => {
        if (!row.assignedTo) return '-'
        return (
          <div className="font-medium">
            {row.assignedTo.name}
          </div>
        )
      }
    },
    {
      key: "created_at",
      label: "Created",
      render: (value: string) => new Date(value).toLocaleString()
    }
  ]

  const handleRowClick = (row: QCRequest) => {
    setSelectedRequest(row)
    setDrawerOpen(true)
  }

  return (
    <>
      <DataTable
        data={requests}
        columns={columns}
        onRowClick={handleRowClick}
      />

      <QCRequestDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedRequest(null)
        }}
        request={selectedRequest}
        onRequestComplete={() => {
          setDrawerOpen(false)
          setSelectedRequest(null)
          onRequestComplete()
        }}
      />
    </>
  )
} 