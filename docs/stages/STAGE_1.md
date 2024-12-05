# Stage 1: SKU Matching and Inventory Assignment Logic

## Overview
Stage 1 defines the fundamental SKU search and inventory assignment logic that forms the backbone of our order processing system. This stage ensures accurate SKU matching and proper handling of both production and stock inventory.

## SKU Search Process

### 1. Exact SKU Match
- **Primary Search**
  - Search for exact SKU match first (e.g., "ST-32-X-32-IND")
  - Must match all components:
    - Style (ST) - Immovable
    - Waist (32) - Immovable
    - Shape (X) - Immovable
    - Length (32)
    - Wash (IND)
  - **Critical Requirement**: Units MUST be UNCOMMITTED
  - If no UNCOMMITTED units found, exact match fails and moves to Universal Search

### 2. Universal SKU Fallback
- **Secondary Search**
  - Only triggered if no UNCOMMITTED exact match found
  - Search for universal SKU with following rules:
    - Style (ST) - Must match exactly
    - Waist (32) - Must match exactly
    - Shape (X) - Must match exactly
    - Length - Current SKU length must be GREATER than or EQUAL to target length
    - Wash - Must be RAW or BRW (universal wash codes)
  - **Critical Requirement**: Units MUST be UNCOMMITTED
  - If no UNCOMMITTED units found, order moves to pending production

### Wash Code Mapping

#### Light Wash Group
- **Target Washes**: 
  - STA (Standard)
  - IND (Indigo)
- **Universal Wash**: 
  - RAW (Raw Denim)
  - Used for all light wash transformations

#### Dark Wash Group
- **Target Washes**:
  - ONX (Onyx)
  - JAG (Jaguar)
- **Universal Wash**:
  - BRW (Black Raw)
  - Used for all dark wash transformations

## Assignment Logic

### STATUS1 = PRODUCTION
- When matching units are found with STATUS1 = PRODUCTION:
  1. Set STATUS2 to COMMITTED
  2. Add order to waitlist for that specific SKU
  3. Order remains in waitlist until units complete production
  4. Commitment is at SKU level (soft commitment)

### STATUS1 = STOCK
- When matching units (UNCOMMITTED) are found with STATUS1 = STOCK:
  1. Set STATUS2 to ASSIGNED
  2. Create hard assignment linking specific unit ID to order ID
  3. Generate wash request

### Wash Request Process
- **Trigger**: Unit with STATUS1 = STOCK is assigned to an order
- **Purpose**: Guide warehouse team through unit retrieval and wash bin placement

#### Wash Request Steps
1. **Find Unit**
   - System provides unit location details:
     * Bin location
     * Zone information
     * Any additional location context
   - Warehouse team must scan unit QR code to confirm

2. **Bin Assignment**
   - System assigns specific wash bin
   - Warehouse team must:
     * Transport unit to assigned wash bin
     * Scan wash bin QR code to confirm arrival

3. **Placement Confirmation**
   - Warehouse team must:
     * Place unit in assigned wash bin
     * Confirm placement
   - System updates:
     * Unit location to wash bin
     * STATUS1 changes from STOCK to WASH

#### Status and Location Updates
- Upon wash request completion:
  * Unit STATUS1: STOCK → WASH
  * Unit location updated to wash bin location
  * Unit remains assigned to specific order
  * System maintains link between unit ID and order ID

#### Tracking and Validation
- Each step requires scan confirmation
- System tracks time between steps
- All location changes are logged
- Status changes are recorded for audit purposes

### Waitlist Processing
- When units change from STATUS1 PRODUCTION to STATUS1 STOCK:
  1. System checks waitlist for that SKU
  2. Assigns units to orders in waitlist order (FIFO)
  3. Changes STATUS2 from COMMITTED to ASSIGNED
  4. Creates wash request for assigned unit

### Pending Production Logic
- **Trigger**: No UNCOMMITTED units found in either:
  1. Exact SKU match search
  2. Universal SKU match search

