# End-to-End Test Issues

## Test Scenario 2: Universal SKU Match (IN PROGRESS)
- [x] Create stock item with RAW wash code (PASSED)
  - Created item with SKU ST-32-X-36-RAW
  - Status1: STOCK, Status2: UNCOMMITTED
  - Location: WAREHOUSE
  - QR Code: SF0N28WP
  - Metadata includes universal_sku: ST-32-X-36
  - Properly assigned to storage bin
  - Events logged: ITEM_CREATED, QR_GENERATED
- [x] Create order with STA wash code (PASSED)
  - Created customer (Leia Organa) with profile
  - Created order with status NEW
  - Created order item with target SKU ST-32-X-36-STA
  - Order status updated to PROCESSING
- [x] Universal SKU matching (PASSED)
  - Successfully matched RAW item to STA order
  - Updated item status to ASSIGNED
  - Created wash request with correct metadata:
    - Type: WASH
    - Status: PENDING
    - SKU: ST-32-X-36-RAW
    - Wash Code: STA
    - Universal SKU: ST-32-X-36
    - Priority: NORMAL
  - Proper relationships maintained:
    - Order → Order Item → Inventory Item
    - Wash Request → Inventory Item
    - Wash Request → Order
- [ ] Process wash request (NEXT STEP)
  - Need to validate item with QR code SF0N28WP
  - Need to start wash process
  - Need to complete wash and assign to bin
  - Need to verify QC request creation

### Current State
- Order ID: 96e90507-203f-4566-88d7-1642929d43c6
- Item ID: 7ed2a201-9e2b-49a2-b2e3-44026883e48f
- Wash Request ID: 94ae8c5a-4fda-4ca0-a503-6de2ecfb16d2
- QR Code: SF0N28WP

### Next Steps
1. Test wash request processing:
   - ~~Validate item using QR code SF0N28WP~~ (DONE)
   - ~~Assign to STARDUST bin~~ (DONE)
   - ~~Verify item location and status updates~~ (DONE)
     * ~~Location: "STARDUST"~~ ✅
     * ~~Status1: "WASH"~~ ✅
     * ~~Status2: "IN_BIN"~~ ✅
   - ~~Verify bin metadata updates~~ (DONE)
     * ~~Item listed in bin's items array~~ ✅
     * ~~Bin capacity and metadata maintained~~ ✅
   - Next: Test QC request creation when item is ready

### Test Results
1. Item Location Update:
   - Successfully moved to STARDUST bin
   - Status correctly updated to WASH/IN_BIN
   - Location properly set to "STARDUST"
   - Metadata includes bin assignment details

2. Bin Metadata Update:
   - Item correctly added to bin's items array
   - Bin capacity (100) maintained
   - Bin description preserved
   - Item tracking metadata added:
     * Item ID: 7ed2a201-9e2b-49a2-b2e3-44026883e48f
     * SKU: ST-32-X-36-RAW
     * Added timestamp: 2024-12-10T08:59:46.785Z

3. Request Status:
   - Request ID: 94ae8c5a-4fda-4ca0-a503-6de2ecfb16d2
   - Status: IN_PROGRESS
   - Metadata includes:
     * Bin assignment details
     * Item validation info
     * Original wash code (STA)
     * Universal SKU match

4. Bin Scan-Out Process:
   - Successfully moved item to LAUNDRY location
   - Updated SKU from RAW to STA (ST-32-STA-36-RAW)
   - Preserved history in metadata:
     * Previous SKU
     * Previous location
     * Scan-out timestamp
     * Bin assignment details

5. QC Request Creation:
   - Automatically triggered on QR scan
   - New QC request created:
     * Request ID: e16e819a-4957-49e4-8359-a36f09d446b3
     * Status: PENDING
     * Type: QC
     * Linked to item: 7ed2a201-9e2b-49a2-b2e3-44026883e48f
   - Default metadata initialized:
     * Priority: MEDIUM
     * Empty measurements object
     * Empty visual inspection object
     * Empty defects array

