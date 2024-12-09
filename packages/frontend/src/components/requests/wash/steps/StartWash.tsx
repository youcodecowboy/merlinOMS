import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface StartWashProps {
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
    };
  };
}

const WASH_TYPES = [
  { id: 'STANDARD', label: 'Standard Wash' },
  { id: 'DELICATE', label: 'Delicate Wash' },
  { id: 'HEAVY_DUTY', label: 'Heavy Duty Wash' }
];

export function StartWash({ onComplete, onError, requestData }: StartWashProps) {
  const [washType, setWashType] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStarting(true);

    try {
      const response = await fetch('/api/requests/wash/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestData.requestId,
          qrCode: requestData.qrCode,
          washType,
          temperature,
          notes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start wash');
      }

      const data = await response.json();
      onComplete({
        washType,
        temperature,
        notes,
        startData: data
      });
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to start wash'));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="washType">Wash Type</Label>
        <Select value={washType} onValueChange={setWashType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select wash type" />
          </SelectTrigger>
          <SelectContent>
            {WASH_TYPES.map(type => (
              <SelectItem key={type.id} value={type.id}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="temperature">Temperature (°C)</Label>
        <Input
          id="temperature"
          type="number"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          placeholder="Enter wash temperature"
          required
          min="0"
          max="100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any special instructions or notes"
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isStarting || !washType || !temperature}>
        {isStarting ? 'Starting Wash...' : 'Start Wash'}
      </Button>
    </form>
  );
} 