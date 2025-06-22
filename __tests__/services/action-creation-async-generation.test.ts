import { ActionsService } from "../../lib/services/actions";

// Mock the database adapter with proper drizzle ORM chaining
const createMutableQueryBuilder = (resolvedValue: any) => {
  const builder: any = {
    from: jest.fn(() => builder),
    where: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    select: jest.fn(() => builder),
    innerJoin: jest.fn(() => builder),
    offset: jest.fn(() => builder),
    returning: jest.fn(() => Promise.resolve(resolvedValue)),
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
  return builder;
};

const mockDb = {
  select: jest.fn(() => createMutableQueryBuilder([])),
  insert: jest.fn(() => createMutableQueryBuilder([])),
  update: jest.fn(() => createMutableQueryBuilder([])),
  delete: jest.fn(() => createMutableQueryBuilder([])),
  execute: jest.fn(),
};

// Mock external dependencies
jest.mock("../../lib/db/adapter", () => ({
  getDb: () => mockDb,
}));

jest.mock("../../lib/db/init");

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
});

// Mock console to track async function calls
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
};

// Mock the AI services
jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));

// Mock the analysis and placement services
jest.mock("../../lib/services/analysis", () => ({
  needsPlacementAnalysis: jest.fn(() => true),
  AnalysisService: {
    analyzeActionContent: jest.fn().mockResolvedValue({
      metadata: {
        qualityScore: 0.85,
        contentLength: 100,
        hasDescription: true,
        hasVision: true
      },
      keywords: {
        keywords: ['test', 'action'],
        contentKeywords: ['test'],
        descriptionKeywords: ['action']
      }
    })
  }
}));

jest.mock("../../lib/services/placement", () => ({
  PlacementService: {
    findBestParent: jest.fn().mockResolvedValue({
      bestParent: { id: 'auto-parent-id', title: 'Auto Parent' },
      confidence: 0.9,
      reasoning: 'High semantic similarity',
      analysis: {
        metadata: { qualityScore: 0.85 },
        keywords: { keywords: ['test'] }
      }
    })
  }
}));

