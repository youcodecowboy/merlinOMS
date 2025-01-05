'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ClearTestDataButton } from '@/components/dev/ClearTestDataButton';

interface TestOrder {
  id: string;
  shopify_id: string;
  status: string;
  order_items: Array<{
    id: string;
    target_sku: string;
    status: string;
    quantity: number;
    assigned_item_id?: string;
  }>;
}

interface ProcessResult {
  action: 'direct_assignment' | 'universal_assignment' | 'production_request';
  itemId?: string;
  message: string;
  success: boolean;
}

interface TestInventoryItem {
  id: string;
  sku: string;
  status1: string;
  status2: string;
  location: string;
  bin: {
    id: string;
    code: string;
    zone: string;
    type: string;
  } | null;
}

function MatchingResults({ results }: { results: ProcessResult[] }) {
  return (
    <div className="space-y-2">
      {results.map((result, index) => (
        <div 
          key={index} 
          className={cn(
            "p-3 rounded-md text-sm",
            {
              'bg-green-500/10 text-green-500': result.action === 'direct_assignment',
              'bg-blue-500/10 text-blue-500': result.action === 'universal_assignment',
              'bg-yellow-500/10 text-yellow-500': result.action === 'production_request'
            }
          )}
        >
          {result.message}
          {result.itemId && (
            <span className="block mt-1 opacity-75">Item ID: {result.itemId}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DevDashboard() {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState<TestOrder | null>(null);
  const [lastResults, setLastResults] = useState<ProcessResult[]>([]);
  const [lastInventoryItem, setLastInventoryItem] = useState<TestInventoryItem | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [testOperatorId, setTestOperatorId] = useState<string | null>(null);

  const runSetup = async () => {
    setSettingUp(true);
    try {
      const response = await fetch('/api/test/setup', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setTestOperatorId(data.user.id);
        toast.success('Test environment setup completed');
      } else {
        toast.error('Failed to setup test environment');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error setting up test environment');
    } finally {
      setSettingUp(false);
    }
  };

  const generateTestOrder = async () => {
    if (!testOperatorId) {
      toast.error('Please run setup first to create test operator');
      return;
    }

    setLoading(true);
    try {
      // Create order
      const response = await fetch('/api/orders/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: customerEmail || undefined // Only send if not empty
        })
      });
      const data = await response.json();
      
      if (!data.success) {
        toast.error('Failed to create test order');
        return;
      }

      setLastOrder(data.order);
      toast.success('Test order created successfully');

      // Automatically process the order
      const processResponse = await fetch(`/api/orders/${data.order.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: testOperatorId,
        }),
      });
      
      const processData = await processResponse.json();
      
      if (processData.success) {
        setLastResults(processData.results);
        setLastOrder(prev => prev ? { ...prev, status: processData.newStatus } : null);
        toast.success('Order processed successfully');
      } else {
        toast.error(processData.error || 'Failed to process order');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error creating/processing test order');
    } finally {
      setLoading(false);
    }
  };

  const createSpecificOrder = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku: 'ST-32-X-32-STA'
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setLastOrder(data.order);
        setLastResults([]);
        toast.success('Test order created successfully');
      } else {
        toast.error('Failed to create test order');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error creating test order');
    } finally {
      setLoading(false);
    }
  };

  const processOrder = async () => {
    if (!lastOrder) {
      toast.error('No order to process');
      return;
    }

    if (!testOperatorId) {
      toast.error('Please run setup first to create test operator');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/orders/${lastOrder.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: testOperatorId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastResults(data.results);
        setLastOrder(prev => prev ? { ...prev, status: data.newStatus } : null);
        toast.success('Order processed successfully');
      } else {
        toast.error(data.error || 'Failed to process order');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error processing order');
    } finally {
      setProcessing(false);
    }
  };

  const generateInventoryItem = async () => {
    setCreatingItem(true);
    try {
      const response = await fetch('/api/inventory/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setLastInventoryItem(data.item);
        toast.success('Random inventory item created successfully');
      } else {
        toast.error('Failed to create inventory item');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error creating inventory item');
    } finally {
      setCreatingItem(false);
    }
  };

  const createSpecificInventoryItem = async (sku: string) => {
    setCreatingItem(true);
    try {
      const response = await fetch('/api/inventory/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sku })
      });
      const data = await response.json();
      
      if (data.success) {
        setLastInventoryItem(data.item);
        toast.success(`Test inventory item created: ${sku}`);
      } else {
        toast.error('Failed to create test inventory item');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error creating test inventory item');
    } finally {
      setCreatingItem(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Development Testing Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Setup Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Environment Setup</CardTitle>
            <CardDescription>Initialize test data and users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={runSetup}
                disabled={settingUp}
              >
                {settingUp ? 'Setting up...' : 'Run Setup'}
              </Button>
              <div className="mt-4">
                <ClearTestDataButton onClearComplete={() => {
                  toast.success('Test data cleared successfully');
                  window.location.reload();
                }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Generation Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Order Generation</CardTitle>
            <CardDescription>Create test orders for Stage 1 processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Customer Email (optional)"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                <Button 
                  onClick={generateTestOrder} 
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Generate Random Order'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createSpecificOrder}
                  disabled={loading}
                  variant="secondary"
                >
                  Create ST-32-X-32-STA Order
                </Button>
              </div>
              {lastOrder && (
                <Button
                  onClick={processOrder}
                  disabled={processing || lastOrder.status !== 'NEW'}
                  variant="secondary"
                  className="ml-4"
                >
                  {processing ? 'Processing...' : 'Process Order'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Item Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Generation</CardTitle>
            <CardDescription>Create test inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={() => createSpecificInventoryItem('ST-32-X-32-STA')}
                disabled={creatingItem}
                className="w-full"
              >
                Create ST-32-X-32-STA Item
              </Button>
              <Button 
                onClick={() => createSpecificInventoryItem('ST-32-X-36-RAW')}
                disabled={creatingItem}
                className="w-full"
              >
                Create ST-32-X-36-RAW Item
              </Button>
              <Button 
                onClick={generateInventoryItem}
                disabled={creatingItem}
                variant="secondary"
                className="w-full"
              >
                {creatingItem ? 'Creating...' : 'Generate Random Item'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Display */}
        {lastResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <MatchingResults results={lastResults} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 