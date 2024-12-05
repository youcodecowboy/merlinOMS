"use client"

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { usePatternRequests } from '../hooks/usePatternRequests';

interface PatternRequest {
  id: string;
  type: string;
  status: string;
  created_at: string;
  metadata: {
    universal_sku: string;
    style: string;
    quantity: number;
    batch_id: string;
    measurements?: Record<string, number>;
    notes?: string;
  } | null;
}

export function PatternRequestsTable() {
  const { toast } = useToast();
  const { data, isLoading, error } = usePatternRequests();
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const requests = data?.requests as PatternRequest[] || [];

  const handleSelect = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleCreateCuttingRequest = async () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "No patterns selected",
        description: "Please select at least one pattern request to create a cutting request.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/requests/cutting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern_request_ids: selectedRequests,
        }),
      });

      if (!response.ok) throw new Error('Failed to create cutting request');

      toast({
        title: "Success",
        description: "Cutting request created successfully",
      });

      // Reset selection
      setSelectedRequests([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create cutting request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {selectedRequests.length} patterns selected
        </div>
        <Button
          onClick={handleCreateCuttingRequest}
          disabled={selectedRequests.length === 0}
        >
          Create Cutting Request
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Select</TableHead>
              <TableHead>Universal SKU</TableHead>
              <TableHead>Style</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Batch ID</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Error loading pattern requests
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No pattern requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request: PatternRequest) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRequests.includes(request.id)}
                      onCheckedChange={() => handleSelect(request.id)}
                    />
                  </TableCell>
                  <TableCell>{request.metadata?.universal_sku || '-'}</TableCell>
                  <TableCell>{request.metadata?.style || '-'}</TableCell>
                  <TableCell>{request.metadata?.quantity || 0}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  <TableCell>{request.metadata?.batch_id || '-'}</TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 