# Testing Policy & Guidelines

## Zero Tolerance Policy

**NOTHING gets committed unless ALL tests pass.** This policy is strictly enforced through pre-commit hooks and CI.

## Automated Enforcement

### Pre-commit Hooks
Pre-commit hooks run automatically before every commit and will **block commits** if any tests fail:

1. **Unit Tests**: All unit tests must pass
2. **Integration Tests**: All integration tests must pass  
3. **Build Check**: Code must build successfully

### Test Commands
```bash
# Run all tests (unit + integration)
pnpm test

# Run only unit tests
pnpm test:unit

# Run only integration tests  
pnpm test:integration

# Run tests in watch mode
pnpm test:watch
```

## Test Architecture

### Unit Tests (`jest.unit.config.js`)
- **Purpose**: Test individual functions and components in isolation
- **Environment**: jsdom for React components, node for services
- **Mocking**: Heavy use of mocks to isolate units
- **Speed**: Fast execution (< 2 seconds)

### Integration Tests (`jest.integration.config.js`)  
- **Purpose**: Test service interactions and API endpoints
- **Database**: Mock database adapter to avoid PGlite compatibility issues
- **AI Services**: Mocked OpenAI and Vercel AI SDK
- **Environment**: Node with comprehensive mocking

## Testing Standards

### Test-Driven Development (TDD)
Following the Red-Green-Refactor cycle:

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make it pass
3. **Refactor**: Improve code while keeping tests green

### Test Structure
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code under test
- **Assert**: Verify the expected outcome

### Mock Strategy
- **Unit Tests**: Mock external dependencies completely
- **Integration Tests**: Use shared mock setup in `jest.setup.integration.cjs`
- **API Tests**: Mock services, test HTTP interface behavior

## Excluded Tests (Temporarily)
Some complex tests requiring advanced database mocking are temporarily excluded until better test infrastructure is available:

- `__tests__/services/actions-full.test.ts`
- `__tests__/api/actions-children.test.ts`  
- `__tests__/api/actions-dependencies.test.ts`
- `__tests__/services/completion-context.test.ts`
- `__tests__/db/adapter.test.ts`

These will be re-enabled once we have proper database test utilities.

## Best Practices

### 1. Naming Conventions
```typescript
describe("ComponentName", () => {
  describe("methodName", () => {
    it("should do something when condition", () => {
      // Test implementation
    });
  });
});
```

### 2. Test Data Factories
Use factory functions for consistent test data:
```typescript
const getMockAction = (overrides?: Partial<Action>): Action => {
  return {
    id: "test-uuid-123",
    title: "Test Action",
    done: false,
    ...overrides,
  };
};
```

### 3. Async Testing
Always await async operations:
```typescript
it("should handle async operations", async () => {
  const result = await someAsyncFunction();
  expect(result).toBe(expected);
});
```

### 4. Error Testing
Test error conditions explicitly:
```typescript
it("should throw error when invalid input", async () => {
  await expect(functionCall()).rejects.toThrow("Expected error message");
});
```

## CI Integration

Tests run in multiple environments:
- **Pre-commit**: Local enforcement before commit
- **GitHub Actions**: Server-side verification (when configured)
- **Vercel**: Build-time verification

## Performance Targets

- **Unit Tests**: < 2 seconds total execution
- **Integration Tests**: < 30 seconds total execution
- **Memory Usage**: Controlled with `maxWorkers: 2` and memory limits

## Troubleshooting

### Common Issues

1. **PGlite Errors**: Use mock database adapter instead of real PGlite
2. **Module Resolution**: Ensure proper moduleNameMapper in Jest config
3. **Memory Issues**: Use `--max-old-space-size=4096` for Node.js
4. **UUID Validation**: Use proper UUID format in test data

### Debug Commands
```bash
# Run tests with verbose output
pnpm jest --verbose

# Run specific test file
pnpm jest __tests__/path/to/test.ts

# Debug failing tests
pnpm jest --detectOpenHandles --forceExit
```

## Maintenance

This testing policy ensures:
- **Code Quality**: Every change is tested
- **Regression Prevention**: Existing functionality stays working
- **Developer Confidence**: Safe refactoring and changes
- **Production Stability**: Issues caught before deployment

The zero tolerance policy might seem strict, but it prevents the accumulation of technical debt and ensures the codebase remains reliable as it grows.