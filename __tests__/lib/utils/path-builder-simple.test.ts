/**
 * Simple integration tests for path-builder utility
 */

import { 
  buildActionPath, 
  buildActionBreadcrumb 
} from '../../../lib/utils/path-builder';

// Mock the database completely
jest.mock('../../../lib/db/adapter', () => ({
  getDb: jest.fn()
}));

describe('Path Builder - Core Functionality', () => {
  it('should have correct function exports', () => {
    expect(typeof buildActionPath).toBe('function');
    expect(typeof buildActionBreadcrumb).toBe('function');
  });

  it('should handle database result format correctly', async () => {
    const { getDb } = require('../../../lib/db/adapter');
    
    // Mock a simple single action scenario
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: jest.fn()
              .mockResolvedValueOnce([{ // Current action
                id: 'test-action',
                title: 'Test Action',
                data: {}
              }])
              .mockResolvedValueOnce([]) // No parent edges
          })
        })
      })
    };
    
    getDb.mockReturnValue(mockDb);

    const result = await buildActionPath('test-action');
    
    expect(result).toHaveProperty('segments');
    expect(result).toHaveProperty('breadcrumb');
    expect(result).toHaveProperty('titles');
    expect(Array.isArray(result.segments)).toBe(true);
    expect(typeof result.breadcrumb).toBe('string');
    expect(Array.isArray(result.titles)).toBe(true);
  });

  it('should handle title fallback from data field', async () => {
    const { getDb } = require('../../../lib/db/adapter');
    
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: jest.fn()
              .mockResolvedValueOnce([{ // Current action with title in data
                id: 'test-action',
                title: null,
                data: { title: 'Data Title' }
              }])
              .mockResolvedValueOnce([]) // No parent edges
          })
        })
      })
    };
    
    getDb.mockReturnValue(mockDb);

    const result = await buildActionPath('test-action');
    
    expect(result.segments[0].title).toBe('Data Title');
    expect(result.breadcrumb).toBe('Data Title');
  });

  it('should handle missing action appropriately', async () => {
    const { getDb } = require('../../../lib/db/adapter');
    
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: jest.fn().mockResolvedValueOnce([]) // No action found
          })
        })
      })
    };
    
    getDb.mockReturnValue(mockDb);

    await expect(buildActionPath('nonexistent')).rejects.toThrow(
      'Action with ID nonexistent not found'
    );
  });

  it('should use default separator correctly', async () => {
    const { getDb } = require('../../../lib/db/adapter');
    
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: jest.fn()
              .mockResolvedValueOnce([{ // Current action
                id: 'test-action',
                title: 'Test Action',
                data: {}
              }])
              .mockResolvedValueOnce([]) // No parent edges
          })
        })
      })
    };
    
    getDb.mockReturnValue(mockDb);

    const result = await buildActionPath('test-action');
    
    // With only one action, breadcrumb should just be the title
    expect(result.breadcrumb).toBe('Test Action');
  });
});