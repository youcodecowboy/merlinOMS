# Data Hierarchy and Change Propagation

## Overview
This document defines the hierarchical relationship between data entities and how changes at different levels affect related entities. Understanding this hierarchy is crucial for maintaining data consistency and proper state management throughout the system.

## Primary Hierarchy

### Level 1: Customer
- **Top-level entity**
- Source of all orders
- Maintains complete order history
- Aggregates all customer-related data

### Level 2: Order
- **Child of Customer**
- Contains order specifications
- Links to multiple items
- Represents customer intent

### Level 3: Items
- **Child of Order**
- Physical units in inventory
- Subject to status changes
- Tracks fulfillment progress

## Change Propagation

### Bottom-Up Updates
```typescript
interface ChangePropagate {
  // Item → Order → Customer
  propagateItemChange(itemId: string): {
    updateOrder(): void;      // Update order status based on items
    updateCustomer(): void;   // Notify customer of changes
  }
}
```

#### Item Status Changes
1. **Item Level**
   - Status update (e.g., STOCK → WASH)
   - Location change
   - QC results

2. **Order Level Updates**
   - Progress calculation
   - Timeline updates
   - Status adjustments

3. **Customer Level Notifications**
   - Status notifications
   - Progress updates
   - Timeline changes

### Example Flow
```typescript
async function handleItemStatusChange(item: Item, newStatus: Status) {
  // 1. Update Item
  await item.updateStatus(newStatus);
  
  // 2. Find Parent Order
  const order = await Order.findByItemId(item.id);
  
  // 3. Update Order Status
  await order.recalculateStatus();
  
  // 4. Notify Customer
  const customer = await Customer.findById(order.customerId);
  await customer.notifyStatusChange(order);
}
```

## Dependency Rules

### 1. Customer Dependencies
- Must maintain all order references
- Must track aggregate status
- Must receive all relevant updates

```typescript
interface Customer {
  orders: Order[];
  calculateOverallStatus(): Status;
  notifyStatusChange(order: Order): void;
}
```

### 2. Order Dependencies
- Must track all item statuses
- Must update based on item changes
- Must notify customer of significant changes

```typescript
interface Order {
  items: Item[];
  recalculateStatus(): void;
  notifyCustomer(): void;
}
```

### 3. Item Dependencies
- Must update parent order
- Must maintain status history
- Must trigger appropriate requests

```typescript
interface Item {
  orderId: string;
  updateStatus(status: Status): void;
  triggerRequests(): void;
}
```

## State Management

### Customer State
```typescript
interface CustomerState {
  id: string;
  orders: {
    active: Order[];
    completed: Order[];
    cancelled: Order[];
  };
  metrics: {
    totalOrders: number;
    activeOrders: number;
    completionRate: number;
  };
}
```

### Order State
```typescript
interface OrderState {
  id: string;
  customerId: string;
  items: Item[];
  status: OrderStatus;
  progress: {
    itemsComplete: number;
    totalItems: number;
    percentComplete: number;
  };
}
```

### Item State
```typescript
interface ItemState {
  id: string;
  orderId: string;
  status1: Status1;
  status2: Status2;
  location: Location;
  history: StatusChange[];
}
```

## Update Triggers

### 1. Status Updates
```typescript
interface StatusUpdate {
  source: 'ITEM' | 'ORDER' | 'CUSTOMER';
  propagateUp: boolean;
  notifyCustomer: boolean;
}
```

### 2. Location Updates
```typescript
interface LocationUpdate {
  source: 'ITEM';
  updateOrder: boolean;
  notifyCustomer: boolean;
}
```

### 3. Progress Updates
```typescript
interface ProgressUpdate {
  source: 'ITEM' | 'ORDER';
  recalculateOrder: boolean;
  updateCustomer: boolean;
}
```

## Notification Flow

### 1. Customer Notifications
- Order status changes
- Significant progress updates
- Timeline adjustments
- Problem reports

### 2. Order Notifications
- Item status changes
- Location updates
- QC results
- Problem reports

### 3. Item Notifications
- Status changes
- Location changes
- Request completions
- Problem reports

## Data Consistency Rules

### 1. Atomic Updates
- All changes must be transaction-safe
- Related entities must be updated together
- Rollback on any failure

### 2. State Validation
- Child states must be consistent with parent
- Parent must reflect all child states
- No orphaned records allowed

### 3. History Tracking
- All state changes must be logged
- Maintain complete audit trail
- Track propagation chain 