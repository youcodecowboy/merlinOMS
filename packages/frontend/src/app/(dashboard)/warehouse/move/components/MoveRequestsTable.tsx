import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box, Timer, ArrowRight } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { MoveRequestWorkflow } from "@/components/requests/move/MoveRequestWorkflow";
import type { Column } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MoveRequestDrawer } from "@/components/drawers/MoveRequestDrawer";

interface MoveRequest {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  item: {
    id: string;
    sku: string;
    location: string;
  };
  created_at: string;
  metadata?: {
    source?: string;
    destination?: string;
    notes?: string;
  };
}

interface MoveRequestsTableProps {
  requests: MoveRequest[];
  onRequestComplete?: () => void;
}

export function MoveRequestsTable({ requests, onRequestComplete }: MoveRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<MoveRequest | null>(null);
  const router = useRouter();

  const handleStartMove = (request: MoveRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRequest(request);
  };

  const handleComplete = () => {
    setSelectedRequest(null);
    if (onRequestComplete) {
      onRequestComplete();
    }
    router.refresh();
  };

  const columns: Column<MoveRequest>[] = [
    {
      key: "item.sku",
      label: "SKU",
      render: (row: MoveRequest) => (
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4" />
          <span className="font-mono">{row.item?.sku}</span>
        </div>
      )
    },
    {
      key: "item.location",
      label: "Current Location",
      render: (row: MoveRequest) => (
        <div className="flex items-center gap-2">
          <span>{row.metadata?.source || row.item?.location}</span>
          <ArrowRight className="h-4 w-4" />
          <span className="text-muted-foreground">{row.metadata?.destination || "TBD"}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (row: MoveRequest) => (
        <Badge
          variant={
            row.status === "COMPLETED"
              ? "success"
              : row.status === "FAILED"
              ? "destructive"
              : row.status === "IN_PROGRESS"
              ? "warning"
              : "secondary"
          }
        >
          {row.status}
        </Badge>
      )
    },
    {
      key: "created_at",
      label: "Created",
      render: (row: MoveRequest) => {
        const date = new Date(row.created_at);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return (
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span>{hours}h {minutes}m ago</span>
          </div>
        );
      }
    },
    {
      key: "actions",
      label: "",
      render: (row: MoveRequest) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => handleStartMove(row, e)}
          disabled={row.status !== "PENDING"}
        >
          Start Move
        </Button>
      )
    }
  ];

  return (
    <>
      <DataTable
        data={requests}
        columns={columns}
        onRowClick={(row) => {
          if (row.status === "PENDING") {
            handleStartMove(row);
          }
        }}
        rowClassName={(row) => 
          row.status === "PENDING" ? "cursor-pointer hover:bg-muted" : ""
        }
      />

      {selectedRequest && (
        <MoveRequestDrawer
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          requestData={selectedRequest}
        />
      )}
    </>
  );
} 