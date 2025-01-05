import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { QCRequest } from "./QCRequestsTable"
import { ClipboardCheck, Eye, AlertTriangle, Loader2 } from "lucide-react"

interface QCRequestDrawerProps {
  isOpen: boolean
  onClose: () => void
  request: QCRequest | null
  onRequestComplete: () => void
}

export function QCRequestDrawer({ isOpen, onClose, request, onRequestComplete }: QCRequestDrawerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [visualInspection, setVisualInspection] = useState<Record<string, boolean>>({
    color_match: false,
    texture_match: false,
    no_stains: false,
    no_damage: false
  })
  const [defects, setDefects] = useState<Array<{
    type: string
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL'
    location: string
    notes?: string
  }>>([])

  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: value }))
  }

  const handleVisualInspectionChange = (key: string, value: boolean) => {
    setVisualInspection(prev => ({ ...prev, [key]: value }))
  }

  const handleAddDefect = () => {
    setDefects(prev => [...prev, {
      type: '',
      severity: 'MINOR',
      location: '',
      notes: ''
    }])
  }

  const handleDefectChange = (index: number, field: string, value: string) => {
    setDefects(prev => {
      const newDefects = [...prev]
      newDefects[index] = { ...newDefects[index], [field]: value }
      return newDefects
    })
  }

  const handleRemoveDefect = (index: number) => {
    setDefects(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmitMeasurements = async () => {
    if (!request) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/requests/qc/${request.id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements })
      })

      if (!response.ok) {
        throw new Error('Failed to submit measurements')
      }

      toast.success('Measurements recorded successfully')
    } catch (error) {
      console.error('Error submitting measurements:', error)
      toast.error('Failed to record measurements')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitVisualInspection = async () => {
    if (!request) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/requests/qc/${request.id}/visual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection: visualInspection })
      })

      if (!response.ok) {
        throw new Error('Failed to submit visual inspection')
      }

      toast.success('Visual inspection recorded successfully')
    } catch (error) {
      console.error('Error submitting visual inspection:', error)
      toast.error('Failed to record visual inspection')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitDefects = async () => {
    if (!request) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/requests/qc/${request.id}/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defects })
      })

      if (!response.ok) {
        throw new Error('Failed to submit defects')
      }

      toast.success('Defects recorded successfully')
    } catch (error) {
      console.error('Error submitting defects:', error)
      toast.error('Failed to record defects')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async (passed: boolean) => {
    if (!request) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/requests/qc/${request.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passed })
      })

      if (!response.ok) {
        throw new Error('Failed to complete QC request')
      }

      toast.success('QC request completed successfully')
      onRequestComplete()
    } catch (error) {
      console.error('Error completing QC request:', error)
      toast.error('Failed to complete QC request')
    } finally {
      setIsLoading(false)
    }
  }

  if (!request) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Quality Control Request</span>
            <Badge variant={
              request.status === 'COMPLETED' ? 'success' :
              request.status === 'IN_PROGRESS' ? 'warning' :
              request.status === 'FAILED' ? 'destructive' :
              'default'
            }>
              {request.status}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Item Details */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Item Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <div className="font-mono mt-1">{request.item.sku}</div>
              </div>
              <div>
                <Label>QR Code</Label>
                <div className="font-mono mt-1">{request.item.qr_code}</div>
              </div>
              <div>
                <Label>Location</Label>
                <div className="mt-1">{request.item.location}</div>
              </div>
              <div>
                <Label>Priority</Label>
                <div className="mt-1">
                  <Badge variant={
                    request.metadata.priority === 'HIGH' ? 'destructive' :
                    request.metadata.priority === 'MEDIUM' ? 'warning' :
                    'default'
                  }>
                    {request.metadata.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Measurements */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Measurements</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmitMeasurements}
                disabled={isLoading || Object.keys(measurements).length === 0}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                <span className="ml-2">Record Measurements</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Length (cm)</Label>
                <Input
                  type="number"
                  value={measurements.length || ''}
                  onChange={(e) => handleMeasurementChange('length', e.target.value)}
                  placeholder="Enter length"
                />
              </div>
              <div>
                <Label>Width (cm)</Label>
                <Input
                  type="number"
                  value={measurements.width || ''}
                  onChange={(e) => handleMeasurementChange('width', e.target.value)}
                  placeholder="Enter width"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Visual Inspection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Visual Inspection</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmitVisualInspection}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                <span className="ml-2">Record Inspection</span>
              </Button>
            </div>
            <div className="space-y-4">
              {Object.entries(visualInspection).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={key}
                    checked={value}
                    onChange={(e) => handleVisualInspectionChange(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={key} className="capitalize">
                    {key.replace(/_/g, ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Defects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Defects</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddDefect}
                >
                  Add Defect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmitDefects}
                  disabled={isLoading || defects.length === 0}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  <span className="ml-2">Record Defects</span>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {defects.map((defect, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between">
                    <Label>Defect {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDefect(index)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Input
                        value={defect.type}
                        onChange={(e) => handleDefectChange(index, 'type', e.target.value)}
                        placeholder="Defect type"
                      />
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <select
                        value={defect.severity}
                        onChange={(e) => handleDefectChange(index, 'severity', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="MINOR">Minor</option>
                        <option value="MAJOR">Major</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={defect.location}
                        onChange={(e) => handleDefectChange(index, 'location', e.target.value)}
                        placeholder="Defect location"
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={defect.notes}
                        onChange={(e) => handleDefectChange(index, 'notes', e.target.value)}
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => handleComplete(false)}
              disabled={isLoading}
            >
              Fail QC
            </Button>
            <Button
              onClick={() => handleComplete(true)}
              disabled={isLoading}
            >
              Pass QC
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 