# Event Logging System Specification

## Overview
The event logging system provides comprehensive tracking of all system actions, state changes, and user interactions. It serves multiple purposes:
- Audit trail for compliance
- Debugging and troubleshooting
- Performance monitoring
- Business analytics
- User behavior analysis

## Event Categories

### 1. Request Events
- **Purpose**: Track lifecycle of all requests
- **Critical Points**:
  ```typescript
  type RequestEventTypes = 
    | 'REQUEST_CREATED'
    | 'REQUEST_STARTED'
    | 'STEP_COMPLETED'
    | 'REQUEST_VALIDATED'
    | 'REQUEST_FAILED'
    | 'REQUEST_COMPLETED'
    | 'REQUEST_CANCELLED'
  ```
- **Required Data**:
  ```typescript
  interface RequestEventLog {
    event_id: string
    event_type: RequestEventTypes
    request_id: string
    timestamp: Date
    actor_id: string
    step_number?: number
    previous_state?: string
    new_state?: string
    metadata: {
      validation_results?: ValidationResult[]
      error_details?: ErrorDetails
      completion_data?: CompletionData
      step_data?: StepData
    }
  }
  ```

### 2. Status Change Events
- **Purpose**: Track all status transitions
- **Critical Points**:
  ```typescript
  type StatusEventTypes =
    | 'STATUS1_CHANGED'
    | 'STATUS2_CHANGED'
    | 'REQUEST_STATUS_CHANGED'
    | 'ORDER_STATUS_CHANGED'
    | 'BIN_STATUS_CHANGED'
  ```
- **Required Data**:
  ```typescript
  interface StatusEventLog {
    event_id: string
    event_type: StatusEventTypes
    entity_id: string
    entity_type: 'UNIT' | 'REQUEST' | 'ORDER' | 'BIN'
    timestamp: Date
    actor_id: string
    previous_status: string
    new_status: string
    metadata: {
      reason?: string
      trigger_event?: string
      validation_details?: ValidationResult[]
      related_entities?: RelatedEntity[]
    }
  }
  ```

### 3. Location Events
- **Purpose**: Track physical movement of units
- **Critical Points**:
  ```typescript
  type LocationEventTypes =
    | 'LOCATION_CHANGED'
    | 'BIN_ASSIGNED'
    | 'BIN_REMOVED'
    | 'AREA_CHANGED'
    | 'ZONE_CHANGED'
  ```
- **Required Data**:
  ```typescript
  interface LocationEventLog {
    event_id: string
    event_type: LocationEventTypes
    unit_id: string
    timestamp: Date
    actor_id: string
    previous_location: string
    new_location: string
    metadata: {
      movement_reason: string
      bin_details?: BinDetails
      scan_data?: ScanData
      validation_results?: ValidationResult[]
    }
  }
  ```

### 4. Scan Events
- **Purpose**: Track all QR code scans
- **Critical Points**:
  ```typescript
  type ScanEventTypes =
    | 'QR_SCANNED'
    | 'QR_VALIDATED'
    | 'QR_FAILED'
    | 'QR_GENERATED'
    | 'QR_ACTIVATED'
  ```
- **Required Data**:
  ```typescript
  interface ScanEventLog {
    event_id: string
    event_type: ScanEventTypes
    unit_id: string
    timestamp: Date
    actor_id: string
    location: string
    metadata: {
      scan_type: 'UNIT' | 'BIN' | 'LOCATION'
      device_id: string
      scan_result: 'SUCCESS' | 'FAILURE'
      error_details?: ErrorDetails
      validation_results?: ValidationResult[]
    }
  }
  ```

### 5. Validation Events
- **Purpose**: Track all validation checks
- **Critical Points**:
  ```typescript
  type ValidationEventTypes =
    | 'VALIDATION_STARTED'
    | 'VALIDATION_PASSED'
    | 'VALIDATION_FAILED'
    | 'VALIDATION_SKIPPED'
  ```
- **Required Data**:
  ```typescript
  interface ValidationEventLog {
    event_id: string
    event_type: ValidationEventTypes
    entity_id: string
    entity_type: string
    timestamp: Date
    actor_id: string
    metadata: {
      validation_type: string
      rules_applied: ValidationRule[]
      results: ValidationResult[]
      error_details?: ErrorDetails
      override_details?: OverrideDetails
    }
  }
  ```

## Event Display Hierarchy

### 1. Customer Level View
- **Purpose**: High-level overview of customer activity and order status
- **Display Context**: Customer profile and dashboard
- **Event Types Shown**:
  ```typescript
  type CustomerLevelEvents =
    | 'ORDER_CREATED'
    | 'ORDER_STATUS_CHANGED'
    | 'ORDER_COMPLETED'
    | 'ORDER_CANCELLED'
    | 'PAYMENT_PROCESSED'
    | 'SHIPPING_UPDATE'
  ```
