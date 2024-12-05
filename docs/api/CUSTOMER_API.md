# Customer Management API

## Base URL
```
/api/customers
```

## Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer <token>
```

## Endpoints

### Get Customer Profile
Retrieves detailed customer information including order history and status.

**GET /:customerId**

**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "shopify_id": "string",
    "email": "string",
    "profile": {
      "first_name": "string",
      "last_name": "string",
      "phone": "string",
      "preferred_contact": "email" | "phone",
      "notes": "string"
    },
    "status": {
      "tier": "VIP" | "REGULAR" | "NEW",
      "lifetime_orders": "number",
      "total_spent": "number",
      "average_order_value": "number",
      "last_order_date": "string"
    },
    "preferences": {
      "fit_preferences": {
        "preferred_shape": "string",
        "preferred_length": "number",
        "notes": "string"
      },
      "wash_preferences": ["string"],
      "style_notes": "string"
    },
    "measurements": {
      "waist": "number",
      "hip": "number",
      "thigh": "number",
      "inseam": "number",
      "last_updated": "string"
    },
    "order_history": {
      "total": "number",
      "orders": [
        {
          "id": "string",
          "date": "string",
          "status": "string",
          "items": [
            {
              "sku": "string",
              "final_measurements": {
                "waist": "number",
                "length": "number"
              }
            }
          ]
        }
      ]
    }
  }
}
```

### Update Customer Profile
Updates customer information.

**PUT /:customerId**

**Authorization:** `ADMIN`, `MANAGER`

**Request Body:**
```json
{
  "profile": {
    "first_name": "string",
    "last_name": "string",
    "phone": "string",
    "preferred_contact": "email" | "phone",
    "notes": "string"
  },
  "preferences": {
    "fit_preferences": {
      "preferred_shape": "string",
      "preferred_length": "number",
      "notes": "string"
    },
    "wash_preferences": ["string"],
    "style_notes": "string"
  },
  "measurements": {
    "waist": "number",
    "hip": "number",
    "thigh": "number",
    "inseam": "number"
  }
}
```

### Get Customer Orders
Retrieves customer's order history with detailed status.

**GET /:customerId/orders**

**Query Parameters:**
- `status`: Filter by order status
- `dateRange.start`: Start date filter
- `dateRange.end`: End date filter
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "string",
        "date": "string",
        "status": "string",
        "items": [
          {
            "sku": "string",
            "status": "string",
            "timeline": [
              {
                "stage": "string",
                "date": "string",
                "status": "string"
              }
            ]
          }
        ]
      }
    ],
    "pagination": {
      "total": "number",
      "pages": "number",
      "current": "number"
    }
  }
}
```

### Get Customer Measurements History
Retrieves history of customer measurements.

**GET /:customerId/measurements**

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "waist": "number",
      "hip": "number",
      "thigh": "number",
      "inseam": "number",
      "last_updated": "string"
    },
    "history": [
      {
        "date": "string",
        "measurements": {
          "waist": "number",
          "hip": "number",
          "thigh": "number",
          "inseam": "number"
        },
        "order_id": "string"
      }
    ]
  }
}
```

### Get Customer Analytics
Retrieves customer analytics and insights.

**GET /:customerId/analytics**

**Response:**
```json
{
  "success": true,
  "data": {
    "lifetime_value": "number",
    "order_frequency": "number",
    "average_order_value": "number",
    "preferred_styles": [
      {
        "style": "string",
        "count": "number"
      }
    ],
    "size_consistency": {
      "waist": {
        "most_common": "number",
        "variance": "number"
      },
      "length": {
        "most_common": "number",
        "variance": "number"
      }
    },
    "wash_preferences": [
      {
        "wash": "string",
        "count": "number"
      }
    ]
  }
}
``` 