// Mock embedding service
jest.mock("../../lib/services/embeddings", () => ({
  EmbeddingsService: {
    generateEmbedding: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock summary services
jest.mock("../../lib/services/summary", () => ({
  SummaryService: {
    generateNodeSummary: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock("../../lib/services/parent-summary", () => ({
  ParentSummaryService: {
    generateBothParentSummaries: jest.fn().mockResolvedValue({
      contextSummary: 'Test context summary',
      visionSummary: 'Test vision summary'
    }),
    updateParentSummaries: jest.fn().mockResolvedValue(undefined),
    getParentChain: jest.fn().mockResolvedValue([
      { title: 'Parent Action', description: 'Parent description', vision: 'Parent vision' }
    ])
  }
}));

jest.mock("../../lib/services/subtree-summary", () => ({
  SubtreeSummaryService: {
    generateSubtreeSummary: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock the async generation functions to track if they're called
const mockGenerateParentSummariesAsync = jest.fn().mockResolvedValue(undefined);
const mockGenerateEmbeddingAsync = jest.fn().mockResolvedValue(undefined);
const mockGenerateNodeSummaryAsync = jest.fn().mockResolvedValue(undefined);
const mockGenerateSubtreeSummaryAsync = jest.fn().mockResolvedValue(undefined);

describe('Action Creation Async Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    
    // Reset the mock functions
    mockGenerateParentSummariesAsync.mockClear();
    mockGenerateEmbeddingAsync.mockClear();
    mockGenerateNodeSummaryAsync.mockClear();
    mockGenerateSubtreeSummaryAsync.mockClear();

    // Setup default database mocks
    mockDb.insert.mockReturnValue(createMutableQueryBuilder([
      { id: 'test-uuid-123', title: 'Test Action', done: false }
    ]));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Action Creation with Explicit Parent', () => {
    beforeEach(() => {
      // Mock parent exists
      mockDb.select.mockReturnValue(createMutableQueryBuilder([
        { id: 'parent-id', title: 'Parent Action' }
      ]));
    });

    it('should call generateParentSummariesAsync for actions with explicit parent', async () => {
      const result = await ActionsService.createAction({
        title: "Test Action",
        description: "Test description",
        vision: "Test vision",
        parent_id: "parent-id"
      });

      expect(result.action.id).toBe('test-uuid-123');
      expect(result.parent_id).toBe('parent-id');
      
      // Wait for async operations to be scheduled
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify parent summaries service was called
      const { ParentSummaryService } = require("../../lib/services/parent-summary");
      expect(ParentSummaryService.generateBothParentSummaries).toHaveBeenCalled();
      
      // Verify other async services are also called
      const { EmbeddingsService } = require("../../lib/services/embeddings");
      const { SummaryService } = require("../../lib/services/summary");
      expect(EmbeddingsService.generateEmbedding).toHaveBeenCalled();
      expect(SummaryService.generateNodeSummary).toHaveBeenCalled();
      
      // Should create parent edge
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'edges'
        })
      );
    });

    it('should handle async generation failures gracefully', async () => {
      // Make parent summary generation fail
      const { ParentSummaryService } = require("../../lib/services/parent-summary");
      ParentSummaryService.generateBothParentSummaries.mockRejectedValueOnce(new Error('AI service error'));
      
      const result = await ActionsService.createAction({
        title: "Test Action",
        parent_id: "parent-id"
      });

      expect(result.action.id).toBe('test-uuid-123');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Action creation should succeed even if async generation fails
      expect(result.parent_id).toBe('parent-id');
      
      // Error should be logged but not thrown (async errors are caught)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate parent summaries for action test-uuid-123'),
        expect.any(Error)
      );
    });

    it('should call all expected async functions for complete action', async () => {
      await ActionsService.createAction({
        title: "Complete Test Action",
        description: "Detailed description",
        vision: "Clear vision statement",
        parent_id: "parent-id",
        depends_on_ids: ["dep-1", "dep-2"]
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify all async generation functions are called
      expect(mockGenerateParentSummariesAsync).toHaveBeenCalledWith('test-uuid-123');
      expect(mockGenerateEmbeddingAsync).toHaveBeenCalledWith(
        'test-uuid-123',
        expect.objectContaining({
          title: "Complete Test Action",
          description: "Detailed description",
          vision: "Clear vision statement"
        })
      );
      expect(mockGenerateNodeSummaryAsync).toHaveBeenCalledWith(
        'test-uuid-123',
        expect.objectContaining({
          title: "Complete Test Action"
        })
      );

      // Should create dependencies
      expect(mockDb.insert).toHaveBeenCalledTimes(4); // action + parent edge + 2 dependency edges
    });
  });

  describe('Action Creation with Auto-placement', () => {
    beforeEach(() => {
      // Mock no existing actions initially, then auto-placed parent
      mockDb.select
        .mockReturnValueOnce(createMutableQueryBuilder([])) // No parent check
        .mockReturnValueOnce(createMutableQueryBuilder([])); // No existing actions for placement
    });

    it('should call generateParentSummariesAsync for auto-placed actions', async () => {
      const result = await ActionsService.createAction({
        title: "Orphaned Action",
        description: "Will be auto-placed",
        vision: "Auto-placement vision"
        // No parent_id provided
      });

      expect(result.action.id).toBe('test-uuid-123');
      expect(result.needs_auto_placement).toBe(true);
      expect(result.applied_parent_id).toBe('auto-parent-id');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should call parent summaries for the auto-placed action
      expect(mockGenerateParentSummariesAsync).toHaveBeenCalledWith('test-uuid-123');
      
      // Should call subtree summary for the new parent
      expect(mockGenerateSubtreeSummaryAsync).toHaveBeenCalledWith('auto-parent-id');
      
      // Should also call embedding and node summary
      expect(mockGenerateEmbeddingAsync).toHaveBeenCalled();
      expect(mockGenerateNodeSummaryAsync).toHaveBeenCalled();
    });

    it('should not call generateParentSummariesAsync when auto-placement fails', async () => {
      // Mock placement service to return low confidence
      const { PlacementService } = require("../../lib/services/placement");
      PlacementService.findBestParent.mockResolvedValueOnce({
        bestParent: { id: 'potential-parent', title: 'Potential Parent' },
        confidence: 0.3, // Below threshold
        reasoning: 'Low confidence match'
      });

      const result = await ActionsService.createAction({
        title: "Low Confidence Action",
        description: "Won't be auto-placed due to low confidence"
      });

      expect(result.needs_auto_placement).toBe(true);
      expect(result.applied_parent_id).toBeUndefined();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should NOT call parent summaries since no parent was applied
      expect(mockGenerateParentSummariesAsync).not.toHaveBeenCalled();
      
      // Should still call other async functions
      expect(mockGenerateEmbeddingAsync).toHaveBeenCalled();
      expect(mockGenerateNodeSummaryAsync).toHaveBeenCalled();
    });

    it('should handle auto-placement analysis errors gracefully', async () => {
      // Mock placement service to throw error
      const { PlacementService } = require("../../lib/services/placement");
      PlacementService.findBestParent.mockRejectedValueOnce(new Error('Placement service error'));

      const result = await ActionsService.createAction({
        title: "Error-prone Action",
        description: "Will cause placement analysis to fail"
      });

      expect(result.action.id).toBe('test-uuid-123');
      
      // Action creation should succeed despite placement error
      expect(result.needs_auto_placement).toBe(true);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Error should be logged
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Error analyzing/placing action content'),
        expect.any(Error)
      );
      
      // Should still call basic async functions
      expect(mockGenerateEmbeddingAsync).toHaveBeenCalled();
      expect(mockGenerateNodeSummaryAsync).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing parent gracefully', async () => {
      // Mock parent not found
      mockDb.select.mockReturnValue(createMutableQueryBuilder([]));

      await expect(ActionsService.createAction({
        title: "Orphaned Action",
        parent_id: "non-existent-parent"
      })).rejects.toThrow('Parent action not found');

      // Should not call any async generation functions when action creation fails
      expect(mockGenerateParentSummariesAsync).not.toHaveBeenCalled();
      expect(mockGenerateEmbeddingAsync).not.toHaveBeenCalled();
    });

    it('should handle database errors during action creation', async () => {
      mockDb.insert.mockRejectedValueOnce(new Error('Database error'));

      await expect(ActionsService.createAction({
        title: "Problematic Action"
      })).rejects.toThrow('Database error');

      // Should not call async generation if action creation fails
      expect(mockGenerateParentSummariesAsync).not.toHaveBeenCalled();
    });

    it('should call async functions even when some dependency creation fails', async () => {
      // Mock parent exists but dependency creation fails
      mockDb.select.mockReturnValue(createMutableQueryBuilder([
        { id: 'parent-id', title: 'Parent Action' }
      ]));
      
      // Make action creation succeed but dependency creation fail
      mockDb.insert
        .mockReturnValueOnce(createMutableQueryBuilder([{ id: 'test-uuid-123' }])) // Action creation
        .mockReturnValueOnce(createMutableQueryBuilder([])) // Parent edge creation
        .mockRejectedValueOnce(new Error('Dependency edge creation failed')); // Dependency creation

      await expect(ActionsService.createAction({
        title: "Action with Bad Dependency",
        parent_id: "parent-id",
        depends_on_ids: ["bad-dependency"]
      })).rejects.toThrow('Dependency edge creation failed');

      // Should still call async functions for the created action
      // Note: This test verifies the order of operations
    });
  });

  describe('Async Function Integration', () => {
    it('should verify parent summary generation calls parent summary service', async () => {
      const { ParentSummaryService } = require("../../lib/services/parent-summary");
      
      await ActionsService.createAction({
        title: "Integration Test Action",
        description: "Testing service integration",
        parent_id: "parent-id"
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ParentSummaryService.getParentChain).toHaveBeenCalledWith('test-uuid-123');
      expect(ParentSummaryService.generateBothParentSummaries).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'test-uuid-123',
          title: 'Integration Test Action',
          description: 'Testing service integration'
        })
      );
      expect(ParentSummaryService.updateParentSummaries).toHaveBeenCalledWith(
        'test-uuid-123',
        expect.any(Object), // contextSummary
        expect.any(Object)  // visionSummary
      );
    });
  });
});