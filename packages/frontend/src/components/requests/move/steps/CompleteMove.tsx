import { useState } from "react";
import { StepCard } from "@/components/ui/step-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface CompleteMoveProps {
  onComplete: () => void;
  isActive: boolean;
  itemId: string;
  destinationId: string;
  requestId: string;
}

export function CompleteMove({ onComplete, isActive, itemId, destinationId, requestId }: CompleteMoveProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/requests/move/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          item_id: itemId,
          destination_id: destinationId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete move');
      }

      const data = await response.json();
      onComplete();
      
      toast({
        title: "Move Completed",
        description: `Item has been moved to ${data.destination_name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete move",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StepCard
      title="Complete Move"
      description="Confirm the item movement to complete the request"
      isActive={isActive}
    >
      <div className="space-y-4">
        <Button 
          onClick={handleComplete} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Complete Move"
          )}
        </Button>
      </div>
    </StepCard>
  );
} 