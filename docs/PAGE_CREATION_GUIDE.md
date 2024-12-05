# Page Creation Reference Guide

## Directory Structure
```
app/
  (dashboard)/
    your-feature/
      page.tsx            // Server Component (main page)
      your-feature-client.tsx  // Client Component (interactive UI)
```

## 1. Server Component (page.tsx)
```typescript
import { Metadata } from "next"
import { YourFeatureClient } from "./your-feature-client"

export const metadata: Metadata = {
  title: "Your Feature",
  description: "Description of your feature",
}

export default function YourFeaturePage() {
  return <YourFeatureClient />
}
```

## 2. Client Component (your-feature-client.tsx)
```typescript
"use client"

import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

// 1. Define your data interface
interface YourDataType {
  id: string;  // Must be string for DataTable
  // ... other fields
}

// 2. Define row interface for cell renderers
interface Row {
  getValue: (key: string) => string;
}

// 3. Define columns with proper typing
const columns = [
  { 
    key: 'fieldName',      // Required: matches data field
    label: 'Field Label',  // Required: display label
    accessorKey: 'fieldName', // Required: matches data field
    header: 'Header Text'  // Required: column header text
  },
  // For columns with custom cell rendering:
  {
    key: 'status',
    label: 'Status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: { row: Row }) => {
      const value = row.getValue('status')
      return (
        <div className="your-styling">
          {value}
        </div>
      )
    }
  }
]

// 4. Export the client component
export function YourFeatureClient() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Your Feature Title
          </h1>
          <p className="text-muted-foreground">
            Feature description
          </p>
        </div>
        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link href="/your-feature/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Item
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Data Table */}
      <DataTable
        data={yourData}
        columns={columns}
        onRowClick={(row) => {
          console.log("Clicked row:", row)
        }}
      />
    </div>
  )
}
```

## 3. Navigation Setup
Add to sidebar (`layout/sidebar.tsx`):
```typescript
const routes: Route[] = [
  // ... existing routes
  {
    label: 'Your Feature',
    icon: YourIcon,  // Import from lucide-react
    href: '/your-feature',
    color: "text-color-500", // Choose from color palette
  }
]
```

## Key Points to Remember

### 1. File Structure
- Server component in `page.tsx`
- Client component in separate file
- Use `"use client"` directive in client component

### 2. Data Table Requirements
- IDs must be strings
- All columns need `key`, `label`, `accessorKey`, and `header`
- Custom cell renderers need proper row typing
- Follow existing patterns for status/priority badges

### 3. Styling
- Use Tailwind classes
- Follow existing color schemes
- Use existing UI components from `@/components/ui`
- Maintain consistent spacing with `space-y-6` and other utility classes

### 4. Common Components to Import
```typescript
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Icons } from "lucide-react"
import Link from "next/link"
```

### 5. Best Practices
- Keep server component minimal
- Put interactivity in client component
- Follow existing patterns for consistency
- Use proper TypeScript types
- Use semantic HTML structure
- Add proper metadata for SEO
- Follow the established layout patterns

### 6. Common Patterns
- Header with title and description
- Action buttons in top right
- Data table with consistent styling
- Status/Priority badges with consistent colors
- Row click handlers for navigation

### 7. TypeScript Considerations
- Use interfaces for data types
- Properly type all function parameters
- Use proper column typing for DataTable
- Avoid using `any` types

### 8. Error Handling
- Add loading states where needed
- Handle empty states gracefully
- Add error boundaries if necessary
- Provide feedback for user actions

## Example Implementation
See the Quality Check page implementation for a complete working example:
- `app/(dashboard)/quality-check/page.tsx`
- `app/(dashboard)/quality-check/quality-check-client.tsx` 