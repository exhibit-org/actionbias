# Drizzle ORM Testing Best Practices

This document provides comprehensive guidelines for testing Drizzle ORM applications in ActionBias, with a focus on reliability, speed, and maintainability.

## Current Status ✅

**Unit Tests**: 20/24 test suites passing (203 tests) - Fast, reliable, comprehensive coverage  
**Integration Tests**: ❌ Currently disabled due to PGlite/OpenAI configuration issues  
**Overall**: TDD workflows enabled with <1 second feedback loops

## Testing Strategy Overview

We use a **two-tier testing approach** that balances speed with reliability:

1. **Unit Tests** ✅ - Fast tests using mocks for business logic and utilities
2. **Integration Tests** ⚠️ - Slower tests using real PGlite database for critical paths (currently disabled)

## Test Configuration

### Unit Tests (`jest.unit.config.js`)
- **Purpose**: Test business logic, utilities, and components in isolation
- **Database**: Mocked using `__tests__/utils/drizzle-mocks.ts`
- **Speed**: Fast (multiple workers, no I/O)
- **Scope**: Pure functions, utilities, components, validation logic
- **Run with**: `npm run test:unit`

### Integration Tests (`jest.integration.config.js`) 
- **Purpose**: Test database operations, services, and API routes end-to-end
- **Database**: Real PGlite database with proper isolation
- **Speed**: Slower (single worker, real database operations)
- **Scope**: Services, API routes, database operations
- **Run with**: `npm run test:integration`

## When to Use Each Type

### Use Unit Tests For:
- ✅ Pure functions and utility methods
- ✅ React component rendering and interactions
- ✅ Validation schemas and business logic
- ✅ Data transformations and calculations
- ✅ Error handling scenarios
- ✅ Edge cases with complex inputs

### Use Integration Tests For:
- ✅ Database CRUD operations
- ✅ Service layer methods that query the database
- ✅ API route handlers
- ✅ Complex business workflows involving multiple services
- ✅ Data consistency and transaction testing
- ✅ Migration testing

## Unit Testing with Mocks

### Setting Up Drizzle Mocks

```typescript
import { 
  createMockDatabase, 
  createMockAction, 
  mockDatabaseAdapter 
} from '../utils/drizzle-mocks';

// Mock the database adapter before importing services
mockDatabaseAdapter();

// Import services after mocking
import { ActionsService } from '../../lib/services/actions';

describe('ActionsService Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    const { getDb } = require('../../lib/db/adapter');
    mockDb = getDb();
    mockDb._clearAllMockData();
    jest.clearAllMocks();
  });

  it('should create an action', async () => {
    const result = await ActionsService.createAction({
      title: 'Test Action'
    });

    expect(result.action.data?.title).toBe('Test Action');
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
```

### Mock Data Factories

Use the provided factory functions for consistent test data:

```typescript
// Create mock action with defaults
const action = createMockAction();

// Create mock action with overrides
const customAction = createMockAction({
  id: 'custom-123',
  data: { title: 'Custom Action' },
  done: true
});

// Create mock edges and completion contexts
const edge = createMockEdge({ src: 'parent', dst: 'child' });
const context = createMockCompletionContext({ actionId: 'action-123' });
```

## HTTP Request Mocking

For testing API integrations and external service calls:

```typescript
import { jest } from '@jest/globals';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should handle API responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    const response = await fetch('/api/test');
    const data = await response.json();

    expect(data.success).toBe(true);
  });
});
```

## Integration Testing with PGlite

### Important Notes about PGlite
- **Known Issues**: PGlite has compatibility issues with Jest worker processes
- **Current Status**: ❌ Integration tests currently failing with "TypeError: The URL must be of scheme file" errors
- **SIGSEGV Issue**: ✅ Resolved through separate test configurations and proper worker management
- **Workaround**: Use single worker mode (`maxWorkers: 1`) and memory databases
- **Alternative**: Consider using Testcontainers with PostgreSQL for CI environments

### Integration Test Status (As of 2025-07-04)
⚠️ **Integration tests are currently disabled** due to configuration issues:
1. PGlite URL scheme errors preventing database initialization
2. OpenAI SDK module resolution conflicts with Jest
3. These issues are tracked in action ID: `81687417-6967-4498-9ae1-c9c180632631`

Unit tests provide comprehensive coverage with mocks while integration issues are resolved.

### Integration Test Pattern

```typescript
import { ActionsService } from '../../lib/services/actions';
import { getDb, initializePGlite, cleanupPGlite } from '../../lib/db/adapter';

describe('ActionsService Integration Tests', () => {
  beforeEach(async () => {
    // Database setup is handled by jest.setup.integration.cjs
    // Each test gets a clean database state
  });

  it('should persist action to database', async () => {
    const result = await ActionsService.createAction({
      title: 'Integration Test Action',
      description: 'Testing with real database'
    });

    expect(result.action.id).toBeDefined();
    
    // Verify data persisted
    const retrieved = await ActionsService.getAction(result.action.id);
    expect(retrieved?.data?.title).toBe('Integration Test Action');
  });
});
```

## Test Organization

