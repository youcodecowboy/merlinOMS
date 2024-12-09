import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface CompleteWashProps {
  onComplete: (data: any) => void;
  onError: (error: Error) => void;
  requestData: {
    requestId: string;
    qrCode: string;
    previousSteps: {
      validateItem: {
        qrCode: string;
        notes: string;
        validationData: any;
      };
      startWash: {
        washType: string;
        temperature: string;
        notes: string;
        startData: any;
      };
    };
  };
}

const QUALITY_CHECKS = [
  { id: 'color_check', label: 'Color Check' },
  { id: 'texture_check', label: 'Texture Check' },
  { id: 'damage_check', label: 'Damage Check' },
  { id: 'shrinkage_check', label: 'Shrinkage Check' }
];

export function CompleteWash({ onComplete, onError, requestData }: CompleteWashProps) {
  const [completedChecks, setCompletedChecks] = useState<string[]>([]);
  const [qualityScore, setQualityScore] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const handleCheckToggle = (checkId: string) => {
    setCompletedChecks(prev =>
      prev.includes(checkId)
        ? prev.filter(id => id !== checkId)
        : [...prev, checkId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompleting(true);

    try {
      const response = await fetch('/api/requests/wash/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestData.requestId,
          qrCode: requestData.qrCode,
          completedChecks,
          qualityScore: Number(qualityScore),
          notes,
          washData: {
            type: requestData.previousSteps.startWash.washType,
            temperature: requestData.previousSteps.startWash.temperature
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete wash');
      }

      const data = await response.json();
      onComplete({
        completedChecks,
        qualityScore: Number(qualityScore),
        notes,
        completionData: data
      });
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to complete wash'));
    } finally {
      setIsCompleting(false);
    }
  };

  const allChecksCompleted = QUALITY_CHECKS.every(check => 
    completedChecks.includes(check.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <Label>Quality Checks</Label>
        {QUALITY_CHECKS.map(check => (
          <div key={check.id} className="flex items-center space-x-2">
            <Checkbox
              id={check.id}
              checked={completedChecks.includes(check.id)}
              onCheckedChange={() => handleCheckToggle(check.id)}
            />
            <Label htmlFor={check.id}>{check.label}</Label>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualityScore">Quality Score (1-10)</Label>
        <Input
          id="qualityScore"
          type="number"
          value={qualityScore}
          onChange={(e) => setQualityScore(e.target.value)}
          placeholder="Enter quality score"
          required
          min="1"
          max="10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Completion Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any completion notes or issues"
          rows={3}
          required
        />
      </div>

      <Button 
        type="submit" 
        disabled={isCompleting || !allChecksCompleted || !qualityScore || !notes}
      >
        {isCompleting ? 'Completing Wash...' : 'Complete Wash'}
      </Button>
    </form>
  );
} 