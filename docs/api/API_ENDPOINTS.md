# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints except `/auth/login` require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Auth Endpoints

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}

Response: {
  "success": true,
  "data": {
    "token": "string"
  }
}
```

### Register (Admin only)
```http
POST /auth/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "string",
  "password": "string",
  "role": "ADMIN" | "MANAGER" | "WAREHOUSE" | "QC_TEAM" | "PATTERN_MAKER" | "CUTTING_TEAM" | "WASH_TEAM"
}

Response: {
  "success": true,
  "data": {
    "token": "string"
  }
}
```

## Order Endpoints

### Create Order
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shopify_id": "string",
  "customer_id": "string",
  "items": [
    {
      "target_sku": "string",
      "quantity": number
    }
  ],
  "metadata": {
    // Optional additional data
  }
}

Response: {
  "success": true,
  "data": {
    "order": {
      "id": "string",
      "status": "string",
      // ... other order data
    },
    "requests": [
      // Generated requests
    ]
  }
}
```

### Get Order Details
```http
GET /orders/:id
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "items": [],
    "requests": [],
    // ... other order data
  }
}
```

### Get Order Timeline
```http
GET /orders/:id/timeline
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": [
    {
      "step": "string",
      "status": "string",
      "timestamp": "date",
      "operator": {},
      "metadata": {}
    }
  ]
}
```

## Move Request Endpoints

### Validate Item Scan
```http
POST /move/validate-item
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "itemQrCode": "string",
  "notes": "string" // optional
}

Response: {
  "success": true,
  "data": {
    "timeline": [
      {
        "step": "ITEM_VALIDATED",
        "status": "PENDING"
      }
    ]
  }
}
```

### Validate Destination
```http
POST /move/validate-destination
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "destinationData": {
    "qrCode": "string",
    "type": "BIN" | "ZONE",
    "notes": "string" // optional
  }
}

Response: {
  "success": true,
  "data": {
    "timeline": [
      {
        "step": "DESTINATION_VALIDATED",
        "status": "PENDING"
      }
    ]
  }
}
```

## Pattern Request Endpoints

### Validate Batch
```http
POST /pattern/validate-batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "batchData": {
    "skus": ["string"],
    "quantity": number,
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "notes": "string" // optional
  }
}
```

### Upload Pattern
```http
POST /pattern/upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "patternData": {
    "fileUrl": "string",
    "version": "string",
    "measurements": {
      [key: string]: number
    },
    "notes": "string" // optional
  }
}
```

## QC Request Endpoints

### Submit Measurements
```http
POST /qc/measurements
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "measurements": {
    "waist": number,
    "hip": number,
    "thigh": number,
    "inseam": number,
    "outseam": number, // optional
    "frontRise": number, // optional
    "backRise": number, // optional
    "kneeWidth": number // optional
  },
  "notes": "string" // optional
}
```

### Visual Inspection
```http
POST /qc/visual-inspection
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "inspectionData": {
    "stitchingQuality": "GOOD" | "FAIR" | "POOR",
    "fabricQuality": "GOOD" | "FAIR" | "POOR",
    "washQuality": "GOOD" | "FAIR" | "POOR",
    "defects": [
      {
        "type": "string",
        "severity": "MINOR" | "MAJOR" | "CRITICAL",
        "location": "string",
        "notes": "string" // optional
      }
    ],
    "notes": "string" // optional
  }
}
```

## Finishing Request Endpoints

### Assign Buttons
```http
POST /finishing/assign-buttons
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "buttonData": {
    "color": "string",
    "quantity": number,
    "size": "string",
    "notes": "string" // optional
  }
}
```

### Complete Hem
```http
POST /finishing/complete-hem
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "hemData": {
    "finalLength": number,
    "notes": "string" // optional
  }
}
```

## Wash Request Endpoints

### Assign to Bin
```http
POST /wash/assign-bin
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "string",
  "binQrCode": "string",
  "operatorNotes": "string" // optional
}
```

### Process Bin for Laundry
```http
POST /wash/process-bin
Authorization: Bearer <token>
Content-Type: application/json

{
  "binQrCode": "string",
  "truckId": "string",
  "driverName": "string",
  "expectedReturnDate": "string" // ISO date string
}
```

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Error Codes
- `AUTH_001`: Invalid credentials
- `AUTH_002`: Token expired
- `AUTH_003`: Invalid token
- `AUTH_004`: Insufficient permissions
- `AUTH_005`: Token required
- `AUTH_006`: Email already registered
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `SERVER_ERROR`: Internal server error 