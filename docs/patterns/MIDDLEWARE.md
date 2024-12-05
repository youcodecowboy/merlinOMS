# API Middleware Patterns

## Error Handling

All API errors are handled consistently through the error handler middleware. Errors are categorized and formatted uniformly:

```typescript
{
  success: false,
  error: string,
  code: string
}
```

### Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Unexpected server error

## Request Validation

Requests are validated using Zod schemas before reaching handlers:

```typescript
const schema = z.object({
  body: z.object({
    // request body schema
  }),
  query: z.object({
    // query params schema
  }),
  params: z.object({
    // url params schema
  })
});
```

## Authentication

JWT-based authentication is required for most endpoints. Add `skipAuth: true` to routes that should be public.

### Headers
```
Authorization: Bearer <token>
``` 