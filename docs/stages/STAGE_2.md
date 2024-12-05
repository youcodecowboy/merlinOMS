# Stage 2: Request Types and Status Management

## Overview
Stage 2 manages the transformation journey of units after they exit Stage 1's assignment process. Whether a unit was assigned from stock or newly created in production, it must now be transformed from its current state (Current SKU) to match the customer's ordered specifications (Target SKU).

### Current SKU vs Target SKU
- **Current SKU**: The unit's present state
  - For stock assignments: Could be RAW/BRW universal SKUs needing transformation
  - For new production: Starts as RAW/BRW from production
- **Target SKU**: The customer's ordered specifications
  - Example: Customer orders ST-32-X-32-IND (Target SKU)
  - System might assign ST-32-X-36-RAW (Current SKU)
  - Requests will guide transformation:
    1. Length adjustment: 36" → 32"
    2. Wash transformation: RAW → IND

### Request Layer Purpose
The request system orchestrates all necessary transformations and movements, ensuring:
- Each step is properly validated
- All actions are traceable to specific operators
- Quality standards are maintained
- Customer receives exactly what they ordered

## Request Types and Validation Rules

### 1. Wash Request
- **Purpose**: Guide item from stock location to appropriate wash bin
- **Trigger**: Order assignment to STOCK item (status1 =STOCK, status2 = change to Assigned )
- **Steps and Validation**:
  1. **Find Unit**
     - Required Scans:
       * Item QR code must match request
       * Current location bin must match system location
     - Validations:
       * STATUS1 must be STOCK
       * STATUS2 must be ASSIGNED
       * Item must be linked to active order
     - Failure Cases:
       * Wrong item scanned
       * Item not in expected location
       * Invalid status combination

  2. **Transport to Wash Bin**
     - Required Scans:
       * Wash bin QR code
       * Item QR code confirmation
     - Validations:
       * Wash bin must match assigned wash type
       * Bin must have capacity
       * Bin must be in active state
     - Failure Cases:
       * Wrong bin scanned
       * Bin full/inactive
       * Item scan mismatch

  3. **Confirm Placement**
     - Required Actions:
       * Final item scan
       * Placement confirmation
     - System Updates:
       * STATUS1: STOCK → WASH
       * Location updated to wash bin
       * Timestamp recorded
     - Failure Cases:
       * Scan timeout
       * System update failure

### 2. Move Request
- **Purpose**: Strategic relocation of items
- **Trigger**: QR activation or bin rebalancing
- **Steps and Validation**:
  1. **Find Unit**
     - Required Scans:
       * Item QR code
       * Current location confirmation
     - Validations:
       * Item must be UNCOMMITTED
       * Current location must match system
     - Failure Cases:
       * Item status mismatch
       * Location mismatch

  2. **Transport to New Bin**
     - Required Scans:
       * Target bin QR
       * Item QR confirmation
     - Validations:
       * Bin must have capacity
       * Bin must match SKU grouping rules
       * Bin must be in active state
     - Failure Cases:
       * Capacity exceeded
       * SKU mixing violation
       * Bin inactive

  3. **Confirm Placement**
     - Required Actions:
       * Final item scan
       * Placement confirmation
     - System Updates:
       * Location updated
       * Bin capacity adjusted
       * SKU grouping recorded
     - Failure Cases:
       * Update failure
       * Concurrent modification

### 3. Pattern Request
- **Purpose**: Initiate pattern creation for production
- **Trigger**: Production request acceptance
- **Steps and Validation**:
  1. **Pattern Assignment**
     - Required Actions:
       * Pattern maker acknowledgment
       * Priority confirmation
     - Validations:
       * Pattern maker availability
       * Required specifications present
     - Failure Cases:
       * Missing specifications
       * Resource unavailable

  2. **Pattern Creation**
     - Required Updates:
       * Progress tracking
       * Time logging
     - Validations:
       * Within time constraints
       * Quality checks passed
     - Failure Cases:
       * Time exceeded
       * Quality failure

  3. **Pattern Completion**
     - Required Actions:
       * Quality check confirmation
       * Handoff to cutting
     - System Updates:
       * Status to complete
       * Cutting request generated
     - Failure Cases:
       * Quality rejection
       * Handoff failure

