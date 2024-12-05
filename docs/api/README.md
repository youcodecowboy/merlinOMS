# API Documentation

## Routes
- [Core API](./CORE_API.md) - System-wide functionality
- [Order API](./ORDER_API.md) - Order management
- [Inventory API](./INVENTORY_API.md) - Inventory management

## Authentication
All endpoints require authentication via JWT token in Authorization header.

## Error Handling
Standard error response format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
``` 