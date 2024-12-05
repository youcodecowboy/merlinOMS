# Core API Documentation

Core endpoints handle system-wide functionality like SKU validation, event logging, and system health.

## Endpoints

### SKU Validation
POST /api/core/sku/validate
```json
{
  "sku": "ST-32-X-34-RAW"
}
```

### Event Logging
GET /api/core/events
Query parameters:
- type: EventType
- actorId: string
- itemId: string
- orderId: string
- from: Date
- to: Date

### System Health
GET /api/core/health
Returns system health status including database connectivity 