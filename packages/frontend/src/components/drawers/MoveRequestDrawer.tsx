import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StepCard } from "@/components/ui/step-card";
import { Clock, QrCode, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

interface MoveRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  requestData: {
    id: string;
    status: string;
    item: {
      id: string;
      sku: string;
      location: string;
    };
    metadata?: {
      source?: string;
      destination?: string;
      destination_id?: string;
      notes?: string;
    };
  };
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

interface StepState {
  status: StepStatus;
  data?: any;
}

export function MoveRequestDrawer({ isOpen, onClose, requestData }: MoveRequestDrawerProps) {
  const [steps, setSteps] = useState<Record<string, StepState>>({
    validate_item: { status: 'in_progress' },
    start_move: { status: 'pending' },
    complete_move: { status: 'pending' }
  });
  const [currentStep, setCurrentStep] = useState('validate_item');
  const router = useRouter();

  const handleStepComplete = async (stepId: string, data: any) => {
    setSteps(prev => ({
      ...prev,
      [stepId]: { status: 'completed', data }
    }));

    // Determine next step
    if (stepId === 'validate_item') {
      setCurrentStep('start_move');
      setSteps(prev => ({
        ...prev,
        start_move: { status: 'in_progress' }
      }));
    } else if (stepId === 'start_move') {
      setCurrentStep('complete_move');
      setSteps(prev => ({
        ...prev,
        complete_move: { status: 'in_progress' }
      }));
    } else if (stepId === 'complete_move') {
      try {
        if (!requestData.metadata?.destination_id) {
          throw new Error('No destination bin assigned to this move request');
        }

        const response = await fetch(`/api/requests/move/${requestData.id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_id: requestData.item.id,
            destination_id: requestData.metadata.destination_id
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to complete move request');
        }

        toast.success('Move request completed successfully');
        router.refresh();
        onClose();
      } catch (error) {
        console.error('Error completing move request:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to complete move request');
      }
    }
  };

  const handleStepError = (stepId: string, error: Error) => {
    setSteps(prev => ({
      ...prev,
      [stepId]: { status: 'error', data: { error: error.message } }
    }));

    toast.error(error.message);
  };

  // Calculate deadline (2 hours from creation)
  const deadline = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);

  const header = (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Move Request</h2>
          <div className="px-2 py-1 bg-primary/10 rounded text-sm font-mono">
            {requestData.id}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 flex-none" />
          <span className="truncate">Due {deadline.toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground mb-1">Current SKU</div>
          <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">
            {requestData.item.sku}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Current Location</div>
          <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">
            {requestData.metadata?.source || requestData.item.location}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Destination</div>
          <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">
            {requestData.metadata?.destination || "TBD"}
          </div>
        </div>
        {requestData.metadata?.notes && (
          <div>
            <div className="text-muted-foreground mb-1">Notes</div>
            <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">
              {requestData.metadata.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-4">
      <Button variant="destructive" size="sm" onClick={onClose} className="w-full sm:w-auto">
        <AlertTriangle className="h-4 w-4 mr-2" />
        Report a Problem
      </Button>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          variant="default"
          disabled={currentStep !== 'complete_move'}
          onClick={() => handleStepComplete('complete_move', {})}
          className="w-full sm:w-auto"
        >
          Complete Request
        </Button>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{header}</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-200px)] px-4">
          <div className="space-y-4">
            <StepCard
              title="Scan Item QR Code"
              description="Find the unit and scan its QR code to begin."
              status={steps.validate_item.status}
              stepNumber={1}
              isActive={currentStep === 'validate_item'}
            >
              {currentStep === 'validate_item' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="font-mono truncate">SKU: {requestData.item.sku}</div>
                    <div className="text-sm text-muted-foreground">
                      Location: {requestData.metadata?.source || requestData.item.location}
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => handleStepComplete('validate_item', { scanned: true })}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan QR Code
                  </Button>
                </div>
              )}
            </StepCard>

            <StepCard
              title="Start Move"
              description="Move the unit to the target location and scan the location QR code."
              status={steps.start_move.status}
              stepNumber={2}
              isActive={currentStep === 'start_move'}
            >
              {currentStep === 'start_move' && (
                <div className="space-y-4">
                  <div className="text-sm">
                    <div className="font-medium mb-2">Target Location</div>
                    <div className="bg-primary/10 px-3 py-2 rounded">
                      {requestData.metadata?.destination || "TBD"}
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => handleStepComplete('start_move', { moved: true })}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan Location QR Code
                  </Button>
                </div>
              )}
            </StepCard>

            <StepCard
              title="Complete Move"
              description="Verify that the item has been moved to the correct location."
              status={steps.complete_move.status}
              stepNumber={3}
              isActive={currentStep === 'complete_move'}
            >
              {currentStep === 'complete_move' && (
                <div className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p>Please confirm that:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>The item has been moved to the correct location</li>
                      <li>The item is properly stored</li>
                      <li>All safety protocols were followed</li>
                    </ul>
                  </div>
                  <Button className="w-full" onClick={() => handleStepComplete('complete_move', { completed: true })}>
                    Verify and Complete Move
                  </Button>
                </div>
              )}
            </StepCard>
          </div>
        </ScrollArea>
        
        <SheetFooter>
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
} 