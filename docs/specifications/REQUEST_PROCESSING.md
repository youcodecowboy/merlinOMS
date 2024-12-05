# Request Processing Specifications

## Overview
The request system is event-driven, with requests being triggered by various events including:
- Status changes
- Location changes
- Task completions
- Manual interventions
- QR code scans

## Request Trigger Types

### 1. Status-Based Triggers
- **Assignment Triggers**
  - When STATUS2 changes to ASSIGNED
  - Automatically generates wash request
  - Example: Stock item assigned to order

- **Production Triggers**
  - When STATUS1 changes to PRODUCTION
  - Generates pattern request
  - Example: Production batch accepted

### 2. Location-Based Triggers
- **Laundry Return Triggers**
  - First scan after laundry return
  - Automatically generates QC request
  - Location changes from IN_TRANSIT to QC_AREA

- **Bin Placement Triggers**
  - Pre-packing bin placement
  - Automatically generates packing request
  - Example: Finishing complete, unit placed in pre-pack

### 3. Task Completion Triggers
- **Sequential Requests**
  - Pattern completion → Cutting request
  - Cutting completion → QC request
  - QC approval → Finishing request
  - Finishing completion → Packing request

- **Parallel Requests**
  - Multiple finishing tasks can run parallel
  - Multiple QC stations operating simultaneously

### 4. Scan-Based Triggers
- **First Scan Activation**
  - New production items first scan
  - Triggers either:
    * Wash request (if waitlisted)
    * Move request (if storage needed)

- **Batch Scan Triggers**
  - Laundry return batch scan
  - Triggers individual unit processing

## Request Dependencies

### Linear Dependencies
1. **Production Flow**
   ```
   Pattern Request → Cutting Request → QC Request → Finishing Request → Packing Request
   ```
   - Each step must complete before next triggers
   - Status updates drive progression

2. **Wash Flow**
   ```
   Wash Request → Laundry Process → QC Request → Finishing Request
   ```
   - Location changes drive progression
   - QC validation required before finishing

### Parallel Processing
1. **Finishing Tasks**
   - Button application
   - Hemming
   - Name tag
   - Can process simultaneously
   - All must complete before packing

2. **QC Stations**
   - Multiple stations active
   - Independent processing
   - Same validation requirements

## Request Priority System

### High Priority
1. **Customer Impact Requests**
   - Wash requests for assigned orders
   - Packing requests for complete items
   - QC for returned laundry

2. **Production Flow Requests**
   - Pattern requests for waitlisted orders
   - Cutting requests for active patterns

### Medium Priority
1. **Storage Requests**
   - Move requests for new items
   - Bin reorganization

2. **Batch Processing**
   - Bulk cutting requests
   - Group finishing requests

### Low Priority
- Inventory counts
- Location updates
- General organization

## Request State Management

### Active States
1. **Pending**
   - Created but not started
   - Awaiting prerequisites
   - In queue for processing

2. **In Progress**
   - Currently being worked
   - Steps being completed
   - Resources allocated

3. **Completed**
   - All steps finished
   - Validations passed
   - Next request triggered

4. **Failed**
   - Validation failed
   - Error occurred
   - Requires intervention

### State Transitions
- Must follow defined paths
- Cannot skip states
- Must maintain audit trail
- Must handle timeouts

## Error Handling

### Common Scenarios
1. **Scan Errors**
   - Invalid QR codes
   - Wrong location scans
   - Missing confirmations

2. **Status Conflicts**
   - Invalid state transitions
   - Concurrent updates
   - Missing prerequisites

3. **Resource Issues**
   - Bin capacity
   - Worker availability
   - Equipment problems

### Recovery Procedures
1. **Automatic Recovery**
   - Retry logic
   - Alternative routing
   - Status rollback

2. **Manual Intervention**
   - Supervisor override
   - Status correction
   - Process restart

## Monitoring and Alerts

### System Monitoring
- Request queue length
- Processing times
- Error rates
- Completion rates

### Alert Triggers
- Queue backup
- Extended processing time
- High error rate
- Resource constraints

## Audit Requirements
- All state changes logged
- User actions recorded
- Timestamps maintained
- Dependencies tracked

## Problem Reporting System

### Problem Types
1. **Missing Unit**
   - **Required Information**:
     * Last known location
     * Expected bin/location
     * Time last seen
     * Related request ID
   - **System Actions**:
     * Freezes related request
     * Notifies supervisor
     * Initiates location audit
     * Logs search initiation

