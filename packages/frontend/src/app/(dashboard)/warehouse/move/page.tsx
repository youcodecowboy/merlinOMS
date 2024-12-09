"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/PageHeader"
import { MoveRequestsTable } from "./components/MoveRequestsTable"
import { useToast } from "@/components/ui/use-toast"

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

export default function MoveRequestsPage() {
  const [requests, setRequests] = useState<MoveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/requests/move');
      
      if (!response.ok) {
        throw new Error('Failed to fetch move requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load move requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Move Requests"
        description="Track and process item movement requests"
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading move requests...</div>
        </div>
      ) : (
        <MoveRequestsTable
          requests={requests}
          onRequestComplete={fetchData}
        />
      )}
    </div>
  );
} 