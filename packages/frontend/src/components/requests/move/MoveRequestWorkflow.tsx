import { useState } from "react";
import { moveWorkflowSteps, type MoveWorkflowStep } from "./config";
import { useToast } from "@/components/ui/use-toast";

interface MoveRequestWorkflowProps {
  requestId: string;
  onComplete: () => void;
}

export function MoveRequestWorkflow({ requestId, onComplete }: MoveRequestWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<MoveWorkflowStep>("validate-item");
  const [itemId, setItemId] = useState<string>("");
  const [destinationId, setDestinationId] = useState<string>("");
  const { toast } = useToast();

  const currentStepIndex = moveWorkflowSteps.findIndex(step => step.id === currentStep);

  const handleValidateItem = async (data: { item_id: string }) => {
    setItemId(data.item_id);
    setCurrentStep("scan-destination");
  };

  const handleScanDestination = async (data: { destination_id: string }) => {
    setDestinationId(data.destination_id);
    setCurrentStep("complete-move");
  };

  const handleComplete = async () => {
    onComplete();
    toast({
      title: "Move Request Completed",
      description: "The item has been successfully moved to its new location.",
    });
  };

  return (
    <div className="space-y-6">
      {moveWorkflowSteps.map((step, index) => {
        const StepComponent = step.component;
        const isActive = currentStepIndex >= index;

        return (
          <StepComponent
            key={step.id}
            isActive={isActive}
            onComplete={
              step.id === "validate-item"
                ? handleValidateItem
                : step.id === "scan-destination"
                ? handleScanDestination
                : handleComplete
            }
            {...(step.id === "scan-destination" && { itemId })}
            {...(step.id === "complete-move" && {
              itemId,
              destinationId,
              requestId,
            })}
          />
        );
      })}
    </div>
  );
} 