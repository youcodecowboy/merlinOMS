# Store Architecture

## Overview
The store architecture provides a centralized data management system with type safety and consistent access patterns. It consists of several key parts:

```typescript
src/lib/
├── store/              # Core store implementation
│   ├── index.ts        # Public API and exports
│   └── store.ts        # Store class implementation
├── types/              # Type definitions
│   └── store.ts        # Store-related types
```

## Key Components

### Store Class (store.ts)
The `MockDB` class provides the core functionality:
- Private state management
- CRUD operations for all entities
- Persistence to localStorage
- Event logging
- Type-safe access patterns

### Types (types/store.ts)
Defines all store-related types:
```typescript
export interface Store {
  inventory_items: InventoryItem[]
  bins: Bin[]
  events: StoreEvent[]
  requests: Request[]
  orders: Order[]
}

export interface StoreEvent {
  id: string
  event_id: string
  event_type: EventType
  timestamp: Date
  actor_id: string
  metadata: Record<string, any>
}
```

### Public API (store/index.ts)
Provides a clean public API:
```typescript
import { mockDB } from '@/lib/store'
import { createInventoryItem, updateOrder } from '@/lib/store'
```

## Usage Examples

### Basic Store Access
```typescript
import { mockDB } from '@/lib/store'

// Read data
const items = mockDB.inventory_items

// Create item
const newItem = await createInventoryItem({
  sku: 'ST-32-X-36-RAW',
  status1: 'STOCK'
})

// Update item
await updateInventoryItem(id, {
  status2: 'COMMITTED'
})
```

### Event Logging
```typescript
import { mockDB } from '@/lib/store'

// Log event
await mockDB.createEvent({
  event_type: 'STATUS_CHANGE',
  metadata: {
    item_id: '123',
    previous_status: 'STOCK',
    new_status: 'PRODUCTION'
  }
})
```

## Best Practices

1. **Import from Store Index**
   - Always import from `@/lib/store`, not individual files
   - This ensures consistent access to the single store instance

2. **Use Helper Functions**
   - Prefer helper functions over direct store manipulation
   - Helpers ensure consistent validation and event logging

3. **Type Safety**
   - Use TypeScript types for all store operations
   - Define new types in `types/store.ts`

4. **Event Logging**
   - Log all important state changes
   - Include relevant metadata with events

5. **State Updates**
   - Always use store methods for updates
   - Don't modify store data directly

## Benefits

- **Centralized State**: Single source of truth for application data
- **Type Safety**: Full TypeScript support and validation
- **Persistence**: Automatic localStorage persistence
- **Event Logging**: Built-in event tracking
- **Clean API**: Simple, consistent access patterns
- **Maintainable**: Clear separation of concerns

## Migration Guide

If you're updating existing components:

1. Update imports:
```typescript
// Old
import { mockDB } from '@/lib/mock-db/store'

// New
import { mockDB, createInventoryItem } from '@/lib/store'
```

2. Use helper functions:
```typescript
// Old
mockDB.inventory_items.push(item)

// New
await createInventoryItem(item)
```

3. Update event logging:
```typescript
// Old
mockDB.events.push(event)

// New
await mockDB.createEvent(event)
```

## Troubleshooting Common Issues

### Import/Export Loops

One of the most common issues is circular dependencies and import/export errors. Here's how to diagnose and fix them:

#### Symptoms
```typescript
// Common error messages:
"The requested module '/src/lib/mock-db/store.ts' does not provide an export named 'createEvent'"
"Cannot find module '@/lib/store' or its corresponding type declarations"
"Module '@/lib/store' has no exported member 'updateInventoryItem'"
```

#### Root Causes & Solutions

1. **Direct Store Access vs Helper Functions**
   ```typescript
   // DON'T: Access store directly from multiple places
   import { mockDB } from '@/lib/store'
   mockDB.inventory_items.push(newItem)

   // DO: Use helper functions
   import { createInventoryItem } from '@/lib/store'
   await createInventoryItem(newItem)
   ```

2. **Circular Dependencies**
   ```typescript
   // DON'T: Create circular imports
   // file1.ts
   import { something } from './file2'
   // file2.ts
   import { somethingElse } from './file1'

   // DO: Centralize shared dependencies
   // types.ts
   export interface SharedType {}
   // Both files import from types.ts
   ```

3. **Inconsistent Import Paths**
   ```typescript
   // DON'T: Mix import styles
   import { mockDB } from '@/lib/mock-db/store'
   import { createEvent } from '@/lib/store'

   // DO: Use consistent imports
   import { mockDB, createEvent } from '@/lib/store'
   ```

### Quick Fix Checklist

When you encounter import/export errors:

1. **Check Import Path**
   - Always import from `@/lib/store`
   - Never import directly from `store.ts` or other internal files

2. **Check Export Availability**
   ```typescript
   // In store/index.ts
   export {
     mockDB,
     createInventoryItem,
     updateOrder,
     // etc...
   }
   ```

3. **Verify Type Exports**
   ```typescript
   // In store/index.ts
   export type { 
     Store,
     StoreEvent,
     EventType 
   } from '../types/store'
   ```

4. **Component Import Pattern**
   ```typescript
   // Standard import pattern for components
   import { 
     mockDB,
     createInventoryItem,
     type StoreEvent 
   } from '@/lib/store'
   ```

### Common Patterns to Avoid

1. **Multiple Store Instances**
   ```typescript
   // DON'T: Create new instances
   const db = new MockDB()

   // DO: Use the singleton
   import { mockDB } from '@/lib/store'
   ```

2. **Direct State Mutations**
   ```typescript
   // DON'T: Modify state directly
   mockDB.inventory_items[0].status = 'COMPLETED'

   // DO: Use update methods
   await updateInventoryItem(id, { status: 'COMPLETED' })
   ```

3. **Async/Sync Mismatch**
   ```typescript
   // DON'T: Mix async/sync operations
   const result = createInventoryItem(data) // Missing await

   // DO: Handle async consistently
   const result = await createInventoryItem(data)
   ```

### When to Refactor

Consider refactoring your store usage when you see:

1. Multiple direct store imports across files
2. Repeated store manipulation logic
3. Inconsistent state updates
4. Missing error handling
5. Type mismatches

### Emergency Fixes

If you're stuck in an import loop:

1. **Temporary Fix**
   ```typescript
   // If you need to ship quickly:
   import { mockDB } from '@/lib/store'
   const item = mockDB.inventory_items.find(i => i.id === id)
   ```

2. **Proper Fix**
   ```typescript
   // Create a new helper function in store/index.ts
   export const getInventoryItem = (id: string) => 
     mockDB.inventory_items.find(i => i.id === id)

   // Then use in components
   import { getInventoryItem } from '@/lib/store'
   const item = getInventoryItem(id)
   ```

Remember: The goal is to maintain a single source of truth and consistent access patterns. When in doubt, add a new helper function to the store rather than accessing store data directly. 