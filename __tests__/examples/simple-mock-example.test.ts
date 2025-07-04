/**
 * Simple example test showing mock utilities work correctly
 */

import { 
  createMockDatabase, 
  createMockAction, 
  createMockEdge,
  createMockCompletionContext 
} from '../utils/drizzle-mocks';

describe('Drizzle Mock Utilities', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
  });

  describe('Mock Database', () => {
    it('should create a mock database with query methods', () => {
      expect(mockDb).toBeDefined();
      expect(typeof mockDb.select).toBe('function');
      expect(typeof mockDb.insert).toBe('function');
      expect(typeof mockDb.update).toBe('function');
      expect(typeof mockDb.delete).toBe('function');
    });

    it('should support setting and clearing mock data', () => {
      const mockActions = [
        createMockAction({ id: 'action-1' }),
        createMockAction({ id: 'action-2' })
      ];

      mockDb._setMockActions(mockActions);
      
      // This is a simplified test - in real usage, queries would filter the data
      expect(mockDb._clearAllMockData).toBeDefined();
      mockDb._clearAllMockData();
    });
  });

  describe('Mock Data Factories', () => {
    it('should create mock action with defaults', () => {
      const action = createMockAction();
      
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('data');
      expect(action.data).toHaveProperty('title', 'Test Action');
      expect(action).toHaveProperty('done', false);
      expect(action).toHaveProperty('version', 0);
      expect(action.created_at).toBeTruthy();
      expect(action.updated_at).toBeTruthy();
    });

    it('should create mock action with custom properties', () => {
      const customAction = createMockAction({
        id: 'custom-123',
        data: {
          title: 'Custom Action',
          description: 'Custom description',
          vision: 'Custom vision'
        },
        done: true,
        parent_id: 'parent-123'
      });

      expect(customAction.id).toBe('custom-123');
      expect(customAction.data.title).toBe('Custom Action');
      expect(customAction.data.description).toBe('Custom description');
      expect(customAction.data.vision).toBe('Custom vision');
      expect(customAction.done).toBe(true);
      expect(customAction.parent_id).toBe('parent-123');
    });

    it('should create mock edge', () => {
      const edge = createMockEdge({
        src: 'parent-id',
        dst: 'child-id',
        kind: 'dependency'
      });

      expect(edge).toHaveProperty('id');
      expect(edge.src).toBe('parent-id');
      expect(edge.dst).toBe('child-id');
      expect(edge.kind).toBe('dependency');
      expect(edge.created_at).toBeTruthy();
    });

    it('should create mock completion context', () => {
      const context = createMockCompletionContext({
        actionId: 'action-123',
        implementationStory: 'Custom implementation',
        changelogVisibility: 'public'
      });

      expect(context).toHaveProperty('id');
      expect(context.actionId).toBe('action-123');
      expect(context.implementationStory).toBe('Custom implementation');
      expect(context.changelogVisibility).toBe('public');
      expect(context.created_at).toBeTruthy();
      expect(context.updated_at).toBeTruthy();
    });
  });

  describe('Query Builder Mock', () => {
    it('should support chaining methods', () => {
      const queryBuilder = mockDb.select();
      
      expect(queryBuilder.where).toBeDefined();
      expect(queryBuilder.limit).toBeDefined();
      expect(queryBuilder.offset).toBeDefined();
      expect(queryBuilder.orderBy).toBeDefined();
      
      // Test chaining
      const chainedQuery = queryBuilder
        .where(jest.fn())
        .limit(10)
        .offset(5)
        .orderBy('created_at');
      
      expect(chainedQuery).toBe(queryBuilder); // Should return same instance for chaining
    });

    it('should mock insert operations', () => {
      const insertQuery = mockDb.insert(mockDb.actions);
      
      expect(insertQuery.values).toBeDefined();
      expect(typeof insertQuery.values).toBe('function');
    });

    it('should mock update operations', () => {
      const updateQuery = mockDb.update(mockDb.actions);
      
      expect(updateQuery.set).toBeDefined();
      expect(typeof updateQuery.set).toBe('function');
    });
  });
});