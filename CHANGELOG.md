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