### 4. QR Activation Request
- **Purpose**: First-time activation of produced items
- **Trigger**: Item arrival from production
- **Steps and Validation**:
  1. **Initial Scan**
     - Required Scans:
       * Item QR first scan
     - Validations:
       * QR code must be valid
       * Must be first-time scan
       * Must be from valid production batch
     - Failure Cases:
       * Invalid QR
       * Already activated
       * Batch mismatch

  2. **Status Assignment**
     - System Checks:
       * Waitlist status for SKU
       * Available storage locations
     - Automated Actions:
       * If waitlisted:
         - Assign to order
         - Generate wash request
       * If not waitlisted:
         - Generate move request
         - Calculate optimal storage
     - Failure Cases:
       * Assignment failure
       * Location calculation failure

### 5. Cutting Request
- **Purpose**: Track cutting process for production batch
- **Trigger**: Pattern maker groups pattern requests
- **Steps and Validation**:
  1. **Pattern Pickup**
     - Required Actions:
       * Cutting team receives notification
       * Team acknowledges pickup request
       * Scan pattern QR at pickup
     - Validations:
       * Pattern must be marked complete
       * Pattern must be in pattern office
       * Correct team member pickup
     - Failure Cases:
       * Pattern not ready
       * Wrong location
       * Unauthorized pickup

  2. **Cutting Process**
     - Required Actions:
       * Start cutting notification
       * Progress updates
       * Layer counts
     - Validations:
       * Within spec tolerances
       * Material batch tracking
       * Layer count matches order quantity
     - Failure Cases:
       * Out of spec cuts
       * Material defects
       * Count mismatch

  3. **Completion and QC Handoff**
     - Required Actions:
       * Final count confirmation
       * Bundle creation
       * QC request generation
     - System Updates:
       * Status to complete
       * Triggers QC request
       * Updates production tracking
     - Failure Cases:
       * Count discrepancy
       * Bundle errors
       * System update failure

### 6. QC Request
- **Purpose**: Quality control inspection and measurement validation
- **Trigger**: Cutting request completion
- **Steps and Validation**:
  1. **Bundle Reception**
     - Required Actions:
       * Scan bundle QR
       * Confirm piece count
       * Record batch details
       * Log receiving operator name
     - Validations:
       * Bundle integrity
       * Count accuracy
       * Batch tracking
     - Failure Cases:
       * Missing pieces
       * Incorrect counts
       * Batch mismatch

  2. **Measurement Validation**
     - Required Measurements:
       * Waist measurement
       * Hip measurement
       * Thigh measurement
       * Inseam measurement
     - Validations:
       * Compare against tolerance chart
       * Calculate shrinkage percentages
       * Verify measurements within acceptable range
     - System Updates:
       * Record all measurements
       * Log measuring operator name
       * Store shrinkage calculations
     - Failure Cases:
       * Measurements outside tolerance
       * Excessive shrinkage
       * Inconsistent measurements

  3. **Visual Inspection**
     - Required Actions:
       * Check stitching quality
       * Verify fabric integrity
       * Inspect overall appearance
       * Log inspector name
     - Validations:
       * Meet quality standards
       * No visible defects
       * Proper construction
     - Failure Cases:
       * Construction issues
       * Visible defects
       * Quality standard failures

  4. **QC Decision**
     - Approval Path:
       * All measurements within tolerance
       * Visual inspection passed
       * Generate finishing request
       * Log approving operator name
     - Defect Path:
       * Flag item as DEFECT
       * Log defect type and details
       * Trigger new order creation
       * Return to Stage 1 for new unit search
       * Log rejecting operator name
     - System Updates:
       * Update item status
       * Record all operator actions
       * Maintain full audit trail

### 7. Finishing Request
- **Purpose**: Track finishing process for approved pieces
- **Trigger**: QC request approval
- **Steps and Validation**:
  1. **Bundle Reception**
     - Required Actions:
       * Scan QC-approved bundle
       * Verify piece count
       * Record operator details
     - Validations:
       * QC approval status
       * Count verification
       * Operator assignment
     - Failure Cases:
       * Missing QC approval
       * Count mismatch
       * Assignment issues

  2. **Finishing Process**
     - Required Actions:
       * Process start notification
       * Progress tracking
       * Quality checks
     - Validations:
       * Process standards
       * Quality metrics
       * Time tracking
     - Failure Cases:
       * Quality issues
       * Time overruns
       * Process deviations

  3. **Packing Handoff**
     - Required Actions:
       * Final inspection
       * Bundle preparation
       * Packing request generation
     - System Updates:
       * Status to complete
       * Triggers packing request
       * Updates production tracking
     - Failure Cases:
       * Failed inspection
       * Bundle issues
       * System update failure

