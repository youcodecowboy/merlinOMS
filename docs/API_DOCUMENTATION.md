# API Documentation

## Core Concepts

### SKU Structure
- Format: `ST-32-X-32-IND`
  - Style (ST) - Immovable
  - Waist (32) - Immovable
  - Shape (X) - Immovable
  - Length (32) - Flexible
  - Wash (IND) - Follows wash group mapping

### Status Types
- STATUS1: PRODUCTION → STOCK → WASH
- STATUS2: UNCOMMITTED → COMMITTED → ASSIGNED

## Authentication

### Login
- **POST** `/auth/login`
- **Body**:
  ```typescript
  {
    email: string;
    password: string;
  }
  ```
- **Response**:
  ```typescript
  {
    token: string;
    user: {
      id: string;
      email: string;
      role: UserRole;
    }
  }
  ```

## Order Management

### Create Order
- **POST** `/orders/create`
- **Body**:
  ```typescript
  {
    shopify_id: string;
    customer_id: string;
    items: {
      target_sku: string;  // Format: ST-32-X-32-IND
      quantity: number;
    }[];
  }
  ```
- **Response**:
  ```typescript
  {
    success: true;
    data: {
      order_id: string;
      items: {
        target_sku: string;
        assigned_sku?: string;  // If assigned from stock
        status: 'ASSIGNED' | 'WAITLISTED' | 'PENDING_PRODUCTION';
        quantity: number;
      }[];
    }
  }
  ```

### List Orders
- **GET** `/orders`
- **Query Parameters**:
  ```typescript
  {
    status?: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
    customer_id?: string;
    page?: number;
    limit?: number;
  }
  ```

## Inventory Management

### SKU Search
- **POST** `/inventory/search-sku`
- **Body**:
  ```typescript
  {
    target_sku: string;  // Format: ST-32-X-32-IND
    quantity: number;
    search_type: 'EXACT' | 'UNIVERSAL';
  }
  ```
- **Response**:
  ```typescript
  {
    success: true;
    data: {
      available_units: number;
      matching_skus: {
        sku: string;
        status1: 'PRODUCTION' | 'STOCK' | 'WASH';
        status2: 'UNCOMMITTED' | 'COMMITTED' | 'ASSIGNED';
        quantity: number;
      }[];
    }
  }
  ```

### Move Item
- **POST** `/move/create`
- **Body**:
  ```typescript
  {
    item_id: string;
    destination_zone: string;
  }
  ```
- **Response**:
  ```typescript
  {
    success: true;
    data: {
      move_request_id: string;
      status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
      steps: {
        step: 'FIND_UNIT' | 'TRANSPORT' | 'CONFIRM_PLACEMENT';
        status: 'PENDING' | 'COMPLETED';
        required_scans: string[];
      }[];
    }
  }
  ```

### Scan Item
- **POST** `/move/scan-item`
- **Body**:
  ```typescript
  {
    qr_code: string;
    request_id: string;
    step: 'FIND_UNIT' | 'TRANSPORT' | 'CONFIRM_PLACEMENT';
  }
  ```

### Scan Location
- **POST** `/move/scan-location`
- **Body**:
  ```typescript
  {
    location_qr: string;
    type: 'ZONE' | 'BIN' | 'RACK';
    request_id: string;
  }
  ```

## Production Flow

### Create Pattern Request
- **POST** `/production/pattern`
- **Body**:
  ```typescript
  {
    universal_sku: string;  // Format: ST-32-X-36-RAW
    quantity: number;
    specifications: {
      style: string;
      measurements: Record<string, number>;
    }
  }
  ```

### Group Patterns for Cutting
- **POST** `/production/cutting/group`
- **Body**:
  ```typescript
  {
    pattern_request_ids: string[];
    fabric_details: {
      code: string;
      quantity: number;
    }
  }
  ```

### Update Cutting Progress
- **POST** `/production/cutting/progress`
- **Body**:
  ```typescript
  {
    cutting_request_id: string;
    status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    layer_count?: number;
    completed_pieces?: number;
  }
  ```

## Quality Control

### Validate Measurements
- **POST** `/qc/validate-measurements`
- **Body**:
  ```typescript
  {
    bundle_id: string;
    measurements: {
      waist: number;
      hip: number;
      thigh: number;
      inseam: number;
    };
    notes?: string;
  }
  ```

### Visual Inspection
- **POST** `/qc/visual-inspection`
- **Body**:
  ```typescript
  {
    bundle_id: string;
    inspection: {
      points: string[];
      status: 'PASS' | 'FAIL';
    };
    notes?: string;
  }
  ```

### Report Defect
- **POST** `/qc/report-defect`
- **Body**:
  ```typescript
  {
    bundle_id: string;
    defects: {
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      location: string;
    }[];
    recommended_action: string;
    notes?: string;
  }
  ```

## Wash Management

### Create Wash Request
- **POST** `/wash/create`
- **Body**:
  ```typescript
  {
    item_id: string;
    target_wash: string;  // e.g., 'IND', 'ONX'
    order_id: string;
  }
  ```

### Process Wash Steps
- **POST** `/wash/process`
- **Body**:
  ```typescript
  {
    wash_request_id: string;
    step: 'FIND_UNIT' | 'TRANSPORT' | 'CONFIRM_PLACEMENT';
    scans: {
      item_qr?: string;
      bin_qr?: string;
    }
  }
  ```

## Common Response Format

All API endpoints follow a standard response format:

### Success Response
```typescript
{
  success: true;
  data: T; // Type varies by endpoint
}
```

### Error Response
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

## Authentication

All endpoints except `/auth/login` require authentication via Bearer token:
```
Authorization: Bearer <token>
```

## Error Codes

Common error codes:
- `UNAUTHORIZED`: Authentication required or failed
- `FORBIDDEN`: Insufficient permissions
- `INVALID_INPUT`: Validation failed
- `NOT_FOUND`: Requested resource not found
- `CONFLICT`: Resource conflict
- `INTERNAL_ERROR`: Server error
- `INVALID_STATUS`: Invalid status transition
- `INVALID_SCAN`: QR code scan mismatch
- `BIN_FULL`: Target bin is at capacity
- `INVALID_LOCATION`: Location mismatch or invalid

## Event Logging

All endpoints automatically log:
- Event ID
- Event type
- Timestamp
- Actor (user ID)
- Related IDs (order, unit, batch, etc.)
- Previous state
- New state
- Additional context metadata

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user
- Responses include rate limit headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`