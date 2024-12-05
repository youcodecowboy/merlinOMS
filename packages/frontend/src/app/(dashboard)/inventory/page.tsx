"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Plus, QrCode, CheckCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { QRCodeCanvas } from "qrcode.react"

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
    e.stopPropagation(); // Prevent row click when clicking the QR icon

    // Create a temporary container for the QR code
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    // Render the QR code
    const qrCode = document.createElement('div');
    qrCode.innerHTML = `<canvas width="200" height="200"></canvas>`;
    tempContainer.appendChild(qrCode);

    // Create QR code
    const qrCanvas = new QRCodeCanvas({
      value: item.qr_code,
      size: 200,
      level: 'H',
    });
    const canvas = qrCode.querySelector('canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(qrCanvas._canvas, 0, 0);
      }
    }

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${item.sku}</title>
              <style>
                body { 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center; 
                  height: 100vh; 
                  margin: 0;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                .qr-container { 
                  text-align: center;
                  padding: 20px;
                  border: 1px solid #eee;
                  border-radius: 8px;
                  background: white;
                }
                .sku { 
                  font-family: monospace; 
                  font-size: 16px; 
                  margin-top: 12px;
                  color: #374151;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <img src="${canvas?.toDataURL()}" style="width: 200px; height: 200px;" />
                <div class="sku">${item.sku}</div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();

        // Update printed status
        const newPrintedItems = new Set(printedItems).add(item.id);
        setPrintedItems(newPrintedItems);
        localStorage.setItem('printedQRCodes', JSON.stringify(Array.from(newPrintedItems)));
        toast.success('QR Code printed successfully');
      }
    } catch (error) {
      console.error('Error printing QR code:', error);
      toast.error('Failed to print QR code');
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  };

  const columns = [
    {
      key: "sku" as const,
      label: "SKU",
      sortable: true,
    },
    {
      key: "status1" as const,
      label: "Primary Status",
      sortable: true,
      render: (value: string) => (
        <div className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          {
            'bg-blue-500/10 text-blue-500': value === 'PRODUCTION',
            'bg-green-500/10 text-green-500': value === 'STOCK',
            'bg-yellow-500/10 text-yellow-500': value === 'WASH',
          }
        )}>
          {value}
        </div>
      ),
    },
    {
      key: "status2" as const,
      label: "Secondary Status",
      sortable: true,
      render: (value: string) => (
        <div className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          {
            'bg-gray-500/10 text-gray-500': value === 'UNCOMMITTED',
            'bg-purple-500/10 text-purple-500': value === 'COMMITTED',
            'bg-orange-500/10 text-orange-500': value === 'ASSIGNED',
          }
        )}>
          {value}
        </div>
      ),
    },
    {
      key: "location" as const,
      label: "Location",
      sortable: true,
    },
    {
      key: "qr_code" as const,
      label: "QR Code",
      render: (value: string, item: InventoryItem) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => handlePrint(e, item)}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <QrCode className="h-4 w-4" />
          </button>
          {printedItems.has(item.id) && (
            <span className="text-green-500">
              <CheckCircle className="h-4 w-4" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "current_bin" as const,
      label: "Bin",
      sortable: true,
      render: (bin: InventoryItem['current_bin']) => bin?.code || '-'
    },
    {
      key: "updated_at" as const,
      label: "Last Updated",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleString()
    },
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