6. Item Status Updates:
   - Initial: STOCK/ASSIGNED → WAREHOUSE
   - After bin assignment: WASH/IN_BIN → STARDUST
   - After scan-out: WASH/IN_BIN → LAUNDRY
   - After QC creation: QC/PENDING → LAUNDRY

### Verified Workflows
1. ~~Wash Request Processing~~ ✅
2. ~~Bin Assignment~~ ✅
3. ~~Bin Scan-Out~~ ✅
4. ~~QC Request Creation~~ ✅

### Next Steps
1. Process QC request:
   - Start QC inspection
   - Record measurements
   - Complete visual inspection
   - Update item status based on QC results

2. Test edge cases:
   - Invalid QR codes
   - Full bins
   - Missing wash codes
   - Incompatible wash types

### Fixed Issues
1. Navigation:
   - Updated sidebar to use `/qc` instead of `/quality-check`
   - Updated mobile navigation to match
   - Fixed QC table item access error

2. API Routes:
   - Implemented proper wash request endpoints
   - Fixed bin assignment process
   - Added QC request creation trigger
   - Updated item status transitions

3. Data Handling:
   - Added proper type checking
   - Fixed metadata handling
   - Improved error handling
   - Added proper status transitions

### Next Phase
1. Implement QC request creation:
   - Trigger when item is ready for QC
   - Include wash process details
   - Link to original order
   - Track quality metrics

2. Update order status:
   - Reflect item in wash process
   - Track wash completion
   - Update customer notifications

3. Test wash code compatibility:
   - Verify RAW to STA transition
   - Test color code matching
   - Validate wash type restrictions

### Remaining Issues
- ~~Wash request endpoints need to be tested~~ (DONE)
- ~~Item status updates need verification~~ (DONE)
- Order status updates need verification
- Wash code compatibility rules need testing
- QC request trigger needs verification

## Action Items
1. ~~Fix order creation endpoint~~ (DONE)
2. ~~Test wash request validation endpoint~~ (DONE)
3. ~~Test bin assignment~~ (DONE)
4. Test QC request creation
5. Document wash process flow
6. Implement wash code compatibility rules

## API Issues to Fix
1. API endpoints for wash process are not accessible (404 errors):
   - ~~`/api/wash/assign-bin`~~ → `/api/wash/requests/{requestId}/assign-bin` (DONE)
   - ~~`/api/inventory/items/scan`~~ → `/api/inventory/items/scan` (DONE)
   - ~~`/api/inventory/items/update-location`~~ → Not needed, location is updated via bin assignment
   - ~~`/api/requests/wash/{id}/process`~~ → Not needed, process is handled by bin assignment
2. Need to verify:
   - ~~Server port configuration (currently trying 3002)~~ (DONE - working)
   - ~~API route setup in Next.js~~ (DONE)
   - ~~Base URL configuration~~ (DONE)
3. Implement proper endpoints for:
   - ~~Item scanning~~ (DONE)
   - ~~Bin assignment~~ (DONE)
   - ~~Location updates~~ (DONE - handled by bin assignment)
   - ~~Request processing~~ (DONE - handled by bin assignment)

4. Fix API route paths in Next.js:
   - ~~Move `/api/requests/wash/*` routes to `/api/wash/requests/*`~~ (DONE)
   - ~~Ensure consistent path structure across all wash-related endpoints~~ (DONE)
   - ~~Update route handlers to use correct paths~~ (DONE)

## Wash Process Flow
1. Order Creation
   - Order created with target wash code (e.g., STA)
   - System matches available item with compatible universal SKU
   - Creates wash request with PENDING status

2. Item Validation
   - Operator scans item QR code
   - System validates item matches wash request
   - Updates request status to IN_PROGRESS

3. Bin Assignment
   - Operator assigns item to appropriate wash bin
   - System updates:
     * Item location to bin name
     * Item status to WASH/IN_BIN
     * Bin metadata to include item
     * Request metadata with bin assignment

4. Quality Control
   - After wash process completes
   - System automatically creates QC request
   - Item moves to QC workflow