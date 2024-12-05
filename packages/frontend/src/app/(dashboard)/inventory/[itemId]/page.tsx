"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, QrCode, CheckCircle, Package, ClipboardList, Clock } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { QRCodeCanvas } from "qrcode.react"
import { cn } from "@/lib/utils"

interface InventoryItem {
  id: string
  sku: string
  status1: string
  status2: string
  location: string
  qr_code: string
  bin_id: string | null
  current_bin: {
    id: string
    code: string
    type: string
    zone: string
  } | null
  order_assignment?: {
    id: string
    order: {
      id: string
      shopify_id: string
      status: string
      customer: {
        email: string
        profile: {
          metadata: {
            firstName: string
            lastName: string
          }
        }
      }
    }
  }
  requests: {
    id: string
    type: string
    status: string
    created_at: string
    metadata: any
  }[]
  events: {
    id: string
    type: string
    created_at: string
    metadata: any
  }[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export default function InventoryItemPage({
  params
}: {
  params: { itemId: string }
}) {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [printedItems, setPrintedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/inventory/items/${params.itemId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch item');
        }
        const data = await response.json();
        setItem(data.item);
      } catch (error) {
        console.error('Error fetching item:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch item');
        toast.error('Failed to fetch item');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [params.itemId]);

  useEffect(() => {
    const savedPrintedItems = localStorage.getItem('printedQRCodes');
    if (savedPrintedItems) {
      setPrintedItems(new Set(JSON.parse(savedPrintedItems)));
    }
  }, []);

  const handlePrint = () => {
    if (!item) return;
    
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
              <div id="qr-code"></div>
              <div class="sku">${item.sku}</div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.getElementById('qr-code'), '${item.qr_code}', {
                width: 200,
                margin: 0,
              });
            </script>
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
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (errorMessage || !item) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">{errorMessage || 'Item not found'}</div>
        <Button variant="outline" onClick={() => window.history.back()}>
          Back to Inventory
        </Button>
      </div>
    );
  }

  const activeRequest = item.requests?.find(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS') || null;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/inventory" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Item Details Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h3 className="text-2xl font-bold tracking-tight">Item Details</h3>
              <div className="mt-6">
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">SKU</dt>
                    <dd className="mt-1 text-sm font-semibold">{item.sku}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <div className="flex gap-2">
                        <div className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          {
                            'bg-green-500/10 text-green-500': item.status1 === 'STOCK',
                            'bg-yellow-500/10 text-yellow-500': item.status1 === 'PRODUCTION',
                            'bg-blue-500/10 text-blue-500': item.status1 === 'WASH',
                          }
                        )}>
                          {item.status1}
                        </div>
                        <div className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          {
                            'bg-green-500/10 text-green-500': item.status2 === 'UNCOMMITTED',
                            'bg-yellow-500/10 text-yellow-500': item.status2 === 'COMMITTED',
                            'bg-blue-500/10 text-blue-500': item.status2 === 'ASSIGNED',
                          }
                        )}>
                          {item.status2}
                        </div>
                      </div>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                    <dd className="mt-1 text-sm">{item.location}</dd>
                  </div>
                  {item.current_bin && (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Bin</dt>
                        <dd className="mt-1 text-sm">{item.current_bin.code}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Zone</dt>
                        <dd className="mt-1 text-sm">{item.current_bin.zone}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">QR Code</h3>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <QRCodeCanvas value={item.qr_code} size={200} />
                <div className="font-mono text-sm">{item.qr_code}</div>
                {printedItems.has(item.id) && (
                  <div className="text-green-500 flex items-center gap-1 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Printed
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Order Assignment Card */}
          {item.order_assignment && (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Package className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Assigned Order</h3>
                </div>
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Order ID</dt>
                    <dd className="mt-1 text-sm">
                      <Link 
                        href={`/orders/${item.order_assignment.order.id}`}
                        className="text-primary hover:underline"
                      >
                        {item.order_assignment.order.shopify_id}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Customer</dt>
                    <dd className="mt-1 text-sm">
                      {item.order_assignment.order.customer.profile.metadata.firstName}{' '}
                      {item.order_assignment.order.customer.profile.metadata.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        {
                          'bg-yellow-500/10 text-yellow-500': item.order_assignment.order.status === 'NEW',
                          'bg-blue-500/10 text-blue-500': item.order_assignment.order.status === 'IN_PROGRESS',
                          'bg-green-500/10 text-green-500': item.order_assignment.order.status === 'COMPLETED',
                        }
                      )}>
                        {item.order_assignment.order.status}
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Active Request Card */}
          {activeRequest && (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <ClipboardList className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Active Request</h3>
                </div>
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                    <dd className="mt-1 text-sm font-semibold">{activeRequest.type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        {
                          'bg-yellow-500/10 text-yellow-500': activeRequest.status === 'PENDING',
                          'bg-blue-500/10 text-blue-500': activeRequest.status === 'IN_PROGRESS',
                        }
                      )}>
                        {activeRequest.status}
                      </div>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                    <dd className="mt-1 text-sm">{new Date(activeRequest.created_at).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Event Timeline */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Event Timeline</h3>
              </div>
              <div className="space-y-4">
                {item.events?.length > 0 ? (
                  item.events.map((event) => (
                    <div key={event.id} className="relative pl-6 pb-4 border-l border-border last:pb-0">
                      <div className="absolute left-0 top-2 w-2 h-2 -translate-x-1 rounded-full bg-muted-foreground" />
                      <div className="text-sm font-medium">{event.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No events recorded</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 