- **Process**:
  1. System creates a pending production request for the UNIVERSAL SKU
     - For light washes (STA/IND): Creates request for RAW
     - For dark washes (ONX/JAG): Creates request for BRW
     - Must match Style/Waist/Shape
     - Uses universal length (36")
  
  2. System checks for existing pending production requests
     - If pending request exists for same universal SKU:
       * Increment quantity needed
       * Add order to existing request's waitlist
     - If no pending request exists:
       * Create new pending production request for universal SKU
       * Start new waitlist with this order

  3. Production Request Priority
     - Priority based on oldest order in waitlist
     - Multiple requests for same universal SKU are consolidated
     - System maintains FIFO order within each SKU's waitlist

  4. Production Request Acceptance
     - Manual acceptance of pending production requests
     - Upon acceptance, system automatically:
       * Creates individual inventory items for requested quantity
       * Generates unique item ID and QR code for each unit
       * Sets initial status: STATUS1 = PRODUCTION, STATUS2 = UNCOMMITTED
       * Creates new production batch containing all accepted units
       * Generates consolidated QR codes for batch tracking
       * Creates pattern request for the universal SKU and quantity
       * Adds universal SKU and quantity to pattern requests table

  5. Waitlist Processing on Acceptance
     - System checks waitlist quantity for the SKU
     - For each unit created:
       * If waitlisted orders exist: STATUS2 changes to COMMITTED
       * If no waitlisted orders: STATUS2 remains UNCOMMITTED
     - Example:
       * 20 units of RAW accepted for production
       * 10 orders in waitlist (mix of STA/IND)
       * Result: 10 units STATUS2 = COMMITTED, 10 units STATUS2 = UNCOMMITTED

## Key Rules
1. **Immovable Components**
   - Style code must always match exactly
   - Waist size must always match exactly
   - Shape must always match exactly

2. **Flexible Components**
   - Length: Current SKU length must be >= target length
   - Wash: Follows wash group mapping rules

3. **Status Transitions**
   - PRODUCTION → STOCK (STATUS1) triggers waitlist processing
   - COMMITTED → ASSIGNED (STATUS2) occurs during unit assignment

## Transaction Integrity
- All status changes must be atomic
- Waitlist processing must maintain FIFO order
- Status changes must be logged for audit purposes

## Success Criteria
- Accurate SKU matching
- Proper status assignment
- Correct waitlist management
- Accurate wash request creation
- Maintained FIFO order for waitlist processing

## Monitoring
- Track status transitions
- Monitor waitlist length per SKU
- Track wash request creation and completion
- Monitor production to stock conversion rates

### Production Flow

#### Pattern Request Processing
- **Trigger**: Production request acceptance creates pattern request
- **Pattern Maker Interface**:
  - Displays all pending pattern requests
  - Allows grouping of multiple SKUs into single cutting request
  - Pattern maker can consolidate similar styles/sizes for efficiency

#### Cutting Process
1. **Pattern Grouping**
   - Pattern maker manually groups compatible SKUs
   - Creates consolidated cutting request
   - System notifies cutting team for pattern pickup
   - Location set to pattern maker office

2. **Cutting Completion**
   - Cutting team marks request as COMPLETE
   - System automatically:
     * Updates items to STATUS1 = PRODUCTION
     * Adds subtype tag "SEWING"
     * Moves to sewing stage

#### Warehouse Arrival and QR Activation
- **First Scan Activation**
  - Critical moment: First QR scan activates item in system
  - Triggers automatic assignment logic:

  1. **With Waitlisted Orders**:
     - System immediately:
       * Assigns item to oldest waitlisted order (position #1)
       * Changes STATUS2 from COMMITTED to ASSIGNED
       * Generates wash request
       * Guides staff through wash bin placement

  2. **Without Waitlisted Orders**:
     - System automatically:
       * Generates storage MOVE REQUEST
       * Calculates optimal bin location based on:
         * Available space
         * Proximity
         * SKU type
       * Guides staff through storage process:
         1. Display target bin location
         2. Require bin QR scan
         3. Confirm item placement

#### Move Request Process
- **Purpose**: Ensure strategic storage of non-waitlisted items
- **Bin Assignment Algorithm**:
  1. **Single SKU Bin Priority**
     - First, search for existing bins containing same SKU
     - If found and has capacity:
       * Assign to this bin to maintain SKU grouping
       * Update bin capacity count

  2. **Empty Bin Search**
     - If no existing bin for SKU or all are full:
       * Search for completely empty bins
       * Prioritize creating new single-SKU bin
       * Reserve entire bin capacity for same SKU

  3. **Mixed SKU Fallback**
     - Only if no single-SKU or empty bins available:
       * Search for bins with available capacity
       * Prioritize bins with most available space
       * Flag bin as mixed-SKU for future reference

  Example:
  - Given: 5 bins of 10 unit capacity
  - Scenario 1:
    * SKU1 arrives: Placed in empty Bin1
    * Another SKU1 arrives: Added to Bin1
    * SKU2 arrives: Placed in empty Bin2 (not mixed with SKU1)
  
  - Scenario 2:
    * All bins contain items
    * Bin1: 8 units of SKU1 (2 spaces free)
    * New SKU1 arrives: Added to Bin1 despite other bins having more space
    * Maintains single-SKU grouping

- **Steps**:
  1. System calculates optimal bin using above algorithm
  2. Displays target bin location to staff
  3. Staff transports item to location
  4. Staff scans bin QR code
  5. Staff confirms placement
  - System updates:
    * Item location to assigned bin
    * Bin capacity/availability
    * Bin SKU grouping status
    * Item status to STOCK/UNCOMMITTED

## Summary of Key Concepts

### Critical Processes
1. **SKU Matching Hierarchy**
   - Exact match (UNCOMMITTED only)
   - Universal match (UNCOMMITTED only)
   - Length must be >= target
   - Wash groups (Light: RAW for STA/IND, Dark: BRW for ONX/JAG)

2. **Status Management**
   - STATUS1: PRODUCTION → STOCK → WASH
   - STATUS2: UNCOMMITTED → COMMITTED → ASSIGNED

3. **Production Flow**
   - Always create universal SKU production requests
   - Pattern → Cutting → Sewing → Warehouse
   - First QR scan activation is critical decision point

4. **Storage Logic**
   - Prioritize single-SKU bins
   - Minimize mixed SKU storage
   - Strategic bin assignment

## Event Logging Requirements

### Order Events
- **Order Creation**
  - Timestamp
  - Order ID
  - Target SKU
  - Customer details
  - Source/channel

- **SKU Search**
  - Search timestamp
  - Target SKU
  - Search type (exact/universal)
  - Results found/not found
  - Matching SKUs if found

### Inventory Assignment Events
- **Unit Assignment**
  - Assignment timestamp
  - Unit ID
  - Order ID
  - Assignment type (direct/universal)
  - Previous status
  - New status

### Production Events
- **Production Request**
  - Request timestamp
  - Universal SKU
  - Quantity needed
  - Waitlist position
  - Source order IDs

- **Pattern/Cutting**
  - Pattern request creation
  - Pattern grouping details
  - Cutting start/completion
  - Batch ID
  - Operator ID

### Location Events
- **Move Requests**
  - Request timestamp
  - Unit ID
  - Source location
  - Target location
  - Operator ID
  - Completion time

- **Bin Management**
  - Bin capacity changes
  - SKU mixing events
  - Bin status updates

### Status Change Events
- **STATUS1 Changes**
  - Previous status
  - New status
  - Timestamp
  - Trigger event
  - Related order/request IDs

- **STATUS2 Changes**
  - Previous status
  - New status
  - Timestamp
  - Trigger event
  - Related order/request IDs

### QR Code Events
- **Generation**
  - Creation timestamp
  - Associated SKU
  - Batch ID
  - Production request ID

- **Activation**
  - First scan timestamp
  - Location
  - Operator ID
  - Resulting action (wash/move request)

### Wash Request Events
- **Creation**
  - Request timestamp
  - Unit ID
  - Target wash
  - Order ID

- **Step Completion**
  - Step number
  - Completion timestamp
  - Operator ID
  - Location updates
  - Status changes

All events should include:
- Event ID
- Event type
- Timestamp
- Actor (system/user ID)
- Related IDs (order, unit, batch, etc.)
- Previous state
- New state
- Additional context metadata