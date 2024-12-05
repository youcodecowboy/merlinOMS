# Request State Machine Specification

## Overview
The Request State Machine manages the lifecycle and validation of all requests in the system. It ensures that requests follow a predictable path from creation to completion while maintaining data integrity and proper validation at each step.

## State Definitions

### 1. Pending
- **Description**: Initial state for all new requests
- **Entry Actions**: 
  - Log request creation
  - Initialize request metadata
  - Set up validation rules
- **Valid Transitions**: → Validating
- **Exit Conditions**:
  - All required fields present
  - Prerequisites met
  - Resources available

### 2. Validating
- **Description**: Validates request prerequisites and requirements
- **Entry Actions**:
  - Load validation rules
  - Check resource availability
  - Verify dependencies
- **Valid Transitions**: → In Progress | → Failed
- **Exit Conditions**:
  - All validations passed
  - Resources confirmed available
  - Dependencies satisfied

### 3. In Progress
- **Description**: Active processing of request steps
- **Entry Actions**:
  - Initialize step tracking
  - Start progress monitoring
  - Allocate resources
- **Valid Transitions**: → Validating Step | → Failed
- **Exit Conditions**:
  - Current step completed
  - Resources still available
  - No timeout occurred

### 4. Validating Step
- **Description**: Validates completion of current step
- **Entry Actions**:
  - Load step-specific validation rules
  - Verify step data
  - Check step requirements
- **Valid Transitions**: → In Progress | → Completed | → Failed
- **Exit Conditions**:
  - Step validation passed
  - Required data collected
  - Quality checks passed

### 5. Completed
- **Description**: Final state for successful requests
- **Entry Actions**:
  - Log completion
  - Release resources
  - Trigger next actions
- **Valid Transitions**: None (Terminal State)
- **Exit Conditions**: None

### 6. Failed
- **Description**: Error state for unsuccessful requests
- **Entry Actions**:
  - Log failure details
  - Release resources
  - Notify relevant parties
- **Valid Transitions**: → Pending (via Retry)
- **Exit Conditions**:
  - Error logged
  - Resources released
  - Retry conditions met

## Context Data

### Request Context
```typescript
interface RequestContext {
  request: Request           // The request being processed
  currentStep: number        // Current step number
  errors: string[]          // Collection of errors
  stepValidations: Record<number, boolean>  // Step completion status
  metadata: Record<string, any>  // Additional request data
}
```

### Event Types
```typescript
type RequestEvent =
  | { type: 'START' }
  | { type: 'COMPLETE_STEP'; step: number; data?: any }
  | { type: 'VALIDATE_STEP'; step: number }
  | { type: 'FAIL'; error: string }
  | { type: 'RETRY' }
  | { type: 'FINISH' }
```

## Validation Rules

### 1. Request Start Validation
- **Prerequisites Check**:
  - Required resources available
  - Dependencies satisfied
  - Valid request type
  - Authorized initiator

### 2. Step Validation
- **Common Rules**:
  - Step exists in request definition
  - Previous step completed
  - Required data present
  - Time limits not exceeded

### 3. Completion Validation
- **Final Checks**:
  - All steps completed
  - Quality requirements met
  - Data integrity verified
  - Resources properly released

## Event Logging

### Required Log Points
1. **State Transitions**:
```typescript
{
  event_type: 'REQUEST_STATE_CHANGE',
  request_id: string,
  previous_state: string,
  new_state: string,
  timestamp: Date,
  actor_id: string,
  metadata: {
    step_number?: number,
    validation_results?: any,
    error_details?: any
  }
}
```

2. **Step Completions**:
```typescript
{
  event_type: 'STEP_COMPLETED',
  request_id: string,
  step_number: number,
  timestamp: Date,
  actor_id: string,
  metadata: {
    step_data: any,
    validation_results: any,
    duration: number
  }
}
```

3. **Validation Results**:
```typescript
{
  event_type: 'VALIDATION_RESULT',
  request_id: string,
  validation_type: 'start' | 'step' | 'completion',
  result: boolean,
  timestamp: Date,
  metadata: {
    errors?: string[],
    warnings?: string[],
    context?: any
  }
}
```

## Error Handling

### Error Categories
1. **Validation Errors**
   - Missing required data
   - Invalid data format
   - Business rule violations

