import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ValidateItemProps {
  onComplete: (data: any) => void;
  onError: (error: Error) => void;
  requestData: {
    requestId: string;
    qrCode?: string;
  };
}

export function ValidateItem({ onComplete, onError, requestData }: ValidateItemProps) {
  const [qrCode, setQrCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    try {
      const response = await fetch('/api/requests/wash/validate-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestData.requestId,
          qrCode,
          notes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to validate item');
      }

      const data = await response.json();
      onComplete({
        qrCode,
        notes,
        validationData: data
      });
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to validate item'));
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="qrCode">Item QR Code</Label>
        <Input
          id="qrCode"
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          placeholder="Scan or enter QR code"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any relevant notes"
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isValidating || !qrCode}>
        {isValidating ? 'Validating...' : 'Validate Item'}
      </Button>
    </form>
  );
} 