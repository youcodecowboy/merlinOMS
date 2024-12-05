# Test Scenarios and Implementation Guide

## Overview
This document outlines test scenarios that mirror actual customer order flows. Each test should validate the complete process flow, following the same logic and steps that a real order would experience.

## Core Test Categories

### 1. SKU Matching Tests
- **Exact Match Scenarios**
  ```typescript
  test('Should find exact SKU match with UNCOMMITTED status', async () => {
    const targetSKU = 'ST-32-X-32-IND';
    // Create test inventory with UNCOMMITTED status
    // Attempt order creation
    // Verify correct unit assignment
  });
  ```

- **Universal Match Scenarios**
  ```typescript
  test('Should find universal SKU (RAW) for light wash target', async () => {
    const targetSKU = 'ST-32-X-32-IND';
    // Create test inventory with RAW universal SKU
    // Verify matches longer length
    // Verify correct wash group matching
  });
  ```

### 2. Status Transition Tests
- **Production to Stock Flow**
  ```typescript
  test('Should process waitlist when unit moves to STOCK', async () => {
    // Create waitlisted order
    // Move unit to STOCK
    // Verify STATUS2 changes from COMMITTED to ASSIGNED
    // Verify wash request creation
  });
  ```

### 3. Request Generation Tests
- **Wash Request Flow**
  ```typescript
  test('Should generate wash request on stock assignment', async () => {
    // Assign STOCK unit to order
    // Verify wash request creation
    // Verify correct wash bin assignment
    // Test step completion validation
  });
  ```

### 4. Location Management Tests
- **Bin Assignment Logic**
  ```typescript
  test('Should prioritize single-SKU bins', async () => {
    // Create multiple bins with various SKUs
    // Attempt new unit storage
    // Verify correct bin selection
    // Verify capacity updates
  });
  ```

## Integration Test Flows

### 1. Complete Order Flow
```typescript
test('Should process order from creation to fulfillment', async () => {
  // 1. Order Creation
  const order = await createTestOrder('ST-32-X-32-IND');
  
  // 2. Inventory Search
  const assignment = await processOrderAssignment(order);
  expect(assignment.status).toBeDefined();
  
  // 3. Request Processing
  const requests = await getOrderRequests(order.id);
  expect(requests).toContainRequest('WASH');
  
  // 4. Status Updates
  expect(order.status).toBe('IN_PROGRESS');
  
  // 5. Location Updates
  const locations = await getUnitLocations(assignment.unitId);
  expect(locations).toShowProperFlow();
});
```

### 2. Production Request Flow
```typescript
test('Should handle production request lifecycle', async () => {
  // 1. Create order with no inventory
  // 2. Verify pending production creation
  // 3. Accept production request
  // 4. Verify unit creation
  // 5. Test waitlist processing
});
```

## Error Handling Tests

### 1. Problem Report Testing
```typescript
test('Should handle missing unit report', async () => {
  // 1. Create active request
  // 2. Report missing unit
  // 3. Verify immediate actions
  // 4. Test replacement flow
});
```

### 2. Recovery Scenarios
```typescript
test('Should recover from scan failures', async () => {
  // 1. Simulate scan failure
  // 2. Verify error handling
  // 3. Test recovery process
  // 4. Verify system state
});
```

## Performance Tests

### 1. Concurrent Processing
```typescript
test('Should handle multiple concurrent requests', async () => {
  // Create multiple simultaneous orders
  // Verify proper queue management
  // Test resource allocation
  // Verify completion order
});
```

### 2. Load Testing
```typescript
test('Should maintain performance under load', async () => {
  // Generate high volume of requests
  // Monitor response times
  // Verify system stability
  // Test recovery from overload
});
```

## Test Data Management

### 1. Setup Functions
```typescript
async function createTestInventory(config: InventoryConfig) {
  // Create test SKUs
  // Set status and location
  // Return test data
}
```

### 2. Cleanup Functions
```typescript
async function cleanupTestData(testId: string) {
  // Remove test orders
  // Reset inventory
  // Clear test requests
}
```

## Validation Helpers

### 1. Status Validators
```typescript
function validateStatusTransition(
  previousStatus: Status,
  newStatus: Status,
  context: TransitionContext
): boolean {
  // Verify valid transition
  // Check context requirements
  // Validate timing
}
```

### 2. Request Validators
```typescript
function validateRequestFlow(
  requests: Request[],
  expectedSequence: RequestType[]
): ValidationResult {
  // Check request sequence
  // Verify timestamps
  // Validate dependencies
}
```

## Test Environment Requirements

### 1. Database Setup
- Clean test database for each run
- Preloaded reference data
- Isolated test environment

### 2. Service Dependencies
- Mock external services
- Simulate timing delays
- Handle async operations

## Test Reporting

### 1. Coverage Requirements
- All status transitions
- Every request type
- Error scenarios
- Recovery processes

### 2. Performance Metrics
- Response times
- Resource usage
- Concurrent operation limits
- Error rates 