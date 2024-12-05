# Mock API Documentation

## Request API
The request system handles all request types including production, wash, and QC requests.

### Request Types 

# Mock API Responses

## Order Endpoints

### Create Order Success
```json
{
  "success": true,
  "data": {
    "id": "ord_123abc",
    "status": "PENDING_ASSIGNMENT",
    "customer_id": "cust_456def",
    "created_at": "2024-01-20T12:00:00Z",
    "order_items": [
      {
        "id": "item_789ghi",
        "target_sku": "ST-32-X-32-IND",
        "status": "PENDING"
      }
    ]
  }
}
```

### Assign Inventory Success (Direct Match)
```json
{
  "success": true,
  "data": {
    "action": "direct_assignment",
    "itemId": "inv_123abc",
    "message": "Exact SKU match found and assigned"
  }
}
```

### Assign Inventory Success (Production Request)
```json
{
  "success": true,
  "data": {
    "action": "production_request",
    "message": "Created pending production request"
  }
}
```

### Get Order Details Success
```json
{
  "success": true,
  "data": {
    "id": "ord_123abc",
    "status": "IN_PROGRESS",
    "customer": {
      "id": "cust_456def",
      "email": "customer@example.com"
    },
    "order_items": [
      {
        "id": "item_789ghi",
        "target_sku": "ST-32-X-32-IND",
        "current_sku": "ST-32-X-36-RAW",
        "status": "ASSIGNED"
      }
    ],
    "timeline": [
      {
        "event": "ORDER_CREATED",
        "timestamp": "2024-01-20T12:00:00Z"
      },
      {
        "event": "ITEM_ASSIGNED",
        "timestamp": "2024-01-20T12:05:00Z"
      }
    ]
  }
}
```

### List Orders Success
```json
{
  "success": true,
  "data": [
    {
      "id": "ord_123abc",
      "status": "IN_PROGRESS",
      "created_at": "2024-01-20T12:00:00Z",
      "customer_email": "customer@example.com"
    }
  ],
  "pagination": {
    "total": 50,
    "pages": 3,
    "current": 1
  }
}
```

### Error Response Examples

#### Validation Error
```json
{
  "success": false,
  "errors": [
    "Invalid SKU format",
    "Customer ID is required"
  ]
}
```

#### Authentication Error
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### Permission Error
```json
{
  "success": false,
  "error": "User does not have required role: ADMIN"
}
```