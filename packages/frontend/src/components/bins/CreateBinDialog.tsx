"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Box, Package } from "lucide-react"

interface CreateBinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CAPACITIES = [10, 25, 50] as const
const ZONES = [1, 2, 3, 4, 5] as const
const RACKS_PER_ZONE = 10
const SHELVES_PER_RACK = 5
const BINS_PER_SHELF = {
  10: 4,
  25: 2,
  50: 1,
} as const

type Capacity = typeof CAPACITIES[number]
type Zone = typeof ZONES[number]

export function CreateBinDialog({ open, onOpenChange, onSuccess }: CreateBinDialogProps) {
  const [capacity, setCapacity] = useState<Capacity | null>(null)
  const [zone, setZone] = useState<Zone | null>(null)
  const [rack, setRack] = useState<number | null>(null)
  const [shelf, setShelf] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!capacity || !zone || !rack || !shelf) {
      toast.error("Please select all required fields")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/inventory/bins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          capacity,
          zone,
          rack,
          shelf,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Bin created successfully")
        onSuccess?.()
        onOpenChange(false)
        // Reset form
        setCapacity(null)
        setZone(null)
        setRack(null)
        setShelf(null)
      } else {
        toast.error(data.error || "Failed to create bin")
      }
    } catch (error) {
      console.error("Error creating bin:", error)
      toast.error("Failed to create bin")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Storage Bin</DialogTitle>
          <DialogDescription>
            Select the bin capacity and location. The bin ID will be automatically generated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Capacity Selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Bin Capacity</h3>
            <div className="grid grid-cols-3 gap-4">
              {CAPACITIES.map((cap) => (
                <Button
                  key={cap}
                  variant={capacity === cap ? "default" : "outline"}
                  className="h-24 flex-col gap-2"
                  onClick={() => setCapacity(cap)}
                >
                  <Package className="h-8 w-8" />
                  <span className="text-lg font-bold">{cap}</span>
                  <span className="text-xs text-muted-foreground">items</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Bin Location</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Zone</label>
                <Select
                  value={zone?.toString()}
                  onValueChange={(value) => setZone(parseInt(value) as Zone)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONES.map((z) => (
                      <SelectItem key={z} value={z.toString()}>
                        Zone {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Rack</label>
                <Select
                  value={rack?.toString()}
                  onValueChange={(value) => setRack(parseInt(value))}
                  disabled={!zone}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rack" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: RACKS_PER_ZONE }, (_, i) => i + 1).map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        Rack {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Shelf</label>
                <Select
                  value={shelf?.toString()}
                  onValueChange={(value) => setShelf(parseInt(value))}
                  disabled={!rack}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shelf" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: SHELVES_PER_RACK }, (_, i) => i + 1).map((s) => (
                      <SelectItem key={s} value={s.toString()}>
                        Shelf {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preview */}
          {capacity && zone && rack && shelf && (
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-medium">Preview</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-base font-mono">
                  {`${capacity}-${zone}-${rack}-${shelf}`}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({BINS_PER_SHELF[capacity]} bins per shelf max)
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!capacity || !zone || !rack || !shelf || isLoading}>
            Create Bin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 