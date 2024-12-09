import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{
    onComplete: (data: any) => void;
    onError: (error: Error) => void;
    requestData: any;
  }>;
  validation?: (data: any) => Promise<boolean>;
}

interface MultiStepRequestProps {
  steps: Step[];
  requestId: string;
  requestType: 'WASH' | 'MOVE';
  initialData: any;
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export function MultiStepRequest({
  steps,
  requestId,
  requestType,
  initialData,
  onComplete,
  onCancel
}: MultiStepRequestProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStates, setStepStates] = useState<Record<string, 'pending' | 'completed' | 'error'>>({});
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const currentStep = steps[currentStepIndex];
  const StepComponent = currentStep.component;

  const handleStepComplete = async (data: any) => {
    setIsProcessing(true);
    try {
      // Validate step data if validation function exists
      if (currentStep.validation) {
        const isValid = await currentStep.validation(data);
        if (!isValid) {
          throw new Error(`Validation failed for step ${currentStep.id}`);
        }
      }

      // Update step states and data
      setStepStates(prev => ({
        ...prev,
        [currentStep.id]: 'completed'
      }));
      setStepData(prev => ({
        ...prev,
        [currentStep.id]: data
      }));

      // Move to next step or complete workflow
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        // All steps completed
        onComplete({
          requestId,
          requestType,
          steps: stepData
        });
      }
    } catch (error) {
      setStepStates(prev => ({
        ...prev,
        [currentStep.id]: 'error'
      }));
      console.error('Step completion error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStepError = (error: Error) => {
    setStepStates(prev => ({
      ...prev,
      [currentStep.id]: 'error'
    }));
    console.error('Step error:', error);
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{currentStep.title}</DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>

        <div className="flex space-x-4 mb-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index === currentStepIndex
                  ? 'text-primary'
                  : stepStates[step.id] === 'completed'
                  ? 'text-green-500'
                  : stepStates[step.id] === 'error'
                  ? 'text-red-500'
                  : 'text-gray-400'
              }`}
            >
              <div className="flex items-center">
                {stepStates[step.id] === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : stepStates[step.id] === 'error' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full border-2 ${
                      index === currentStepIndex ? 'border-primary' : 'border-gray-400'
                    }`}
                  />
                )}
                <span className="ml-2">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300 mx-2" />
              )}
            </div>
          ))}
        </div>

        <div className="py-4">
          <StepComponent
            onComplete={handleStepComplete}
            onError={handleStepError}
            requestData={{
              ...initialData,
              previousSteps: stepData
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 