2. **Damaged QR**
   - **Required Information**:
     * Physical location of unit
     * Visible unit details
     * Partial QR data if readable
   - **System Actions**:
     * Creates QR replacement request
     * Maintains unit status
     * Links new QR to unit history
     * Logs QR replacement

3. **Defective Unit**
   - **Required Information**:
     * Defect type/category
     * Defect description
     * Photos of defect
     * Current location
   - **System Actions**:
     * Generates move to review bin
     * Notifies quality control
     * Creates defect record
     * Triggers replacement search

4. **Scanning Error**
   - **Required Information**:
     * Error message received
     * Expected outcome
     * Device being used
     * Steps to reproduce
   - **System Actions**:
     * Logs scan attempt
     * Creates IT ticket
     * Provides manual override option
     * Records error pattern

5. **Application Error**
   - **Required Information**:
     * Error message/code
     * Screen/process affected
     * Steps to reproduce
     * User action attempted
   - **System Actions**:
     * Creates high-priority IT ticket
     * Logs error details
     * Provides workaround if available
     * Notifies development team

### Problem Resolution Flow
1. **Submission Process**
   - Available from any request screen
   - Quick-select problem type
   - Dynamic form based on type
   - Photo upload capability
   - Location confirmation

2. **Immediate Actions**
   - Request status update
   - Notification routing
   - Priority assignment
   - Tracking number creation

3. **Resolution Tracking**
   - Problem status updates
   - Resolution timeline
   - Action history
   - Outcome recording

## Event Logging System

### Event Categories

1. **Request Events**
   - **Data Points**:
     * Request ID
     * Event type
     * Timestamp
     * Actor (user/system)
     * Previous state
     * New state
     * Related IDs
   - **Storage**: `request_events` table
   - **Retention**: 12 months active, archived thereafter

2. **Problem Reports**
   - **Data Points**:
     * Problem ID
     * Report type
     * Reporter details
     * Timestamp
     * Related request
     * Description
     * Attachments
   - **Storage**: `problem_reports` table
   - **Retention**: 24 months minimum

3. **Status Changes**
   - **Data Points**:
     * Change ID
     * Entity type (unit/request/problem)
     * Entity ID
     * Previous status
     * New status
     * Change reason
     * Actor
   - **Storage**: `status_changes` table
   - **Retention**: Indefinite

4. **Location Updates**
   - **Data Points**:
     * Update ID
     * Unit ID
     * Previous location
     * New location
     * Update reason
     * Timestamp
     * Actor
   - **Storage**: `location_history` table
   - **Retention**: 12 months active

### Event Storage Structure

1. **Primary Event Store**
   ```sql
   CREATE TABLE request_events (
     event_id UUID PRIMARY KEY,
     request_id UUID,
     event_type VARCHAR(50),
     timestamp TIMESTAMP,
     actor_id UUID,
     previous_state JSONB,
     new_state JSONB,
     metadata JSONB,
     created_at TIMESTAMP
   );
   ```

2. **Problem Reports Store**
   ```sql
   CREATE TABLE problem_reports (
     problem_id UUID PRIMARY KEY,
     request_id UUID,
     problem_type VARCHAR(50),
     reporter_id UUID,
     description TEXT,
     metadata JSONB,
     status VARCHAR(50),
     created_at TIMESTAMP,
     resolved_at TIMESTAMP
   );
   ```

3. **Resolution Actions Store**
   ```sql
   CREATE TABLE resolution_actions (
     action_id UUID PRIMARY KEY,
     problem_id UUID,
     action_type VARCHAR(50),
     actor_id UUID,
     description TEXT,
     metadata JSONB,
     created_at TIMESTAMP
   );
   ```

### Event Access Patterns
1. **Real-time Access**
   - Latest status queries
   - Active problem reports
   - Pending resolutions

2. **Historical Analysis**
   - Problem patterns
   - Resolution times
   - User actions
   - System performance

3. **Audit Trails**
   - Complete unit history
   - Request progression
   - Problem resolution path
   - Actor accountability

### Event Retention Policy
1. **Active Data**
   - 12 months in primary tables
   - Indexed for quick access
   - Full detail retention

2. **Archived Data**
   - Moved to archive tables
   - Compressed storage
   - Retrievable on demand
   - 7-year minimum retention