2. **Resource Errors**
   - Resource unavailable
   - Resource capacity exceeded
   - Resource timeout

3. **System Errors**
   - Database errors
   - Network issues
   - Integration failures

### Recovery Procedures
1. **Automatic Recovery**
   - Retry logic for transient errors
   - Fallback procedures
   - Resource reallocation

2. **Manual Intervention**
   - Error escalation
   - Manual override options
   - Recovery documentation

## Implementation Guidelines

### 1. State Transitions
```typescript
// Example transition implementation
async function transition(to: RequestState) {
  // 1. Validate transition
  if (!isValidTransition(currentState, to)) {
    throw new Error(`Invalid transition from ${currentState} to ${to}`);
  }

  // 2. Run pre-transition hooks
  await runPreTransitionHooks(to);

  // 3. Perform transition
  const previousState = currentState;
  currentState = to;

  // 4. Log transition
  await logStateTransition(previousState, to);

  // 5. Run post-transition hooks
  await runPostTransitionHooks(to);
}
```

### 2. Validation Implementation
```typescript
// Example validation implementation
async function validateStep(step: number, data: any) {
  // 1. Load step validation rules
  const rules = await loadStepValidationRules(step);

  // 2. Apply validation rules
  const results = await Promise.all(
    rules.map(rule => rule.validate(data))
  );

  // 3. Process results
  const errors = results
    .filter(result => !result.valid)
    .map(result => result.error);

  // 4. Log validation results
  await logValidationResults(step, errors);

  // 5. Return validation status
  return errors.length === 0;
}
```

## Usage Examples

### Basic Request Flow
```typescript
const machine = createRequestMachine({
  request: newRequest,
  currentStep: 0,
  errors: [],
  stepValidations: {},
  metadata: {}
});

// Start request processing
await machine.send('START');

// Complete steps
await machine.send({ 
  type: 'COMPLETE_STEP', 
  step: 1, 
  data: stepData 
});

// Handle completion
await machine.send('FINISH');
```

### Error Handling
```typescript
try {
  await machine.send('START');
} catch (error) {
  await machine.send({ 
    type: 'FAIL', 
    error: error.message 
  });
  
  // Attempt recovery
  await machine.send('RETRY');
}
```

## Step Types and Validation

### 1. Scan Steps
- **Purpose**: Verify correct item/location identification
- **Common Uses**: 
  - First step in most requests
  - Location changes
  - Bin assignments
  - Item verification

#### Validation Requirements
```typescript
interface ScanValidation {
  type: 'SCAN'
  required_scans: {
    item?: {
      expected_id: string
      validate_status: boolean
      validate_location: boolean
    }
    location?: {
      expected_type: 'BIN' | 'AREA' | 'STATION'
      expected_id?: string
      validate_capacity?: boolean
    }
  }
  timeout_ms: number
  retry_limit: number
}
```

#### Example Implementation
```typescript
async function validateScanStep(scan: QRScan, validation: ScanValidation): Promise<boolean> {
  // 1. Validate item scan if required
  if (validation.required_scans.item) {
    const itemMatch = scan.item_id === validation.required_scans.item.expected_id
    if (!itemMatch) throw new Error('Incorrect item scanned')
    
    // Optional status validation
    if (validation.required_scans.item.validate_status) {
      const validStatus = await validateItemStatus(scan.item_id)
      if (!validStatus) throw new Error('Invalid item status')
    }
  }

  // 2. Validate location scan if required
  if (validation.required_scans.location) {
    const locationValid = await validateLocation(scan.location_id, {
      type: validation.required_scans.location.expected_type,
      id: validation.required_scans.location.expected_id
    })
    if (!locationValid) throw new Error('Invalid location')
  }

  return true
}
```

### 2. Measurement Steps
- **Purpose**: Capture and validate numerical measurements
- **Common Uses**:
  - QC measurements
  - Cutting specifications
  - Alterations

#### Validation Requirements
```typescript
interface MeasurementValidation {
  type: 'MEASUREMENT'
  fields: {
    name: string
    type: 'number'
    min?: number
    max?: number
    precision: number
    unit: 'inches' | 'cm'
    required: boolean
  }[]
  tolerance_percentage: number
  requires_double_entry: boolean
}
```

