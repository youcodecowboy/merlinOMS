# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automatic order processing on creation
- Real-time production request tracking in the UI
- Production requests table with universal SKU tracking
- Automatic wash request creation for assigned inventory
- Intelligent inventory matching with status-based processing
- Detailed logging for debugging and monitoring
- Pattern requests page with grouping functionality
- Pattern to cutting request workflow
- Real-time pattern request updates with SWR
- QR code generation for inventory items with nanoid
- Inventory item detail page with comprehensive view
- Production batch system with QR code generation
- PDF generation for production batch labels
- Clickable QR icons in inventory table with print functionality
- Order assignment card in inventory details
- Active requests card in inventory details
- Events timeline in inventory details

### Changed
- Orders now process automatically upon creation instead of staying in 'NEW' status
- Production requests now use the unified `request` table with proper metadata
- Updated production page to show real production request data
- Improved type safety in production table columns
- Enhanced order processing logic with three distinct paths:
  1. Found inventory -> WASH status + wash request
  2. No inventory -> PRODUCTION status + production request
  3. Other cases -> PROCESSING status
- Improved request API with better error handling and type safety
- Enhanced table components with consistent empty states
- Enhanced inventory item expanded view with detailed information
- Improved order processing logic with transaction support
- Updated wash request processing to properly set status
- Moved QR code state management to parent component
- Strengthened order processing to prevent double assignments

### Fixed
- Fixed issue where new orders weren't automatically generating production requests
- Fixed production request creation to properly track universal SKUs
- Fixed production request metadata structure for better order tracking
- Fixed TypeScript errors in production page table columns
- Fixed operatorId validation in test order creation
- Fixed OrderStatus enum usage across endpoints
- Fixed inventory search logic
- Restored PRODUCTION status to schema
- Fixed JSON metadata handling in request API
- Fixed table empty state handling
- Fixed runtime error with hooks in QR code component
- Fixed wash request status updates
- Fixed double request creation issue for STA orders
- Fixed inventory item QR code generation
- Fixed expanded view database connection
- Fixed order detail page and API endpoint

### Technical Details
- Changed production request storage from `productionRequest` table to unified `request` table
- Updated request metadata structure to include:
  - `universal_sku`: The universal SKU for production
  - `order_ids`: Array of order IDs waiting for this SKU
  - `quantity`: Total quantity needed
  - `requires_approval`: Flag for requests requiring approval
- Added automatic order processing in test order creation endpoint
- Improved error handling and logging in production request creation
- Added extensive logging throughout order processing flow
- Implemented SWR for real-time data updates
- Added type-safe request handling with proper metadata serialization
- Added production batch schema and migrations
- Implemented transaction-based order processing
- Enhanced inventory item model with QR code support
- Added PDF generation service for batch labels
- Improved event tracking for inventory items