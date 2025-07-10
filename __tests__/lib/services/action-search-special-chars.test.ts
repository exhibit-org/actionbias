import { ActionSearchService } from '../../../lib/services/action-search';
import { getDb } from '../../../lib/db/adapter';
import { actions } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// Mock the database
jest.mock('../../../lib/db/adapter');
jest.mock('../../../lib/services/embeddings');
jest.mock('../../../lib/services/vector');

describe('ActionSearchService - Special Character Handling', () => {
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDb as jest.Mock).mockReturnValue(mockDb);
  });

  describe('escapePostgresPattern', () => {
    it('should escape special SQL pattern characters', () => {
      // Access the private method through the class
      const escapeMethod = (ActionSearchService as any).escapePostgresPattern;
      
      expect(escapeMethod('%test%')).toBe('\\%test\\%');
      expect(escapeMethod('_test_')).toBe('\\_test\\_');
      expect(escapeMethod('test\\value')).toBe('test\\\\value');
      expect(escapeMethod('UI & Developer Experience')).toBe('UI & Developer Experience');
      expect(escapeMethod('50% complete_task')).toBe('50\\% complete\\_task');
      expect(escapeMethod('normal text')).toBe('normal text');
    });
  });

  describe('performKeywordSearch with special characters', () => {
    it('should handle queries with % character', async () => {
      const mockResults = [
        {
          id: '1',
          title: '50% Complete Task',
          description: 'A task that is 50% done',
          vision: null,
          done: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          data: {}
        }
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const results = await (ActionSearchService as any).performKeywordSearch(
        '50% complete',
        {
          limit: 10,
          includeCompleted: false,
          excludeIds: [],
          minKeywordLength: 2
        }
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('50% Complete Task');
      
      // Verify the query was built correctly
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });

    it('should handle queries with underscore character', async () => {
      const mockResults = [
        {
          id: '2',
          title: 'user_authentication_flow',
          description: 'Implement user auth flow',
          vision: null,
          done: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          data: {}
        }
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const results = await (ActionSearchService as any).performKeywordSearch(
        'user_authentication',
        {
          limit: 10,
          includeCompleted: false,
          excludeIds: [],
          minKeywordLength: 2
        }
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('user_authentication_flow');
    });

    it('should handle queries with & character', async () => {
      const mockResults = [
        {
          id: '3',
          title: 'UI & Developer Experience',
          description: 'Improve UI and DX',
          vision: null,
          done: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          data: {}
        }
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const results = await (ActionSearchService as any).performKeywordSearch(
        'UI & Developer',
        {
          limit: 10,
          includeCompleted: false,
          excludeIds: [],
          minKeywordLength: 2
        }
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('UI & Developer Experience');
    });

    it('should handle queries with backslash character', async () => {
      const mockResults = [
        {
          id: '4',
          title: 'C:\\Program Files\\App',
          description: 'Windows path handling',
          vision: null,
          done: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          data: {}
        }
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const results = await (ActionSearchService as any).performKeywordSearch(
        'C:\\Program Files',
        {
          limit: 10,
          includeCompleted: false,
          excludeIds: [],
          minKeywordLength: 2
        }
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('C:\\Program Files\\App');
    });
  });

  describe('full search with special characters', () => {
    it('should handle special characters in the full search method', async () => {
      const mockResults = [
        {
          id: 'b83999e0-a6f9-425a-a384-47aaea4f63ed',
          title: 'UI & Developer Experience',
          description: 'Improve the UI and developer experience',
          vision: null,
          done: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          data: {}
        }
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const searchResults = await ActionSearchService.searchActions(
        'UI & Developer Experience',
        {
          searchMode: 'keyword',
          limit: 10,
          includeCompleted: false
        }
      );

      expect(searchResults.results).toHaveLength(1);
      expect(searchResults.results[0].title).toBe('UI & Developer Experience');
      expect(searchResults.searchMode).toBe('keyword');
      expect(searchResults.metadata.keywordMatches).toBe(1);
    });
  });
});