- **Aggregation**:
  - Group by order
  - Show most recent status per order
  - Highlight critical events (delays, problems)
- **Component Example**:
  ```typescript
  interface CustomerEventsView {
    customerId: string
    timeRange: DateRange
    displayOptions: {
      groupByOrder: boolean
      showActiveOnly: boolean
      highlightCritical: boolean
    }
    metrics: {
      totalOrders: number
      activeOrders: number
      completedOrders: number
      problemOrders: number
    }
  }
  ```

### 2. Order Level View
- **Purpose**: Track all units and processes within a specific order
- **Display Context**: Order details page
- **Event Types Shown**:
  ```typescript
  type OrderLevelEvents =
    | 'UNIT_ASSIGNED'
    | 'UNIT_STATUS_CHANGED'
    | 'REQUEST_CREATED'
    | 'REQUEST_COMPLETED'
    | 'LOCATION_CHANGED'
    | 'PROBLEM_REPORTED'
  ```
- **Aggregation**:
  - Group by unit
  - Show active requests
  - Track unit transformations
- **Component Example**:
  ```typescript
  interface OrderEventsView {
    orderId: string
    units: {
      unitId: string
      currentStatus: Status
      currentLocation: string
      activeRequests: Request[]
      recentEvents: Event[]
    }[]
    timeline: {
      date: Date
      events: Event[]
    }[]
    metrics: {
      unitsInProgress: number
      completedUnits: number
      activeRequests: number
    }
  }
  ```

### 3. Unit Level View
- **Purpose**: Detailed history of a specific unit
- **Display Context**: Unit details page
- **Event Types Shown**: All events related to unit
  ```typescript
  type UnitLevelEvents =
    | 'STATUS_CHANGED'
    | 'LOCATION_CHANGED'
    | 'QR_SCANNED'
    | 'MEASUREMENT_TAKEN'
    | 'QUALITY_CHECK'
    | 'WASH_COMPLETED'
    | 'PROBLEM_REPORTED'
    | 'REQUEST_STEP_COMPLETED'
  ```
- **Component Example**:
  ```typescript
  interface UnitEventsView {
    unitId: string
    timeline: {
      date: Date
      events: Event[]
      location?: string
      status?: Status
      measurements?: Record<string, number>
      qualityChecks?: QualityCheck[]
      problems?: Problem[]
    }[]
    filters: {
      eventTypes: EventType[]
      dateRange: DateRange
      showProblemsOnly: boolean
      showLocationChanges: boolean
      showStatusChanges: boolean
    }
  }
  ```

### 4. Request Level View
- **Purpose**: Track specific request progress and validation
- **Display Context**: Request details page
- **Event Types Shown**:
  ```typescript
  type RequestLevelEvents =
    | 'STEP_STARTED'
    | 'STEP_COMPLETED'
    | 'VALIDATION_RESULT'
    | 'SCAN_COMPLETED'
    | 'MEASUREMENT_RECORDED'
    | 'PROBLEM_REPORTED'
  ```
- **Component Example**:
  ```typescript
  interface RequestEventsView {
    requestId: string
    steps: {
      stepNumber: number
      status: 'pending' | 'in_progress' | 'completed' | 'failed'
      events: Event[]
      validations: ValidationResult[]
      duration?: number
      operator?: string
    }[]
    metrics: {
      totalSteps: number
      completedSteps: number
      validationsPassed: number
      validationsFailed: number
    }
  }
  ```

## Component Integration Guidelines

### 1. Event Table Components
```typescript
interface EventTableProps {
  level: 'customer' | 'order' | 'unit' | 'request'
  entityId: string
  defaultFilters?: EventFilters
  onEventClick?: (event: Event) => void
  grouping?: {
    enabled: boolean
    by: 'date' | 'type' | 'status' | 'location'
  }
  display?: {
    showTimeline?: boolean
    showMetrics?: boolean
    expandedView?: boolean
  }
}
```

### 2. Event Timeline Components
```typescript
interface EventTimelineProps {
  events: Event[]
  orientation?: 'vertical' | 'horizontal'
  density?: 'compact' | 'normal' | 'expanded'
  highlights?: {
    eventTypes: EventType[]
    style: TimelineStyle
  }
  interactions?: {
    onEventClick?: (event: Event) => void
    onRangeSelect?: (range: DateRange) => void
    onFilterChange?: (filters: EventFilters) => void
  }
}
```

