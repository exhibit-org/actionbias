/**
 * Complete testing example demonstrating all testing patterns and utilities
 * This serves as a comprehensive reference for testing Drizzle ORM applications
 */

import { jest } from '@jest/globals';
import { 
  createMockDatabase, 
  createMockAction, 
  createMockEdge,
  mockDatabaseAdapter 
} from '../utils/drizzle-mocks';
import { 
  setupTest, 
  cleanupTest, 
  testDataGenerators, 
  assertions, 
  apiHelpers,
  performanceHelpers,
  suiteHelpers 
} from '../utils/test-helpers';

// Mock the database adapter before importing services
mockDatabaseAdapter();

describe('Complete Testing Example', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  
  // Use standard setup helpers
  suiteHelpers.standardSetup({ clearMocks: true });

  beforeEach(() => {
    const { getDb } = require('../../lib/db/adapter');
    mockDb = getDb();
    mockDb._clearAllMockData();
  });

  describe('Database Operations with Mocks', () => {
    it('should demonstrate basic CRUD operations', async () => {
      // Arrange - Set up test data
      const testAction = createMockAction({
        id: testDataGenerators.randomId('action'),
        data: {
          title: 'Test Action',
          description: 'Test description',
          vision: 'Test vision'
        },
        done: false
      });

      // For demonstration: verify that our mock utilities work
      expect(testAction).toBeDefined();
      assertions.hasRequiredProperties(testAction, ['id', 'data', 'done']);
      assertions.isValidUUID(testAction.id);
      expect(testAction.data.title).toBe('Test Action');

      // Verify that mock database operations can be called
      expect(mockDb.insert).toBeDefined();
      expect(typeof mockDb.insert).toBe('function');
      
      // Test that the insert method returns a chainable object
      const insertQuery = mockDb.insert();
      expect(insertQuery).toBeDefined();
    });

    it('should handle relationships between entities', async () => {
      // Create parent and child actions
      const parentAction = createMockAction({
        id: 'parent-123',
        data: { title: 'Parent Action' }
      });

      const childAction = createMockAction({
        id: 'child-456', 
        data: { title: 'Child Action' },
        parent_id: 'parent-123'
      });

      const edge = createMockEdge({
        src: 'parent-123',
        dst: 'child-456',
        kind: 'parent-child'
      });

      // Test that our mock data creation works correctly
      expect(parentAction.data.title).toBe('Parent Action');
      expect(childAction.parent_id).toBe('parent-123');
      expect(edge.src).toBe('parent-123');
      expect(edge.dst).toBe('child-456');
      expect(edge.kind).toBe('parent-child');

      // Verify relationships
      assertions.hasRequiredProperties(edge, ['id', 'src', 'dst', 'kind']);
    });

    it('should handle complex queries with filtering', async () => {
      // Set up multiple test actions
      const actions = [
        createMockAction({ done: false, data: { title: 'Active 1' } }),
        createMockAction({ done: true, data: { title: 'Complete 1' } }),
        createMockAction({ done: false, data: { title: 'Active 2' } }),
        createMockAction({ done: true, data: { title: 'Complete 2' } })
      ];

      mockDb._setMockActions(actions);

      // Test filtering query
      const query = mockDb.select()
        .where(jest.fn())
        .limit(10)
        .offset(0);

      await query.execute();

      // Verify the query was constructed correctly
      expect(query.where).toHaveBeenCalled();
      expect(query.limit).toHaveBeenCalledWith(10);
      expect(query.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('HTTP API Testing', () => {
    let mockFetch: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
      mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
      global.fetch = mockFetch;
    });

    it('should test API endpoint responses', async () => {
      // Arrange - Set up mock response
      const mockResponseData = {
        action: createMockAction({ data: { title: 'API Test Action' } })
      };

      mockFetch.mockResolvedValueOnce(
        apiHelpers.createMockResponse(mockResponseData, 200)
      );

      // Act - Make API call
      const response = await fetch('/api/actions/test-123');
      const data = await response.json();

      // Assert - Verify response
      expect(mockFetch).toHaveBeenCalledWith('/api/actions/test-123');
      apiHelpers.validateApiResponse(data, ['action']);
      expect(data.action.data.title).toBe('API Test Action');
    });

    it('should handle API error responses', async () => {
      // Test error scenario
      mockFetch.mockResolvedValueOnce(
        apiHelpers.createMockResponse(
          { error: 'Action not found' }, 
          404, 
          false
        )
      );

      const response = await fetch('/api/actions/nonexistent');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(data.error).toBe('Action not found');
    });

    it('should test multiple API calls in sequence', async () => {
      // Set up multiple responses
      const responses = [
        { response: { action: createMockAction() }, status: 200 },
        { response: { success: true }, status: 200 }
      ];

      mockFetch = apiHelpers.createMockFetch(responses);
      global.fetch = mockFetch;

      // Make multiple calls
      const getResponse = await fetch('/api/actions/123');
      const updateResponse = await fetch('/api/actions/123', { method: 'PUT' });

      const getData = await getResponse.json();
      const updateData = await updateResponse.json();

      expect(getData.action).toBeDefined();
      expect(updateData.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      // Mock a database error
      const errorMessage = 'Database connection failed';
      mockDb.select.mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      // Test error handling
      await assertions.throwsWithMessage(
        () => mockDb.select(),
        errorMessage
      );
    });

    it('should handle validation errors', async () => {
      // Test invalid input validation
      const invalidData = {
        title: '', // Empty title should be invalid
        description: testDataGenerators.randomString(1000) // Too long
      };

      // This would normally call a service that validates the data
      const validateData = (data: any) => {
        if (!data.title || data.title.trim() === '') {
          throw new Error('Title is required');
        }
        if (data.description && data.description.length > 500) {
          throw new Error('Description too long');
        }
      };

      await assertions.throwsWithMessage(
        () => validateData(invalidData),
        'Title is required'
      );
    });

    it('should handle concurrent operations', async () => {
      // Simulate concurrent database operations
      const operations = [
        () => mockDb.insert().values(createMockAction()),
        () => mockDb.insert().values(createMockAction()),
        () => mockDb.insert().values(createMockAction())
      ];

      // Execute concurrently
      const results = await Promise.all(
        operations.map(op => op().execute())
      );

      expect(results).toHaveLength(3);
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Testing', () => {
    it('should complete operations within time limits', async () => {
      const fastOperation = async () => {
        return mockDb.select().execute();
      };

      // Assert operation completes within 100ms
      const result = await performanceHelpers.assertWithinTimeLimit(
        fastOperation,
        100
      );

      expect(result).toBeDefined();
    });

    it('should measure operation performance', async () => {
      const operation = async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockDb.select().execute();
      };

      const { result, timeMs } = await performanceHelpers.measureExecutionTime(operation);

      expect(result).toBeDefined();
      expect(timeMs).toBeGreaterThan(5); // Should take at least 5ms
      expect(timeMs).toBeLessThan(100); // Should complete quickly
    });
  });

  describe('Data Generation and Validation', () => {
    it('should generate consistent test data', () => {
      // Test data generators
      const id = testDataGenerators.randomId('test');
      const email = testDataGenerators.randomEmail();
      const date = testDataGenerators.randomDate();

      expect(id).toMatch(/^test-[a-z0-9]+$/);
      expect(email).toMatch(/^test-[a-z0-9]+@example\.com$/);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeLessThan(Date.now());
    });

    it('should validate data structures', () => {
      const testObject = {
        id: testDataGenerators.randomId(),
        name: testDataGenerators.randomString(),
        active: testDataGenerators.randomBoolean(),
        created_at: new Date().toISOString()
      };

      // Validate required properties
      assertions.hasRequiredProperties(testObject, ['id', 'name', 'active']);
      
      // Validate specific formats
      assertions.isRecentDate(testObject.created_at);
      
      expect(typeof testObject.active).toBe('boolean');
    });

    it('should validate arrays of data', () => {
      const testArray = [
        createMockAction(),
        createMockAction(),
        createMockAction()
      ];

      assertions.arrayContainsItemsWithProperties(
        testArray,
        ['id', 'data', 'done'],
        3
      );

      // Each item should have valid structure
      testArray.forEach(item => {
        assertions.isValidUUID(item.id);
        expect(item.data).toBeDefined();
        expect(typeof item.done).toBe('boolean');
      });
    });
  });

  describe('Integration Patterns', () => {
    it('should demonstrate service layer testing', async () => {
      // This would test a real service method if imported
      // For demo purposes, we'll simulate the pattern
      
      const mockService = {
        async createAction(data: any) {
          // Simulate service logic
          const newAction = createMockAction({
            data: { ...data },
            id: testDataGenerators.randomId('action')
          });
          
          // Simulate database interaction
          await mockDb.insert().values(newAction);
          
          return { action: newAction };
        }
      };

      const result = await mockService.createAction({
        title: 'Service Test Action',
        description: 'Testing service integration'
      });

      expect(result.action.data.title).toBe('Service Test Action');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should test complex business workflows', async () => {
      // Simulate a complex workflow: create parent, add child, create dependency
      const parentData = { title: 'Parent Task' };
      const childData = { title: 'Child Task' };
      
      // Step 1: Create parent
      const parent = createMockAction({ data: parentData });
      
      // Step 2: Create child with parent relationship
      const child = createMockAction({ 
        data: childData, 
        parent_id: parent.id 
      });
      
      // Step 3: Create edge relationship
      const edge = createMockEdge({
        src: parent.id,
        dst: child.id,
        kind: 'parent-child'
      });
      
      // Verify the workflow data structures
      expect(parent.data.title).toBe('Parent Task');
      expect(child.data.title).toBe('Child Task');
      expect(child.parent_id).toBe(parent.id);
      expect(edge.src).toBe(parent.id);
      expect(edge.dst).toBe(child.id);
      
      // Verify relationships are correctly established
      const childAction = [parent, child].find(a => a.parent_id === parent.id);
      expect(childAction).toBeDefined();
      expect(childAction!.data.title).toBe('Child Task');
    });
  });
});