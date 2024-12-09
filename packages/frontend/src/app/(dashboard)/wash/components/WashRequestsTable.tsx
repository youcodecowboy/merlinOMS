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
      render: (_, row: WashRequest) => {
        if (!row?.item) return '-'
        return (
          <div className="space-y-1">
            <div className="font-mono">{row.item.sku || 'Unknown SKU'}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {row.item.qr_code || '-'}
            </div>
          </div>
        )
      }
    },
    {
      key: 'order',
      label: 'Order',
      render: (_, row: WashRequest) => {
        if (!row?.order) return '-'
        return (
          <div className="space-y-1">
            <div className="font-mono">{row.order.shopify_id || '-'}</div>
            <div className="text-xs text-muted-foreground">
              {row.order.customer?.profile?.metadata?.firstName} {row.order.customer?.profile?.metadata?.lastName}
            </div>
          </div>
        )
      }
    },
    {
      key: 'metadata',
      label: 'Target',
      render: (_, row: WashRequest) => {
        if (!row?.metadata) return '-'
        return (
          <div className="space-y-1">
            <div className="font-mono">{row.metadata.target_sku || '-'}</div>
            <div className="text-xs text-muted-foreground">
              {row.metadata.target_wash || '-'}
            </div>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: WashRequest['status']) => {
        if (!value) return '-'
        return (
          <Badge
            variant={
              value === 'COMPLETED' ? 'success' :
              value === 'IN_PROGRESS' ? 'info' :
              value === 'FAILED' ? 'destructive' :
              'warning'
            }
          >
            {value}
          </Badge>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (_, row: WashRequest) => {
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
      render: (_, row: WashRequest) => {
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