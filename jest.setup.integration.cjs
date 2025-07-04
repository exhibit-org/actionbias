/**
 * Jest setup for integration tests
 * Uses mock database instead of PGlite to avoid compatibility issues
 */

const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Skip migrations for tests to avoid compatibility issues
process.env.SKIP_MIGRATIONS = 'true';

// Set longer timeout for database tests
jest.setTimeout(30000);

// Mock all services to avoid database dependencies in API tests
jest.mock('./lib/services/actions', () => ({
  ActionsService: {
    createAction: jest.fn(),
    updateAction: jest.fn(),
    deleteAction: jest.fn(),
    getAction: jest.fn(),
    listActions: jest.fn(),
    searchActions: jest.fn(),
    addDependency: jest.fn(),
    removeDependency: jest.fn(),
    joinFamily: jest.fn(),
    getActionTree: jest.fn(),
    getActionDependencies: jest.fn(),
  },
}));

jest.mock('./lib/services/completion-context', () => ({
  CompletionContextService: {
    createCompletionContext: jest.fn(),
    updateCompletionContext: jest.fn(),
    upsertCompletionContext: jest.fn(),
    deleteCompletionContext: jest.fn(),
    getCompletionContext: jest.fn(),
    listCompletionContexts: jest.fn(),
  },
}));

jest.mock('./lib/services/enhanced-context', () => ({
  EnhancedContextService: {
    getEnhancedDependencyCompletions: jest.fn(),
    getSiblingContext: jest.fn(),
    getEnhancedEditorialContext: jest.fn(),
  },
}));

jest.mock('./lib/services/family-summary', () => ({
  FamilySummaryService: {
    generateFamilyContextSummary: jest.fn(),
    generateFamilyVisionSummary: jest.fn(),
  },
}));

// Mock database adapter completely to avoid PGlite issues
jest.mock('./lib/db/adapter', () => {
  // Default mock action for testing
  const defaultMockAction = {
    id: 'test-uuid-123',
    data: { title: 'Test Action' },
    done: false,
    version: 1,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockSelectQuery = {
    from: jest.fn(() => mockSelectQuery),
    where: jest.fn(() => mockSelectQuery),
    limit: jest.fn(() => mockSelectQuery),
    offset: jest.fn(() => mockSelectQuery),
    orderBy: jest.fn(() => mockSelectQuery),
    execute: jest.fn(() => Promise.resolve([defaultMockAction])),
    then: (resolve) => Promise.resolve([defaultMockAction]).then(resolve),
  };

  const mockInsertQuery = {
    values: jest.fn(() => ({
      returning: jest.fn(() => Promise.resolve([defaultMockAction])),
      execute: jest.fn(() => Promise.resolve([defaultMockAction])),
      then: (resolve) => Promise.resolve([defaultMockAction]).then(resolve),
    })),
  };

  const mockUpdateQuery = {
    set: jest.fn(() => ({
      where: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([defaultMockAction])),
        execute: jest.fn(() => Promise.resolve([defaultMockAction])),
        then: (resolve) => Promise.resolve([defaultMockAction]).then(resolve),
      })),
    })),
  };

  const mockDeleteQuery = {
    where: jest.fn(() => ({
      returning: jest.fn(() => Promise.resolve([defaultMockAction])),
      execute: jest.fn(() => Promise.resolve([defaultMockAction])),
      then: (resolve) => Promise.resolve([defaultMockAction]).then(resolve),
    })),
  };

  const mockDb = {
    select: jest.fn(() => mockSelectQuery),
    insert: jest.fn(() => mockInsertQuery),
    update: jest.fn(() => mockUpdateQuery),
    delete: jest.fn(() => mockDeleteQuery),
    execute: jest.fn(() => Promise.resolve([defaultMockAction])),
  };

  return {
    getDb: () => mockDb,
    initializePGlite: jest.fn(() => Promise.resolve()),
    cleanupPGlite: jest.fn(() => Promise.resolve()),
    resetCache: jest.fn(),
  };
});

// Mock crypto.randomUUID for consistent test results
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

// Global setup for each test file
beforeAll(async () => {
  // No PGlite initialization needed - using mocks
  console.log('Using mock database for integration tests');
});

// Global cleanup for each test file
afterAll(async () => {
  // No cleanup needed for mocks
});

// Cleanup between individual tests to ensure isolation
beforeEach(async () => {
  // Reset all mocks between tests
  jest.clearAllMocks();
});

// Force garbage collection after each test to prevent memory issues
afterEach(() => {
  if (global.gc) {
    global.gc();
  }
});