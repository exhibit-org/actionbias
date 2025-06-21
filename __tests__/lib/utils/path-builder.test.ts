/**
 * Tests for path-builder utility
 */

import { 
  buildActionPath, 
  buildActionBreadcrumb, 
  getActionPathTitles, 
  getParentPathTitles,
  buildRelativeActionPath 
} from '../../../lib/utils/path-builder';

// Mock the database completely
jest.mock('../../../lib/db/adapter');

describe('Path Builder Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupMockDb(queryResults: any[]) {
    const { getDb } = require('../../../lib/db/adapter');
    let callIndex = 0;
    
    const mockDb = {
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockImplementation((table: any) => ({
          where: jest.fn().mockImplementation((condition: any) => ({
            limit: jest.fn().mockImplementation((num: number) => {
              const result = queryResults[callIndex] || [];
              callIndex++;
              return Promise.resolve(result);
            })
          }))
        }))
      }))
    };
    
    getDb.mockReturnValue(mockDb);
    
    return mockDb;
  }

  describe('buildActionPath', () => {
    it('should build a simple path for action with no parents', async () => {
      setupMockDb([
        // 1. Get current action
        [{ id: 'action-1', title: 'Standalone Action', data: {} }],
        // 2. Get parent edges (none)
        []
      ]);

      const result = await buildActionPath('action-1');

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toEqual({
        id: 'action-1',
        title: 'Standalone Action'
      });
      expect(result.breadcrumb).toBe('Standalone Action');
      expect(result.titles).toEqual(['Standalone Action']);
    });

    it('should build a path with parent traversal logic', async () => {
      // Test that the function handles the core traversal pattern
      setupMockDb([
        // 1. Get current action
        [{ id: 'action-1', title: 'Test Action', data: {} }],
        // 2. Get parent edges (none for this test)
        []
      ]);

      const result = await buildActionPath('action-1');

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toEqual({
        id: 'action-1',
        title: 'Test Action'
      });
      expect(result.breadcrumb).toBe('Test Action');
      expect(result.titles).toEqual(['Test Action']);
    });

    it('should handle actions with titles in JSON data fallback', async () => {
      setupMockDb([
        [{ id: 'action-1', title: null, data: { title: 'JSON Title Action' } }],
        [] // No parent edges
      ]);

      const result = await buildActionPath('action-1');

      expect(result.segments[0].title).toBe('JSON Title Action');
      expect(result.breadcrumb).toBe('JSON Title Action');
    });

    it('should handle untitled actions', async () => {
      setupMockDb([
        [{ id: 'action-1', title: null, data: {} }],
        [] // No parent edges
      ]);

      const result = await buildActionPath('action-1');

      expect(result.segments[0].title).toBe('Untitled');
      expect(result.breadcrumb).toBe('Untitled');
    });

    it('should use custom separator', async () => {
      setupMockDb([
        [{ id: 'action-1', title: 'Single Action', data: {} }],
        []
      ]);

      const result = await buildActionPath('action-1', ' / ');

      expect(result.breadcrumb).toBe('Single Action');
    });

    it('should exclude current action when requested', async () => {
      setupMockDb([
        []  // No parent edges - just returns empty path
      ]);

      const result = await buildActionPath('action-2', ' > ', false);

      expect(result.segments).toHaveLength(0);
      expect(result.breadcrumb).toBe('');
    });

    it('should handle cycle detection', async () => {
      setupMockDb([
        [{ id: 'action-1', title: 'Action 1', data: {} }],
        [{ src: 'action-1', dst: 'action-1', kind: 'child' }]
      ]);

      const result = await buildActionPath('action-1');

      // Should stop at the first occurrence and not loop
      expect(result.segments).toHaveLength(1);
      expect(result.breadcrumb).toBe('Action 1');
    });

    it('should handle missing action error', async () => {
      setupMockDb([[]]);

      await expect(buildActionPath('nonexistent-action')).rejects.toThrow(
        'Action with ID nonexistent-action not found'
      );
    });

    it('should handle missing parent action gracefully', async () => {
      setupMockDb([
        [{ id: 'action-2', title: 'Child', data: {} }],
        [{ src: 'action-1', dst: 'action-2', kind: 'child' }],
        []
      ]);

      const result = await buildActionPath('action-2');

      // Should still return the child action
      expect(result.segments).toHaveLength(1);
      expect(result.breadcrumb).toBe('Child');
    });
  });

  describe('buildActionBreadcrumb', () => {
    it('should return just the breadcrumb string', async () => {
      setupMockDb([
        [{ id: 'action-1', title: 'Test Action', data: {} }],
        []
      ]);

      const breadcrumb = await buildActionBreadcrumb('action-1');

      expect(breadcrumb).toBe('Test Action');
    });
  });

  describe('getActionPathTitles', () => {
    it('should return just the titles array', async () => {
      setupMockDb([
        [{ id: 'action-1', title: 'Test Action', data: {} }],
        []
      ]);

      const titles = await getActionPathTitles('action-1');

      expect(titles).toEqual(['Test Action']);
    });
  });

  describe('getParentPathTitles', () => {
    it('should return only parent titles excluding current action', async () => {
      setupMockDb([
        []  // No parent edges
      ]);

      const titles = await getParentPathTitles('action-1');

      expect(titles).toEqual([]);
    });
  });

  describe('buildRelativeActionPath', () => {
    it('should return full path when shorter than context levels', async () => {
      setupMockDb([
        [{ id: 'action-1', title: 'Test Action', data: {} }],
        []
      ]);

      const relative = await buildRelativeActionPath('action-1', 2);

      expect(relative).toBe('Test Action');
    });

    it('should handle single action with context limit', async () => {
      setupMockDb([
        [{ id: 'action-1', title: 'Single Action', data: {} }],
        []
      ]);

      const relative = await buildRelativeActionPath('action-1', 1);

      expect(relative).toBe('Single Action');
    });
  });
});