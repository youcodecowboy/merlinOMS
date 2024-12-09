# Production Batches

## Current Implementation

### Data Model
- `Batch` (base model)
  - Contains common fields: id, status, style, quantity
  - Metadata for batch type and additional info
  - Relations to requests and inventory items

- `ProductionBatch` (specialized model)
  - Extends base batch
  - Additional fields: sku, qrCodesPdf
  - Specific to production workflow

### Current Flow
1. User selects pending production requests
2. System validates:
   - Requests exist and are in PENDING status
   - All requests have same SKU
   - Valid quantity specified

3. In a transaction:
   - Creates QR codes for each unit
   - Creates base Batch record
   - Creates ProductionBatch record
   - Updates request statuses to IN_PROGRESS
   - Creates inventory items for each unit
   - Generates QR code images and stores them

### Current Issues
1. Transaction rollback inconsistency
   - Inventory items sometimes created even when batch fails
   - Need better error handling and atomic transactions

2. QR Code complexity
   - Base64 encoding/decoding issues
   - PDF generation adding complexity
   - Frontend display issues

3. Error handling
   - Multiple points of failure
   - Unclear error messages
   - Need better validation feedback

## Proposed Versions

### V1 - Core Functionality
Focus: Basic batch creation and inventory management

Features:
- Create production batch from selected requests
- Create inventory items
- Update request statuses
- Trigger pattern request creation
- Simple status tracking

Technical Simplifications:
- Remove QR code generation for now
- Remove PDF functionality
- Use simple IDs for tracking
- Focus on data integrity and atomic transactions

### V2 - QR Integration
Add:
- Basic QR code generation for items
- QR code display in UI
- QR code scanning functionality
- Item tracking via QR codes

### V3 - Advanced Features
Add:
- PDF generation for QR codes
- Batch printing functionality
- Advanced status tracking
- Detailed event logging
- Pattern request automation
- Production timeline tracking

### V4 - Optimization
Add:
- Batch operations optimization
- Advanced search and filtering
- Performance improvements
- Bulk operations
- Real-time updates

## Next Steps for V1

1. Simplify Current Implementation
   - Remove QR code and PDF generation
   - Focus on core data model integrity
   - Ensure proper transaction rollback

2. Core Features
   ```typescript
   // Basic flow
   - Validate requests
   - Create batch
   - Create inventory items
   - Update request statuses
   - Create pattern request
   ```

3. Error Handling
   - Clear validation messages
   - Proper transaction rollback
   - Consistent error reporting

4. Testing
   - Unit tests for core functionality
   - Integration tests for transaction integrity
   - Error case testing

## Migration Plan

1. Create new branch for V1 implementation
2. Gradually remove complex features
3. Test core functionality thoroughly
4. Document simplified API
5. Plan incremental feature additions for V2-V4 