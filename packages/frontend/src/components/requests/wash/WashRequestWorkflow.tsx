import { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { StepCard } from '@/components/ui/step-card';
import { Button } from '@/components/ui/button';
import { Clock, QrCode, AlertTriangle, User, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface WashRequestWorkflowProps {
  requestId: string;
  onClose: () => void;
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

interface StepState {
  status: StepStatus;
  data?: any;
}

interface RequestData {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  created_at: string;
  assigned_to: string | null;
  assignedUser?: {
    id: string;
    email: string;
    role: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  } | null;
  item: {
    id: string;
    sku: string;
    qr_code: string;
    location: string;
    status1: string;
    status2: string;
  } | null;
  order: {
    id: string;
    shopify_id: string;
    status: string;
    customer: {
      email: string;
      profile: {
        metadata: {
          firstName?: string;
          lastName?: string;
        };
      };
    };
  } | null;
  metadata: {
    target_sku: string;
    target_wash: string;
    source: string;
  };
}

export function WashRequestWorkflow({ requestId, onClose }: WashRequestWorkflowProps) {
  const [steps, setSteps] = useState<Record<string, StepState>>({
    validate_item: { status: 'in_progress' },
    start_wash: { status: 'pending' },
    complete_wash: { status: 'pending' }
  });
  const [currentStep, setCurrentStep] = useState('validate_item');
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch request data');
        }
        const data = await response.json();
        setRequestData(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load request data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestData();
  }, [requestId, toast]);

  const handleStepComplete = async (stepId: string, data: any) => {
    setSteps(prev => ({
      ...prev,
      [stepId]: { status: 'completed', data }
    }));

    // Determine next step
    if (stepId === 'validate_item') {
      setCurrentStep('start_wash');
      setSteps(prev => ({
        ...prev,
        start_wash: { status: 'in_progress' }
      }));
    } else if (stepId === 'start_wash') {
      setCurrentStep('complete_wash');
      setSteps(prev => ({
        ...prev,
        complete_wash: { status: 'in_progress' }
      }));
    } else if (stepId === 'complete_wash') {
      toast({
        title: 'Success',
        description: 'Wash request completed successfully',
      });
      router.refresh();
      onClose();
    }
  };

  const handleStepError = (stepId: string, error: Error) => {
    setSteps(prev => ({
      ...prev,
      [stepId]: { status: 'error', data: { error: error.message } }
    }));

    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
  };

  // Calculate deadline (2 hours from creation)
  const deadline = requestData?.created_at 
    ? new Date(new Date(requestData.created_at).getTime() + 2 * 60 * 60 * 1000)
    : null;

  const header = (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Wash Request</h2>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <div className="px-2 py-1 bg-primary/10 rounded text-sm font-mono">
              {requestData?.id}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          {isLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <>
              {requestData?.assignedUser && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium truncate">
                    {requestData.assignedUser.profile ? 
                      `${requestData.assignedUser.profile.firstName} ${requestData.assignedUser.profile.lastName}` :
                      requestData.assignedUser.email}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 flex-none" />
                <span className="truncate">Due {deadline?.toLocaleTimeString()}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {isLoading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          <>
            <div>
              <div className="text-muted-foreground mb-1">Current SKU</div>
              <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">{requestData?.item?.sku}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Target SKU</div>
              <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">{requestData?.metadata?.target_sku}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">QR Code</div>
              {requestData?.item?.id ? (
                <Link 
                  href={`/inventory/${requestData.item.id}`}
                  className="group flex items-center justify-between font-mono bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded truncate transition-colors"
                >
                  <span>{requestData.item.qr_code}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">N/A</div>
              )}
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Order</div>
              {requestData?.order?.id ? (
                <Link 
                  href={`/orders/${requestData.order.id}`}
                  className="group flex items-center justify-between font-mono bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded truncate transition-colors"
                >
                  <span>#{requestData.order.shopify_id}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">N/A</div>
              )}
              <div className="text-muted-foreground mt-1 truncate">
                {requestData?.order?.customer?.profile?.metadata?.firstName} {requestData?.order?.customer?.profile?.metadata?.lastName}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Current Location</div>
              <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">{requestData?.item?.location || requestData?.metadata?.source || 'N/A'}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Assigned To</div>
              <div className="font-mono bg-primary/10 px-2 py-1 rounded truncate">
                {requestData?.assignedUser ? (
                  requestData.assignedUser.profile ? 
                    `${requestData.assignedUser.profile.firstName} ${requestData.assignedUser.profile.lastName}` :
                    requestData.assignedUser.email
                ) : 'Unassigned'}
              </div>
              <div className="text-muted-foreground mt-1 truncate">
                {requestData?.assignedUser?.role}
              </div>
            </div>
          </>
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
          disabled={currentStep !== 'complete_wash'}
          onClick={() => handleStepComplete('complete_wash', {})}
          className="w-full sm:w-auto"
        >
          Complete Request
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      open={true}
      onClose={onClose}
      header={header}
      footer={footer}
    >
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
                <div className="font-mono truncate">Item ID: {requestData?.item?.id}</div>
                <div className="text-sm text-muted-foreground">Description: {requestData?.item?.sku}</div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm mt-2">
                  <div className="text-muted-foreground">Current Location:</div>
                  <div className="font-medium bg-primary/10 px-2 py-1 rounded truncate">
                    {requestData?.item?.location}
                  </div>
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
          title="Move to Wash Station"
          description="Move the unit to the wash station and scan the bin QR code to confirm."
          status={steps.start_wash.status}
          stepNumber={2}
          isActive={currentStep === 'start_wash'}
        >
          {currentStep === 'start_wash' && (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="font-medium mb-2">Target Location</div>
                <div className="bg-primary/10 px-3 py-2 rounded">
                  Wash Station ({requestData?.metadata?.target_wash || 'Unknown'})
                </div>
              </div>
              <Button className="w-full" onClick={() => handleStepComplete('start_wash', { moved: true })}>
                <QrCode className="h-4 w-4 mr-2" />
                Scan Bin QR Code
              </Button>
            </div>
          )}
        </StepCard>

        <StepCard
          title="Complete Wash Process"
          description="Verify that the wash process has been completed according to specifications."
          status={steps.complete_wash.status}
          stepNumber={3}
          isActive={currentStep === 'complete_wash'}
        >
          {currentStep === 'complete_wash' && (
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <p>Please confirm that:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>The wash cycle has completed</li>
                  <li>The item has been properly dried</li>
                  <li>The item meets quality standards</li>
                </ul>
              </div>
              <Button className="w-full" onClick={() => handleStepComplete('complete_wash', { washed: true })}>
                Verify and Complete Wash Process
              </Button>
            </div>
          )}
        </StepCard>
      </div>
    </Drawer>
  );
} 