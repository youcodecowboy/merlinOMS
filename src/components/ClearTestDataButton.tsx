import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

interface ClearTestDataButtonProps {
  onClearComplete?: () => void;
}

export const ClearTestDataButton = ({ onClearComplete }: ClearTestDataButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      
      // Make API calls to clear data
      await Promise.all([
        fetch('/api/orders/clear-test-data', { method: 'DELETE' }),
        fetch('/api/items/clear-test-data', { method: 'DELETE' }),
        fetch('/api/requests/clear-test-data', { method: 'DELETE' })
      ]);

      onClearComplete?.();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error clearing test data:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<DeleteSweepIcon />}
        onClick={() => setIsDialogOpen(true)}
      >
        Clear Test Data
      </Button>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>Clear Test Data</DialogTitle>
        <DialogContent>
          This will delete all orders, items, and requests from the test environment.
          Bins will not be affected. This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleClearData}
            color="warning"
            disabled={isClearing}
            autoFocus
          >
            {isClearing ? 'Clearing...' : 'Clear All Test Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 