### 3. Event Metrics Components
```typescript
interface EventMetricsProps {
  level: 'customer' | 'order' | 'unit' | 'request'
  metrics: {
    type: string
    value: number
    trend?: number
    goal?: number
  }[]
  display?: {
    showCharts?: boolean
    showTrends?: boolean
    comparisonPeriod?: 'day' | 'week' | 'month'
  }
}
```

### 4. Event Filter Components
```typescript
interface EventFilterProps {
  availableFilters: {
    eventTypes: EventType[]
    locations?: Location[]
    statuses?: Status[]
    operators?: Operator[]
  }
  activeFilters: EventFilters
  onFilterChange: (filters: EventFilters) => void
  presets?: {
    name: string
    filters: EventFilters
  }[]
}
```

## Display Rules and Best Practices

### 1. Data Density Guidelines
- **Customer Level**: Show high-level summaries, focus on exceptions
- **Order Level**: Group by unit, show active processes
- **Unit Level**: Show complete history with filtering
- **Request Level**: Focus on step completion and validation

### 2. Real-time Updates
- Use WebSocket connections for live updates
- Implement optimistic UI updates
- Show loading states for pending changes

### 3. Performance Considerations
- Implement virtual scrolling for long lists
- Use pagination for historical data
- Cache frequently accessed data
- Implement progressive loading

### 4. Accessibility Requirements
- Provide keyboard navigation
- Include screen reader support
- Maintain proper contrast ratios
- Support text scaling

## Storage and Retention

### 1. Active Storage
- **Duration**: 30 days
- **Storage Type**: High-speed accessible storage
- **Indexing**: Full indexing on all fields
- **Query Performance**: Optimized for real-time access

### 2. Warm Storage
- **Duration**: 90 days
- **Storage Type**: Standard storage
- **Indexing**: Partial indexing on key fields
- **Query Performance**: Balanced for occasional access

### 3. Cold Storage
- **Duration**: 7 years
- **Storage Type**: Archived storage
- **Indexing**: Minimal indexing
- **Query Performance**: Optimized for batch retrieval

## Access Patterns

### 1. Real-time Access
```typescript
interface RealTimeQuery {
  timeRange: {
    start: Date
    end: Date
  }
  filters: {
    eventTypes?: EventType[]
    entityIds?: string[]
    actorIds?: string[]
    locations?: string[]
  }
  pagination: {
    page: number
    limit: number
  }
}
```

### 2. Analytical Access
```typescript
interface AnalyticalQuery {
  timeRange: {
    start: Date
    end: Date
  }
  aggregation: {
    groupBy: string[]
    metrics: string[]
    having?: FilterCondition[]
  }
  filters: FilterCondition[]
}
```

## Implementation Guidelines

### 1. Event Creation
```typescript
async function logEvent(params: EventParams): Promise<void> {
  // 1. Validate event data
  validateEventData(params)

  // 2. Enrich with context
  const enrichedEvent = await enrichEventData(params)

  // 3. Store event
  await storeEvent(enrichedEvent)

  // 4. Trigger notifications if needed
  await handleEventNotifications(enrichedEvent)

  // 5. Handle real-time processing
  await processEventStream(enrichedEvent)
}
```

### 2. Event Querying
```typescript
async function queryEvents(params: QueryParams): Promise<EventResult[]> {
  // 1. Validate query parameters
  validateQueryParams(params)

  // 2. Determine storage tier
  const storageTier = determineStorageTier(params.timeRange)

  // 3. Execute query
  const results = await executeQuery(params, storageTier)

  // 4. Post-process results
  return postProcessResults(results)
}
```

## Integration Points

### 1. Request Machine Integration
```typescript
// In request-machine.ts
actions: {
  logStateTransition: (context, event) => {
    eventLogger.logEvent({
      event_type: 'REQUEST_STATE_CHANGED',
      request_id: context.request.id,
      previous_state: context.currentState,
      new_state: event.state,
      metadata: {
        step_data: context.stepData,
        validation_results: context.validationResults
      }
    })
  }
}
```

### 2. Validation Service Integration
```typescript
// In request-validation.ts
async function validateStep(step: Step, data: any): Promise<ValidationResult> {
  const startTime = Date.now()
  
  try {
    const result = await performValidation(step, data)
    
    await eventLogger.logEvent({
      event_type: 'STEP_VALIDATED',
      step_id: step.id,
      duration_ms: Date.now() - startTime,
      result: result,
      metadata: {
        validation_rules: step.rules,
        input_data: data,
        output_result: result
      }
    })
    
    return result
  } catch (error) {
    await eventLogger.logEvent({
      event_type: 'STEP_VALIDATION_FAILED',
      step_id: step.id,
      error: error,
      metadata: {
        validation_rules: step.rules,
        input_data: data
      }
    })
    throw error
  }
}
```

[Continue with more sections...] 