# Icon Usage Reference Guide

## Overview
This document serves as a reference for using Lucide icons in our React application. Following these guidelines will help prevent common import and usage errors.

## Available Icons
Below is the list of icons we use in our application, with their correct import names:

### Navigation & Arrows
- `ChevronDown` - Downward chevron
- `ChevronUp` - Upward chevron
- `ChevronLeft` - Left chevron
- `ChevronRight` - Right chevron
- `ArrowLeft` - Left arrow
- `ArrowRight` - Right arrow
- `ArrowLeftCircle` - Left arrow in circle

### Status & Alerts
- `AlertTriangle` - Warning triangle
- `CheckCircle` - Success checkmark in circle
- `XCircle` - Error X in circle

### Layout & Navigation
- `LayoutGrid` - Grid layout
- `Menu` - Hamburger menu
- `X` - Close/dismiss

### Content & Data
- `Box` - Box/package
- `Package` - Package/item
- `PackageSearch` - Package with search
- `ClipboardList` - List/orders
- `Scissors` - Production/cutting
- `Timer` - Time/duration
- `Search` - Search functionality
- `Bell` - Notifications

### User & Profile
- `User` - User profile
- `Users` - Multiple users
- `Building` - Company/organization
- `Mail` - Email
- `Phone` - Contact
- `Calendar` - Date/schedule

### Actions & States
- `Plus` - Add new
- `Edit` - Edit/modify
- `Settings` - Configuration
- `Wand2` - Magic/auto actions
- `DollarSign` - Price/cost

## Common Issues & Solutions

### 1. Import Errors
```typescript
// ❌ WRONG - Common mistakes
import { AlertCircle } from 'lucide-react'  // No longer exists
import { CheckIcon } from 'lucide-react'    // Wrong name
import { UserCircle2 } from 'lucide-react'  // Wrong name

// ✅ CORRECT
import { AlertTriangle } from 'lucide-react'  // Use AlertTriangle instead of AlertCircle
import { CheckCircle } from 'lucide-react'    // Use CheckCircle instead of CheckIcon
import { User } from 'lucide-react'           // Use User instead of UserCircle2
```

### 2. Type Definitions
When adding new icons, make sure to add them to the type definitions in `src/types/lucide-react.d.ts`:

```typescript
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  
  interface IconProps extends SVGProps<SVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }
  
  export const IconName: FC<IconProps>
}
```

### 3. Best Practices

#### Icon Components
```typescript
// ✅ CORRECT - Basic usage
<CheckCircle className="h-4 w-4" />

// ✅ CORRECT - With color
<AlertTriangle className="h-4 w-4 text-yellow-500" />

// ✅ CORRECT - Dynamic sizing
<Package className={cn("h-4 w-4", className)} />
```

#### Status Icons
```typescript
// ✅ CORRECT - Status mapping
const statusIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle
} as const

const Icon = statusIcons[status]
return <Icon className="h-4 w-4" />
```

## Version Information
- Lucide React Version: 0.294.0
- Last Updated: March 2024

## Resources
- [Lucide Icons Website](https://lucide.dev)
- [Lucide React Documentation](https://lucide.dev/guide/packages/lucide-react)
- [Icon Search](https://lucide.dev/icons)

## Notes
1. Always check the [Lucide website](https://lucide.dev) for the most up-to-date icon names
2. Some icons have been renamed or replaced in recent versions
3. When in doubt, use the icon preview on the Lucide website to confirm the correct name 