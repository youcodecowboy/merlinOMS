import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { WashRequestWorkflow } from '@/components/requests/wash/WashRequestWorkflow';
import { Badge } from '@/components/ui/badge';
import { Timer, ArrowRight } from 'lucide-react';
import type { Column } from '@/components/ui/data-table';

interface WashRequest {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    sku: string;
    qr_code: string;
    location: string;
    status1: string;
    status2: string;
  } | null;
  order: {
    id: string;
    shopify_id: string;
    status: string;
    customer: {
      email: string;
      profile: {
        metadata: {
          firstName?: string;
          lastName?: string;
        };
      };
    };
  } | null;
  metadata: {
    target_sku: string;
    target_wash: string;
    source: string;
  };
}

interface WashRequestsTableProps {
  requests: WashRequest[];
}

export function WashRequestsTable({ requests }: WashRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const columns: Column<WashRequest>[] = [
    {
      key: 'item',
      label: 'Item',
      render: (row) => {
        if (!row?.item) return '-'
        return (
          <div className="space-y-1">
            <div className="font-medium">{row.item.sku}</div>
            <div className="text-sm text-muted-foreground">QR: {row.item.qr_code}</div>
          </div>
        )
      }
    },
    {
      key: 'order',
      label: 'Order',
      render: (row) => {
        if (!row?.order) return '-'
        return (
          <div className="space-y-1">
            <div className="font-medium">#{row.order.shopify_id}</div>
            <div className="text-sm text-muted-foreground">
              {row.order.customer?.profile?.metadata?.firstName} {row.order.customer?.profile?.metadata?.lastName}
            </div>
          </div>
        )
      }
    },
    {
      key: 'metadata',
      label: 'Target',
      render: (row) => {
        if (!row?.metadata) return '-'
        return (
          <div className="space-y-1">
            <div className="font-medium">{row.metadata.target_sku}</div>
            <div className="text-sm text-muted-foreground">
              {row.metadata.target_wash}
            </div>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        if (!row?.status) return '-'
        return (
          <Badge
            variant={
              row.status === 'COMPLETED' ? 'success' :
              row.status === 'IN_PROGRESS' ? 'warning' :
              row.status === 'FAILED' ? 'destructive' :
              'default'
            }
          >
            {row.status}
          </Badge>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => {
        if (!row?.created_at) return '-'
        return (
          <span className="text-sm">
            {new Date(row.created_at).toLocaleString()}
          </span>
        )
      }
    },
    {
      key: 'id',
      label: 'Actions',
      render: (row) => {
        if (!row?.id) return null
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRequest(row.id);
              }}
              disabled={row.status === 'COMPLETED' || row.status === 'FAILED'}
            >
              <Timer className="h-4 w-4 mr-2" />
              Process
            </Button>
          </div>
        )
      }
    }
  ];

  return (
    <div className="space-y-4">
      <DataTable
        data={requests}
        columns={columns}
        onRowClick={(row) => {
          if (row.status !== 'COMPLETED' && row.status !== 'FAILED') {
            setSelectedRequest(row.id);
          }
        }}
      />

      {selectedRequest && (
        <WashRequestWorkflow
          requestId={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
} 