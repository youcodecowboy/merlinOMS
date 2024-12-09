"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Box, QrCode, CheckCircle, Plus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { QRCodeCanvas } from "qrcode.react"
import ReactDOM from "react-dom/client"

interface InventoryItem {
  id: string
  sku: string
  status1: 'PRODUCTION' | 'STOCK' | 'WASH'
  status2: 'UNCOMMITTED' | 'COMMITTED' | 'ASSIGNED'
  location: string
  qr_code: string
  bin_id?: string
  current_bin?: {
    id: string
    code: string
    zone: string
  } | null
  created_at: string
  updated_at: string
}

export default function InventoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [printedItems, setPrintedItems] = useState<Set<string>>(new Set());
  const qrRef = useRef<HTMLDivElement>(null);

  // Load printed status from localStorage
  useEffect(() => {
    const savedPrintedItems = localStorage.getItem('printedQRCodes');
    if (savedPrintedItems) {
      setPrintedItems(new Set(JSON.parse(savedPrintedItems)));
    }
  }, []);

  const handlePrint = async (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    
    try {
      // Create QR code container
      const qrCode = document.createElement('div');
      qrCode.style.position = 'fixed';
      qrCode.style.left = '-9999px';
      document.body.appendChild(qrCode);

      // Render QR code
      const qrElement = (
        <QRCodeCanvas
          value={item.qr_code}
          size={200}
          level="H"
        />
      );

      // Use ReactDOM to render
      const root = ReactDOM.createRoot(qrCode);
      root.render(qrElement);

      // Wait for QR code to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get canvas and print
      const canvas = qrCode.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const printWindow = window.open('', '', 'width=600,height=600');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(`
            <html>
              <head>
                <title>Print QR Code</title>
                <style>
                  body {
                    margin: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                  }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" />
                <script>
                  window.onload = () => {
                    window.print();
                    window.close();
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();

          // Update printed items
          const newPrintedItems = new Set(printedItems);
          newPrintedItems.add(item.id);
          setPrintedItems(newPrintedItems);
          localStorage.setItem('printedQRCodes', JSON.stringify(Array.from(newPrintedItems)));
        }
      }

      // Cleanup
      document.body.removeChild(qrCode);
    } catch (error) {
      console.error('Error printing QR code:', error);
      toast.error('Failed to print QR code');
    }
  };

  const columns = [
    {
      key: "sku",
      label: "SKU",
      sortable: true,
      render: (value: string | null, row: InventoryItem) => {
        if (!row?.sku) return '-'
        return (
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            <span className="font-mono">{row.sku}</span>
          </div>
        )
      }
    },
    {
      key: "status1",
      label: "Primary Status",
      sortable: true,
      render: (value: string | null, row: InventoryItem) => {
        if (!row?.status1) return '-'
        return (
          <div className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            {
              'bg-blue-500/10 text-blue-500': row.status1 === 'PRODUCTION',
              'bg-green-500/10 text-green-500': row.status1 === 'STOCK',
              'bg-yellow-500/10 text-yellow-500': row.status1 === 'WASH',
              'bg-gray-500/10 text-gray-500': !row.status1
            }
          )}>
            {row.status1 || 'UNKNOWN'}
          </div>
        )
      }
    },
    {
      key: "status2",
      label: "Secondary Status",
      sortable: true,
      render: (value: string | null, row: InventoryItem) => {
        if (!row?.status2) return '-'
        return (
          <div className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            {
              'bg-gray-500/10 text-gray-500': row.status2 === 'UNCOMMITTED',
              'bg-purple-500/10 text-purple-500': row.status2 === 'COMMITTED',
              'bg-orange-500/10 text-orange-500': row.status2 === 'ASSIGNED',
              'bg-gray-500/10 text-gray-500': !row.status2
            }
          )}>
            {row.status2 || 'UNKNOWN'}
          </div>
        )
      }
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      render: (value: string | null, row: InventoryItem) => row?.location || '-'
    },
    {
      key: "qr_code",
      label: "QR Code",
      render: (value: string | null, row: InventoryItem) => {
        if (!row?.id) return '-'
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handlePrint(e, row)}
              className="inline-flex items-center gap-1 hover:text-primary"
            >
              <QrCode className="h-4 w-4" />
            </button>
            {printedItems.has(row.id) && (
              <span className="text-green-500">
                <CheckCircle className="h-4 w-4" />
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: "current_bin",
      label: "Bin",
      sortable: true,
      render: (value: any, row: InventoryItem) => row?.current_bin?.code || '-'
    },
    {
      key: "updated_at",
      label: "Last Updated",
      sortable: true,
      render: (value: string | null, row: InventoryItem) => {
        if (!row?.updated_at) return '-'
        return new Date(row.updated_at).toLocaleString()
      }
    }
  ];

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/inventory/items');
        const data = await response.json();
        
        if (data.success) {
          setItems(data.items);
        } else {
          toast.error('Failed to load inventory items');
        }
      } catch (error) {
        console.error('Error fetching inventory items:', error);
        toast.error('Error loading inventory items');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage and track your inventory across all locations.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/inventory/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => {
          window.location.href = `/inventory/${row.id}`;
        }}
      />

      {/* Hidden QR code container */}
      <div ref={qrRef} className="hidden" />
    </div>
  );
} 