#### Example Implementation
```typescript
async function validateMeasurementStep(
  measurements: Record<string, number>, 
  validation: MeasurementValidation
): Promise<boolean> {
  // 1. Validate all required fields present
  for (const field of validation.fields) {
    if (field.required && !measurements[field.name]) {
      throw new Error(`Missing required measurement: ${field.name}`)
    }

    if (measurements[field.name]) {
      // 2. Validate number format
      if (typeof measurements[field.name] !== 'number') {
        throw new Error(`${field.name} must be a number`)
      }

      // 3. Validate range
      if (field.min !== undefined && measurements[field.name] < field.min) {
        throw new Error(`${field.name} below minimum: ${field.min}`)
      }
      if (field.max !== undefined && measurements[field.name] > field.max) {
        throw new Error(`${field.name} exceeds maximum: ${field.max}`)
      }

      // 4. Validate precision
      const decimalPlaces = measurements[field.name].toString().split('.')[1]?.length || 0
      if (decimalPlaces > field.precision) {
        throw new Error(`${field.name} exceeds allowed precision of ${field.precision} decimal places`)
      }
    }
  }

  return true
}
```

### 3. Confirmation Steps
- **Purpose**: Capture user acknowledgment and responsibility
- **Common Uses**:
  - Process completion
  - Quality checks
  - Handoffs between departments

#### Validation Requirements
```typescript
interface ConfirmationValidation {
  type: 'CONFIRMATION'
  requires_signature: boolean
  requires_notes: boolean
  requires_photo?: boolean
  confirmation_text: string
  authorized_roles: string[]
}
```

#### Example Implementation
```typescript
async function validateConfirmationStep(
  confirmation: {
    user_id: string
    signature?: string
    notes?: string
    photo_url?: string
    timestamp: Date
  },
  validation: ConfirmationValidation
): Promise<boolean> {
  // 1. Validate user authorization
  const userRole = await getUserRole(confirmation.user_id)
  if (!validation.authorized_roles.includes(userRole)) {
    throw new Error('User not authorized for this confirmation')
  }

  // 2. Validate required signature
  if (validation.requires_signature && !confirmation.signature) {
    throw new Error('Digital signature required')
  }

  // 3. Validate required notes
  if (validation.requires_notes && !confirmation.notes?.trim()) {
    throw new Error('Notes are required for this confirmation')
  }

  // 4. Validate required photo
  if (validation.requires_photo && !confirmation.photo_url) {
    throw new Error('Photo documentation required')
  }

  return true
}
```

### 4. Data Entry Steps
- **Purpose**: Capture structured data input
- **Common Uses**:
  - Defect reporting
  - Process parameters
  - Quality scores

#### Validation Requirements
```typescript
interface DataEntryValidation {
  type: 'DATA_ENTRY'
  fields: {
    name: string
    type: 'string' | 'number' | 'boolean' | 'enum'
    required: boolean
    validation?: {
      pattern?: RegExp
      options?: string[]
      min?: number
      max?: number
    }
  }[]
  allow_partial: boolean
  requires_review: boolean
}
```

#### Example Implementation
```typescript
async function validateDataEntryStep(
  data: Record<string, any>,
  validation: DataEntryValidation
): Promise<boolean> {
  const errors: string[] = []

  // 1. Validate required fields
  for (const field of validation.fields) {
    if (field.required && !data[field.name]) {
      errors.push(`Missing required field: ${field.name}`)
      continue
    }

    if (data[field.name]) {
      // 2. Type validation
      if (typeof data[field.name] !== field.type) {
        errors.push(`Invalid type for ${field.name}`)
        continue
      }

      // 3. Field-specific validation
      if (field.validation) {
        if (field.validation.pattern && !field.validation.pattern.test(data[field.name])) {
          errors.push(`Invalid format for ${field.name}`)
        }
        if (field.validation.options && !field.validation.options.includes(data[field.name])) {
          errors.push(`Invalid option for ${field.name}`)
        }
        if (field.validation.min !== undefined && data[field.name] < field.validation.min) {
          errors.push(`${field.name} below minimum`)
        }
        if (field.validation.max !== undefined && data[field.name] > field.validation.max) {
          errors.push(`${field.name} exceeds maximum`)
        }
      }
    }
  }

  if (errors.length > 0) {
    if (!validation.allow_partial) {
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }
    // Log warnings for partial submissions
    errors.forEach(error => console.warn(error))
  }

  return true
}
``` 