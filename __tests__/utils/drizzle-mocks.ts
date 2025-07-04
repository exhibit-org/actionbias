/**
 * Reusable mock utilities for Drizzle ORM testing
 * 
 * This file provides chainable mock query builders that mimic Drizzle's fluent API,
 * enabling fast unit tests without requiring actual database connections.
 */

import { jest } from '@jest/globals';

// Mock data types
export type MockAction = {
  id: string;
  data: {
    title: string;
    description?: string;
    vision?: string;
  };
  done: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  deleted_at?: string;
};

export type MockEdge = {
  id: string;
  src: string;
  dst: string;
  kind: 'parent-child' | 'dependency';
  created_at: string;
};

export type MockCompletionContext = {
  id: string;
  actionId: string;
  implementationStory?: string;
  impactStory?: string;
  learningStory?: string;
  changelogVisibility: 'public' | 'team' | 'private';
  created_at: string;
  updated_at: string;
};

/**
 * Creates a mock Drizzle query builder that supports chaining
 */
export class MockQueryBuilder<T = any> {
  private mockData: T[] = [];
  private whereCondition: jest.Mock = jest.fn();
  private limitValue?: number;
  private offsetValue?: number;
  private orderByValue?: string;

  constructor(initialData: T[] = []) {
    this.mockData = [...initialData];
  }

  // Mock Drizzle's select method
  select = jest.fn().mockReturnValue(this);

  // Mock Drizzle's where method
  where = jest.fn().mockImplementation((condition: any) => {
    this.whereCondition.mockImplementation(condition);
    return this;
  });

  // Mock Drizzle's limit method
  limit = jest.fn().mockImplementation((value: number) => {
    this.limitValue = value;
    return this;
  });

  // Mock Drizzle's offset method  
  offset = jest.fn().mockImplementation((value: number) => {
    this.offsetValue = value;
    return this;
  });

  // Mock Drizzle's orderBy method
  orderBy = jest.fn().mockImplementation((column: any) => {
    this.orderByValue = column;
    return this;
  });

  // Mock Drizzle's insert method
  insert = jest.fn().mockImplementation((table: any) => ({
    values: jest.fn().mockImplementation((values: T) => ({
      returning: jest.fn().mockImplementation(() => {
        const newItem = { ...values, id: `mock-id-${Date.now()}` };
        this.mockData.push(newItem as T);
        return Promise.resolve([newItem]);
      }),
      execute: jest.fn().mockImplementation(() => {
        const newItem = { ...values, id: `mock-id-${Date.now()}` };
        this.mockData.push(newItem as T);
        return Promise.resolve();
      })
    }))
  }));

  // Mock Drizzle's update method
  update = jest.fn().mockImplementation((table: any) => ({
    set: jest.fn().mockImplementation((values: Partial<T>) => ({
      where: jest.fn().mockImplementation((condition: any) => ({
        returning: jest.fn().mockImplementation(() => {
          const updated = this.mockData.map(item => ({ ...item, ...values }));
          this.mockData = updated;
          return Promise.resolve(updated);
        })
      }))
    }))
  }));

  // Mock Drizzle's delete method
  delete = jest.fn().mockImplementation((table: any) => ({
    where: jest.fn().mockImplementation((condition: any) => ({
      returning: jest.fn().mockImplementation(() => {
        const toDelete = this.mockData.filter(this.whereCondition);
        this.mockData = this.mockData.filter(item => !this.whereCondition(item));
        return Promise.resolve(toDelete);
      })
    }))
  }));

  // Mock execution methods
  execute = jest.fn().mockImplementation(() => {
    let result = [...this.mockData];
    
    // Note: For testing, we're not implementing complex where filtering
    // In real tests, you would set up specific mock data for each test case
    
    // Apply offset
    if (this.offsetValue !== undefined) {
      result = result.slice(this.offsetValue);
    }
    
    // Apply limit
    if (this.limitValue !== undefined) {
      result = result.slice(0, this.limitValue);
    }
    
    return Promise.resolve(result);
  });

  // Support for .then() to make it promise-like
  then = jest.fn().mockImplementation((onFulfilled: any) => {
    return this.execute().then(onFulfilled);
  });

