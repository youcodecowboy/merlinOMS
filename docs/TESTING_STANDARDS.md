# Testing Standards

# ⚠️ IMPORTANT: NEVER DELETE FROM THIS FILE - ONLY ADD AND UPDATE ⚠️
This document serves as a historical record of our testing standards and patterns.

## Test Organization

### File Structure
- Tests should be in __tests__ directory next to source files
- Integration tests in src/__tests__/integration/
- Test helpers in src/utils/__tests__/
- Test file names should match source: `*.test.ts`

### Test Suite Organization

## Integration Tests

### Database Setup
- Use dedicated test database (oms_test)
- Reset database between test suites
- Clean tables between tests
- Keep migrations table intact
- Use explicit selects in all Prisma queries

### Workflow Tests
Each workflow test should:
1. Create required test data in beforeAll
2. Clean non-essential tables in beforeEach
3. Test complete user journey end-to-end
4. Log key steps for debugging
5. Verify final state

Example workflow test:

## Test Structure and Naming

### Test Suite Names
- Use descriptive names that indicate the feature or component being tested
- Group related tests under meaningful describe blocks
- Use present tense for describe blocks: "handles", "processes", "validates"

### Test Case Names
- Start with "should" followed by expected behavior
- Be specific about the scenario and expected outcome
- Include edge cases and error conditions in description

Example:
```typescript
describe('OrderProcessor', () => {
  describe('processOrder', () => {
    it('should create new order when valid items provided', () => {})
    it('should throw error when inventory insufficient', () => {})
  })
})
```

## Test Implementation

### Setup and Teardown
- Use beforeAll for one-time setup (database connections, test data)
- Use beforeEach for per-test setup (resetting state)
- Clean up resources in afterEach/afterAll
- Keep setup code minimal and focused

### Assertions
- Use explicit assertions with meaningful messages
- Test one concept per test case
- Verify both positive and negative cases
- Check edge cases and boundary conditions

### Mocking and Stubs
- Mock external dependencies (APIs, services)
- Use realistic test data
- Document mock behavior in test description
- Reset mocks between tests

## Best Practices

### Code Quality
- Keep tests DRY but readable
- Extract common setup into helper functions
- Use meaningful variable names
- Comment complex test scenarios

### Test Coverage
- Aim for high coverage of business logic
- Test error handling paths
- Include edge cases and boundary conditions
- Focus on critical user journeys

### Performance
- Keep tests fast and independent
- Minimize database operations
- Use test doubles for slow dependencies
- Batch similar operations

### Maintenance
- Update tests when requirements change
- Remove obsolete tests
- Keep test code as clean as production code
- Document special test requirements

## Common Patterns

### Data Factories
- Use factories for test data creation
- Implement sensible defaults
- Allow overriding specific fields
- Keep test data realistic

### Helper Functions
- Create helpers for common operations
- Document helper function purpose
- Keep helpers simple and focused
- Place in dedicated test utility files

### Error Testing
- Verify error messages and types
- Test error handling paths
- Include recovery scenarios
- Document expected error conditions

### API Testing
- Test request/response formats
- Verify error responses
- Check authentication/authorization
- Test rate limiting and quotas

## Documentation

### Test Documentation
- Document test setup requirements
- Explain complex test scenarios
- Include examples of test data
- Document known limitations

### Debugging Tips
- Use descriptive error messages
- Add debug logging in key points
- Document common failure modes
- Include troubleshooting steps