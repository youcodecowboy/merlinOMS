"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

// SKU Component Validation Rules
const skuRules = {
  style: ['ST', 'SL', 'SK', 'PT'],
  waist: { min: 26, max: 44 },
  shape: ['S', 'R', 'L'],
  length: { min: 28, max: 36 },
  wash: {
    light: ['RAW', 'IND', 'STA'],
    dark: ['BRW', 'ONX', 'JAG']
  }
} as const

const formSchema = z.object({
  // SKU Components
  style: z.enum(['ST', 'SL', 'SK', 'PT'] as const, {
    required_error: "Style is required.",
  }),
  waist: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= skuRules.waist.min && num <= skuRules.waist.max;
    },
    { message: `Waist must be between ${skuRules.waist.min} and ${skuRules.waist.max}` }
  ),
  shape: z.enum(['S', 'R', 'L'] as const, {
    required_error: "Shape is required.",
  }),
  length: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= skuRules.length.min && num <= skuRules.length.max;
    },
    { message: `Length must be between ${skuRules.length.min} and ${skuRules.length.max}` }
  ),
  wash: z.enum([...skuRules.wash.light, ...skuRules.wash.dark] as const, {
    required_error: "Wash is required.",
  }),

  // Status Fields
  status1: z.enum(['PRODUCTION', 'STOCK', 'WASH'], {
    required_error: "Primary status is required.",
  }),
  status2: z.enum(['UNCOMMITTED', 'COMMITTED', 'ASSIGNED'], {
    required_error: "Secondary status is required.",
  }),
  location: z.string({
    required_error: "Location is required.",
  }),
  qr_code: z.string().optional(),
  bin_id: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function AddInventoryPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      style: "ST",
      waist: "",
      shape: "R",
      length: "",
      wash: "RAW",
      status1: "STOCK",
      status2: "UNCOMMITTED",
      location: "",
      qr_code: "",
      bin_id: "",
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true)

      // Construct the SKU
      const sku = [
        values.style,
        values.waist.padStart(2, '0'),
        values.shape,
        values.length.padStart(2, '0'),
        values.wash
      ].join('-');

      // Prepare the inventory item data
      const inventoryItem = {
        sku,
        status1: values.status1,
        status2: values.status2,
        location: values.location,
        ...(values.qr_code && { qr_code: values.qr_code }),
        ...(values.bin_id && { bin_id: values.bin_id }),
      };

      // Send POST request to create inventory item
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inventoryItem),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create inventory item');
      }

      const data = await response.json();

      toast.success('Inventory item created successfully');
      router.push('/inventory');
      router.refresh();

    } catch (error) {
      console.error('Error creating inventory item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create inventory item');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Inventory Item</h1>
        <p className="text-muted-foreground">
          Add a new item to your inventory.
        </p>
      </div>

      <div className="rounded-lg border-2 border-border bg-card p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-4 md:grid-cols-5">
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {skuRules.style.map((style) => (
                          <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Product style code
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="waist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waist</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={skuRules.waist.min}
                        max={skuRules.waist.max}
                        placeholder={`${skuRules.waist.min}-${skuRules.waist.max}`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shape"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shape</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shape" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {skuRules.shape.map((shape) => (
                          <SelectItem key={shape} value={shape}>{shape}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={skuRules.length.min}
                        max={skuRules.length.max}
                        placeholder={`${skuRules.length.min}-${skuRules.length.max}`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wash</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wash" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="" disabled>Light Washes</SelectItem>
                        {skuRules.wash.light.map((wash) => (
                          <SelectItem key={wash} value={wash}>{wash}</SelectItem>
                        ))}
                        <SelectItem value="" disabled>Dark Washes</SelectItem>
                        {skuRules.wash.dark.map((wash) => (
                          <SelectItem key={wash} value={wash}>{wash}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRODUCTION">Production</SelectItem>
                        <SelectItem value="STOCK">Stock</SelectItem>
                        <SelectItem value="WASH">Wash</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select secondary status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UNCOMMITTED">Uncommitted</SelectItem>
                        <SelectItem value="COMMITTED">Committed</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter location code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="qr_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QR Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional QR code" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional QR code for tracking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bin_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional bin ID" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional bin assignment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Add Item"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
} 