  // Utility methods for test setup
  setMockData(data: T[]) {
    this.mockData = [...data];
    return this;
  }

  getMockData() {
    return [...this.mockData];
  }

  clearMockData() {
    this.mockData = [];
    return this;
  }
}

/**
 * Creates a complete mock database with all tables
 */
export function createMockDatabase() {
  // Shared data arrays
  const mockActions: MockAction[] = [];
  const mockEdges: MockEdge[] = [];
  const mockCompletionContexts: MockCompletionContext[] = [];

  // Create query builders that share the same data
  const actionsQuery = new MockQueryBuilder<MockAction>(mockActions);
  const edgesQuery = new MockQueryBuilder<MockEdge>(mockEdges);
  const completionContextsQuery = new MockQueryBuilder<MockCompletionContext>(mockCompletionContexts);

  return {
    // Mock table objects
    actions: {},
    edges: {},
    completionContexts: {},
    
    // Query builders
    select: jest.fn().mockImplementation((table: any) => {
      // For mocking purposes, we'll return the appropriate query builder
      // In a real scenario, table would be a table reference, but for mocks we simplify
      return actionsQuery; // Default to actions for simplicity in tests
    }),
    
    insert: jest.fn().mockImplementation((table: any) => {
      if (table === 'actions') return actionsQuery.insert(table);
      if (table === 'edges') return edgesQuery.insert(table);
      if (table === 'completionContexts') return completionContextsQuery.insert(table);
      return new MockQueryBuilder().insert(table);
    }),
    
    update: jest.fn().mockImplementation((table: any) => {
      if (table === 'actions') return actionsQuery.update(table);
      if (table === 'edges') return edgesQuery.update(table);
      if (table === 'completionContexts') return completionContextsQuery.update(table);
      return new MockQueryBuilder().update(table);
    }),
    
    delete: jest.fn().mockImplementation((table: any) => {
      if (table === 'actions') return actionsQuery.delete(table);
      if (table === 'edges') return edgesQuery.delete(table);
      if (table === 'completionContexts') return completionContextsQuery.delete(table);
      return new MockQueryBuilder().delete(table);
    }),

    // Mock raw SQL execution
    execute: jest.fn().mockResolvedValue([]),
    
    // Utility methods for test setup
    _setMockActions: (actions: MockAction[]) => actionsQuery.setMockData(actions),
    _setMockEdges: (edges: MockEdge[]) => edgesQuery.setMockData(edges),
    _setMockCompletionContexts: (contexts: MockCompletionContext[]) => completionContextsQuery.setMockData(contexts),
    _clearAllMockData: () => {
      actionsQuery.clearMockData();
      edgesQuery.clearMockData();
      completionContextsQuery.clearMockData();
    }
  };
}

/**
 * Factory functions for creating test data
 */
export const createMockAction = (overrides: Partial<MockAction> = {}): MockAction => ({
  id: overrides.id || `action-${Math.random().toString(36).substring(7)}`,
  data: {
    title: 'Test Action',
    description: 'Test description',
    vision: 'Test vision',
    ...overrides.data
  },
  done: false,
  version: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockEdge = (overrides: Partial<MockEdge> = {}): MockEdge => ({
  id: `edge-${Math.random().toString(36).substring(7)}`,
  src: 'parent-id',
  dst: 'child-id',
  kind: 'parent-child',
  created_at: new Date().toISOString(),
  ...overrides
});

export const createMockCompletionContext = (overrides: Partial<MockCompletionContext> = {}): MockCompletionContext => ({
  id: `context-${Math.random().toString(36).substring(7)}`,
  actionId: 'action-id',
  implementationStory: 'Test implementation story',
  impactStory: 'Test impact story',
  learningStory: 'Test learning story',
  changelogVisibility: 'team',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

/**
 * Jest mock setup for database adapter
 */
export function mockDatabaseAdapter() {
  const mockDb = createMockDatabase();
  
  jest.doMock('../../lib/db/adapter', () => ({
    getDb: jest.fn().mockReturnValue(mockDb),
    initializePGlite: jest.fn().mockResolvedValue(mockDb),
    cleanupPGlite: jest.fn().mockResolvedValue(undefined),
    resetCache: jest.fn()
  }));
  
  return mockDb;
}