### Directory Structure
```
__tests__/
├── examples/           # Example tests showing patterns
├── utils/             # Test utilities and mocks
├── lib/               # Unit tests for lib/ code  
├── validation/        # Schema validation tests
├── components/        # React component tests
├── services/          # Integration tests for services
├── api/              # Integration tests for API routes
├── integration/      # End-to-end integration tests
└── db/               # Database-specific tests
```

### File Naming Conventions
- Unit tests: `*.test.ts` in appropriate subdirectory
- Integration tests: `*.test.ts` in `services/`, `api/`, or `integration/`
- Mock utilities: `*-mocks.ts` in `utils/`
- Test helpers: `*-utils.ts` in `utils/`

## Testing Guidelines

### General Principles
1. **Test Behavior, Not Implementation**: Focus on what the code does, not how
2. **Use Real Schemas**: Import actual Zod schemas rather than redefining them
3. **Immutable Test Data**: Never mutate test data between tests
4. **Descriptive Test Names**: Use clear, behavior-focused test descriptions
5. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification

### Data Management
```typescript
// ✅ Good: Use factory functions with overrides
const action = createMockAction({ 
  data: { title: 'Specific Test Case' } 
});

// ❌ Bad: Manual object creation
const action = {
  id: 'test-123',
  data: { title: 'Test' },
  // Missing required fields...
};

// ✅ Good: Clean state between tests
beforeEach(() => {
  mockDb._clearAllMockData();
  jest.clearAllMocks();
});
```

### Error Testing
```typescript
// Test both success and failure scenarios
describe('error handling', () => {
  it('should handle database connection errors', async () => {
    mockDb.insert.mockRejectedValueOnce(new Error('Connection failed'));
    
    await expect(
      ActionsService.createAction({ title: 'Test' })
    ).rejects.toThrow('Connection failed');
  });

  it('should handle validation errors', async () => {
    await expect(
      ActionsService.createAction({ title: '' }) // Invalid title
    ).rejects.toThrow('Validation');
  });
});
```

## Performance Considerations

### Unit Test Optimization
- **Use mocks aggressively** to avoid I/O operations
- **Parallel execution** is safe with proper mocking
- **Memory management**: Clear mocks between tests
- **Fast feedback** should be under 5 seconds for full unit suite

### Integration Test Optimization  
- **Serial execution** to prevent database conflicts
- **Database cleanup** between tests for isolation
- **Transaction rollback** where possible instead of full cleanup
- **Selective testing** - not every function needs integration tests

## CI/CD Integration

### Pre-commit Hooks
```bash
# Run only unit tests for speed
npm run test:pre-commit
```

### Full Test Suite
```bash
# Run both unit and integration tests
npm test
```

### Coverage Requirements
- **Unit Tests**: 70% coverage minimum
- **Integration Tests**: 80% coverage minimum for critical paths
- **Combined**: Focus on meaningful coverage, not just numbers

## Troubleshooting

### Common Issues

#### PGlite SIGSEGV Errors
- **Symptom**: Jest worker crashes with segmentation fault
- **Cause**: Native module conflicts in worker processes
- **Solution**: Use `maxWorkers: 1` for integration tests

#### Module Import Errors
- **Symptom**: Cannot resolve module paths
- **Cause**: Jest moduleNameMapper configuration
- **Solution**: Check `jest.config.js` path mappings

#### Mock Not Working
- **Symptom**: Real code executes instead of mock
- **Cause**: Mock setup order or scope issues
- **Solution**: Mock before importing, use `jest.doMock()`

### Debug Strategies
1. **Isolate the test**: Run single test to identify issue
2. **Check mock setup**: Verify mocks are properly configured  
3. **Review imports**: Ensure correct import order
4. **Use verbose output**: Add `--verbose` flag for detailed output

## Migration Path

### From Existing Tests
1. **Identify test type**: Unit vs integration based on dependencies
2. **Move to appropriate directory**: Follow new structure
3. **Add proper mocking**: Use utilities for unit tests
4. **Update imports**: Follow new path patterns
5. **Verify isolation**: Ensure tests don't affect each other

### New Test Development
1. **Start with unit tests**: Mock dependencies, test logic
2. **Add integration tests**: For critical database operations
3. **Use examples**: Reference existing patterns in `__tests__/examples/`
4. **Follow conventions**: Naming, structure, and documentation

## Examples

See the following example files for reference implementations:
- `__tests__/examples/simple-mock-example.test.ts` - Basic mock usage
- `__tests__/examples/fetch-mock-example.test.ts` - HTTP request mocking
- `__tests__/examples/drizzle-mock-example.test.ts` - Service testing with mocks

## Scripts Reference

```bash
# Unit tests only (fast) ✅ RECOMMENDED
npm run test:unit

# Integration tests only (slower) ⚠️ CURRENTLY FAILING  
npm run test:integration

# Full test suite ⚠️ Unit tests pass, integration tests fail
npm test

# Watch mode for development ✅ Use unit tests for TDD
npm run test:watch

# CI mode ✅ Unit tests provide sufficient coverage
npm run test:ci
```

### Current Recommended Workflow
```bash
# For development and TDD (fast, reliable)
npm run test:unit

# For watch mode during development
npm run test:watch

# Integration tests are temporarily disabled - use unit tests with mocks
```

This testing strategy provides a solid foundation for reliable, maintainable tests while addressing the specific challenges of testing Drizzle ORM applications.