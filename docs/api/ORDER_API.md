# Order Management API

## Base URL
```
/api/orders
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Create Order
Creates a new order in the system.

**POST /** 

**Authorization:** `ADMIN`, `MANAGER`

**Request Body:**
```json
{
  "customer_id": "string",
  "order_items": [
    {
      "target_sku": "string",
      "quantity": "number"
    }
  ],
  "metadata": {
    "shopify_id": "string",
    "priority": "string",
    "notes": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "customer_id": "string",
    "created_at": "string",
    "order_items": [...]
  }
}
```

### Assign Inventory
Assigns available inventory to an order.

**POST /:orderId/assign**

**Authorization:** `ADMIN`, `MANAGER`, `WAREHOUSE`

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "direct_assignment" | "universal_assignment" | "production_request",
    "itemId": "string",
    "message": "string"
  }
}
```

### Get Order Details
Retrieves detailed information about a specific order.

**GET /:orderId**

**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "customer": {
      "id": "string",
      "email": "string"
    },
    "order_items": [...],
    "timeline": [...],
    "metadata": {...}
  }
}
```

### List Orders
Retrieves a paginated list of orders with optional filters.

**GET /**

**Authorization:** Any authenticated user

**Query Parameters:**
- `status`: Filter by order status (array)
- `dateRange.start`: Start date filter (ISO string)
- `dateRange.end`: End date filter (ISO string)
- `customerId`: Filter by customer
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": "number",
    "pages": "number",
    "current": "number"
  }
}
```

### Check Waitlist Status
Checks if an order is on the waitlist.

**GET /:orderId/waitlist**

**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "position": "number",
    "estimated_time": "string",
    "added_at": "string"
  }
}
```

### Cancel Order
Cancels an existing order.

**POST /:orderId/cancel**

**Authorization:** `ADMIN`, `MANAGER`

**Request Body:**
```json
{
  "reason": "string",
  "notes": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "errors": ["Array of error messages"]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Order not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error message"
}
``` 