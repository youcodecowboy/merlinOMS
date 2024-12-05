# API Route Standards

## Route Structure
All API routes should:
1. Extend BaseRoute
2. Use Zod schemas for validation
3. Implement consistent error handling
4. Follow RESTful conventions
5. Include proper TypeScript types

## Example Implementation

```typescript
export class ExampleRoute extends BaseRoute {
  constructor() {
    super();
    this.initializeServices();
  }

  protected initializeRoutes(): void {
    this.createRoute({
      path: '/',
      method: 'post',
      handler: this.createEntity.bind(this),
      schema: createEntitySchema
    });
  }
}
```

## Validation
- Use Zod schemas for all request validation
- Validate body, query, and path parameters
- Include custom error messages

## Error Handling
- Use APIError for known errors
- Include proper status codes
- Provide clear error messages
- Log unexpected errors

## Response Format
All responses should follow:
```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}
```

## Authentication
- Use authenticate middleware by default
- Explicitly mark public routes with skipAuth
- Include proper role checks 