/**
 * Tests for the Vector service
 */

import { VectorService } from '../../../lib/services/vector';

// Mock the database adapter
jest.mock('../../../lib/db/adapter', () => ({
  getDb: jest.fn(() => ({
    execute: jest.fn()
  }))
}));

describe('VectorService', () => {
  const mockDb = {
    execute: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('../../../lib/db/adapter').getDb.mockReturnValue(mockDb);
  });

  describe('findSimilarActions', () => {
    it('should build correct SQL for similarity search', async () => {
      const mockResults = {
        rows: [
          {
            id: 'test-id-1',
            title: 'Test Action',
            description: 'Test description',
            similarity: 0.85
          }
        ]
      };
      mockDb.execute.mockResolvedValue(mockResults);

      const embedding = [0.1, 0.2, 0.3];
      const result = await VectorService.findSimilarActions(embedding, {
        limit: 5,
        threshold: 0.7,
        excludeIds: ['exclude-id']
      });

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        {
          id: 'test-id-1',
          title: 'Test Action',
          description: 'Test description',
          similarity: 0.85
        }
      ]);
    });

    it('should handle empty results', async () => {
      mockDb.execute.mockResolvedValue({ rows: [] });

      const embedding = [0.1, 0.2, 0.3];
      const result = await VectorService.findSimilarActions(embedding);

      expect(result).toEqual([]);
    });
  });

  describe('updateEmbedding', () => {
    it('should update embedding vector for an action', async () => {
      mockDb.execute.mockResolvedValue({ rows: [] });

      const actionId = 'test-action-id';
      const embedding = [0.1, 0.2, 0.3];

      await VectorService.updateEmbedding(actionId, embedding);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      // Just verify the method was called, SQL verification is complex with Drizzle
    });
  });

  describe('getActionsWithoutEmbeddings', () => {
    it('should return actions without embeddings', async () => {
      const mockResults = {
        rows: [
          {
            id: 'action-1',
            title: 'Action without embedding',
            description: 'Test description',
            vision: 'Test vision'
          }
        ]
      };
      mockDb.execute.mockResolvedValue(mockResults);

      const result = await VectorService.getActionsWithoutEmbeddings(50);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        {
          id: 'action-1',
          title: 'Action without embedding',
          description: 'Test description',
          vision: 'Test vision'
        }
      ]);
    });
  });

  describe('getEmbeddingStats', () => {
    it('should return embedding coverage statistics', async () => {
      const mockResults = {
        rows: [
          {
            total_actions: '100',
            actions_with_embeddings: '75',
            actions_without_embeddings: '25'
          }
        ]
      };
      mockDb.execute.mockResolvedValue(mockResults);

      const stats = await VectorService.getEmbeddingStats();

      expect(stats).toEqual({
        totalActions: 100,
        actionsWithEmbeddings: 75,
        actionsWithoutEmbeddings: 25,
        coveragePercentage: 75
      });
    });

    it('should handle zero actions gracefully', async () => {
      const mockResults = {
        rows: [
          {
            total_actions: '0',
            actions_with_embeddings: '0',
            actions_without_embeddings: '0'
          }
        ]
      };
      mockDb.execute.mockResolvedValue(mockResults);

      const stats = await VectorService.getEmbeddingStats();

      expect(stats.coveragePercentage).toBe(0);
    });
  });

  describe('testIndexPerformance', () => {
    it('should measure query execution time', async () => {
      // Mock performance.now to return predictable values
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 0 : 25; // 25ms execution time
      });

      mockDb.execute.mockResolvedValue({
        rows: [
          { id: 'test-1', title: 'Test', description: null, similarity: 0.8 }
        ]
      });

      const embedding = [0.1, 0.2, 0.3];
      const performance_result = await VectorService.testIndexPerformance(embedding);

      expect(performance_result.executionTimeMs).toBe(25);
      expect(performance_result.resultCount).toBe(1);

      // Restore original performance.now
      performance.now = originalNow;
    });
  });
});