### 8. Packing Request
- **Purpose**: Final preparation for warehouse reception
- **Trigger**: Finishing request completion
- **Steps and Validation**:
  1. **Item Reception**
     - Required Actions:
       * Scan finished items
       * Final count verification
       * Quality check
     - Validations:
       * Item condition
       * Count accuracy
       * Finishing quality
     - Failure Cases:
       * Condition issues
       * Count mismatch
       * Quality problems

  2. **Packing Process**
     - Required Actions:
       * Pack according to specs
       * Label generation
       * QR code assignment
     - Validations:
       * Packing standards
       * Label accuracy
       * QR verification
     - Failure Cases:
       * Packing errors
       * Label issues
       * QR problems

  3. **Warehouse Handoff**
     - Required Actions:
       * Final pack scan
       * Location assignment
       * Warehouse notification
     - System Updates:
       * Status to complete
       * Triggers QR activation
       * Updates production tracking
     - Failure Cases:
       * Scan failure
       * Location issues
       * System update failure

## Request State Management

### Request States
1. **Pending**
   - Initial state
   - Awaiting start
   - Can be queued

2. **In Progress**
   - Active processing
   - Step completion tracking
   - Timeout monitoring

3. **Completed**
   - All steps finished
   - All validations passed
   - System updated

4. **Failed**
   - Validation failure
   - System error
   - Timeout exceeded

### State Transitions
- Must be sequential
- Cannot skip states
- Must maintain audit trail
- Must handle concurrent requests

## Validation Rules Matrix

### Universal Rules
1. **Scan Validation**
   - QR codes must be valid
   - Locations must match system
   - Timestamps must be logical

2. **Status Validation**
   - Current status must allow action
   - Status changes must be valid
   - Status updates must be atomic

3. **Location Validation**
   - Physical location must match system
   - Movements must be tracked
   - Capacity must be respected

4. **Time Validation**
   - Steps must complete within limits
   - Timeouts must be handled
   - Delays must be logged

## Defect Handling Process
- **Trigger**: Unit flagged as defective at any stage
- **Immediate Actions**:
  1. System generates high-priority move request
     - Target location: Review bin
     - Must be completed immediately
     - Requires scan confirmation

  2. System notifications:
     - Factory manager notified
     - Includes:
       * Unit details
       * Current location
       * Defect type
       * Reporter information

  3. Order handling:
     - Original order returned to Stage 1
     - System searches for replacement unit
     - Customer notified of delay if necessary

  4. Defect review process:
     - Factory manager inspection required
     - Decision options:
       * Repairable: Generate repair request
       * Unrepairable: Unit marked for disposal
       * False flag: Return to original process

### Finishing Process
- **Purpose**: Complete personalization and final garment details
- **Trigger**: QC approval or wash completion

#### Finishing Request Components
1. **Customer Specifications**
   - Button type selection
   - Hem style preference
   - Name tag details
   - Special instructions

2. **Required Steps**
   - Must all be completed regardless of order
   - Each step requires operator confirmation
   - Steps can be completed in parallel

3. **Step Details**:
   - **Button Application**
     * Verify button type
     * Position confirmation
     * Quality check
   
   - **Hemming Process**
     * Verify hem style
     * Length confirmation
     * Stitch quality check
   
   - **Name Tag**
     * Verify text accuracy
     * Position confirmation
     * Attachment quality

4. **Completion Process**
   - All steps verified
   - Unit scanned
   - Pre-packing bin assignment
   - Placement confirmation triggers packing request

### Packing Process
- **Purpose**: Prepare unit for shipping
- **Trigger**: Finishing request completion and pre-packing bin placement

#### Packing Request Components
1. **Document Generation**
   - Airway bill/shipping label
   - Customer invoice
   - Packing instructions
   - Extras checklist

2. **System Updates**
   - Tracking number generation
   - Order status update
   - Customer profile update
   - Shipping notification preparation

3. **Bin Assignment**
   - Courier-specific pickup location
   - Priority placement
   - Scan confirmation required

#### Status Transitions
1. **Pre-Shipping**
   - Status: "PICKUP"
   - Location: Courier pickup bin
   - Awaiting courier scan

2. **Shipping Handoff**
   - Courier scans pickup
   - Status changes to "FULFILLED"
   - Order archived in customer profile
   - Customer notification sent
   - Tracking details activated

### Status Flow Summary
[More sections to be added...] 