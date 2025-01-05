import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClearTestDataButtonProps {
  onClearComplete?: () => void;
}

export const ClearTestDataButton = ({ onClearComplete }: ClearTestDataButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      
      const response = await fetch('/api/dev/clear-test-data', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear test data');
      }

      const details = data.details;
      const message = `Cleared ${details.orders} orders, ${details.orderItems} order items, ` +
        `${details.requests} requests, ${details.events} events, ` +
        `${details.timelines} timelines, ${details.consumptions} consumptions, ` +
        `${details.notifications} notifications, ${details.batches} batches, ` +
        `${details.waitlist} waitlist entries, ${details.customers} customers, ` +
        `${details.profiles} profiles, and ${details.inventoryItems} inventory items. ` +
        `Created test customer (${details.testCustomer}).`;
      toast.success(message);
      
      onClearComplete?.();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error clearing test data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear test data');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsDialogOpen(true)}
        className="w-full"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Clear Test Data
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogHeader>
          <DialogTitle>Clear Test Data</DialogTitle>
        </DialogHeader>
        <DialogContent>
          This will delete ALL orders, items, and requests from the system.
          Only items in BIN locations will be preserved.
          This action cannot be undone.
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearData}
            disabled={isClearing}
          >
            {isClearing ? 'Clearing...' : 'Clear Test Data'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}; 