# Route Implementation Guide

## Using BaseRoute

All route files should extend the BaseRoute class for consistent implementation:

```typescript
export class OrderRoutes extends BaseRoute {
  constructor() {
    super();
    this.initializeServices();
  }

  protected initializeRoutes(): void {
    this.createRoute({
      path: '/orders',
      method: 'post',
      handler: this.createOrder.bind(this),
      schema: createOrderSchema
    });
  }
}
```

## Route Configuration

Each route should specify:
1. Path
2. HTTP method
3. Handler function
4. Validation schema
5. Auth requirements

## Response Format

All responses should follow the standard format:
```typescript
{
  success: boolean,
  data?: T,
  error?: {
    code: string,
    message: string
  },
  metadata?: {
    timestamp: string,
    requestId: string
  }
} 