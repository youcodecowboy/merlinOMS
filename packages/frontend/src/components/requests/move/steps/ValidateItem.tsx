import { useState } from "react";
import { StepCard } from "@/components/ui/step-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { QrCode, Loader2 } from "lucide-react";

interface ValidateItemProps {
  onComplete: (data: { item_id: string }) => void;
  isActive: boolean;
}

export function ValidateItem({ onComplete, isActive }: ValidateItemProps) {
  const [qrCode, setQrCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/requests/move/validate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrCode })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to validate item');
      }

      const data = await response.json();
      onComplete({ item_id: data.item_id });
      
      toast({
        title: "Item Validated",
        description: `Item ${data.sku} is ready to be moved`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to validate item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StepCard
      title="Scan Item"
      description="Scan the QR code of the item to be moved"
      isActive={isActive}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Scan QR Code"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              className="pl-10"
            />
            <QrCode className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          </div>
          <Button type="submit" disabled={!qrCode || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Validate"
            )}
          </Button>
        </div>
      </form>
    </StepCard>
  );
} 