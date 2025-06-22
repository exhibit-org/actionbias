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
    randomUUID: () => 'test-action-id'
  }
});

// Mock console to track logging
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
};

// Mock all the services that should be called
jest.mock("../../lib/services/parent-summary", () => ({
  ParentSummaryService: {
    generateBothParentSummaries: jest.fn().mockResolvedValue({
      contextSummary: 'Generated context summary',
      visionSummary: 'Generated vision summary'
    }),
    updateParentSummaries: jest.fn().mockResolvedValue(undefined),
    getParentChain: jest.fn().mockResolvedValue([
      { title: 'Parent Action', description: 'Parent desc', vision: 'Parent vision' }
    ])
  }
}));

jest.mock("../../lib/services/embeddings", () => ({
  EmbeddingsService: {
    generateEmbedding: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock("../../lib/services/summary", () => ({
  SummaryService: {
    generateNodeSummary: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock("../../lib/services/subtree-summary", () => ({
  SubtreeSummaryService: {
    generateSubtreeSummary: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock("../../lib/services/analysis", () => ({
  needsPlacementAnalysis: jest.fn(() => true),
  AnalysisService: {
    analyzeActionContent: jest.fn().mockResolvedValue({
      metadata: { qualityScore: 0.85 },
      keywords: { keywords: ['test'] }
    })
  }
}));

jest.mock("../../lib/services/placement", () => ({
  PlacementService: {
    findBestParent: jest.fn().mockResolvedValue({
      bestParent: { id: 'auto-parent-id', title: 'Auto Parent' },
      confidence: 0.9,
      reasoning: 'High semantic similarity',
      analysis: { metadata: { qualityScore: 0.85 }, keywords: { keywords: ['test'] } }
    })
  }
}));

jest.mock('ai', () => ({ generateObject: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ openai: jest.fn() }));

describe('Action Creation with Parent Summaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();

    // Setup default database responses
    mockDb.insert.mockReturnValue(createMutableQueryBuilder([
      { id: 'test-action-id', title: 'Test Action', done: false }
    ]));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Actions with Explicit Parent', () => {
    beforeEach(() => {
      // Mock parent exists
      mockDb.select.mockReturnValue(createMutableQueryBuilder([
        { id: 'parent-id', title: 'Parent Action' }
      ]));
    });

    it('should generate parent summaries for actions with explicit parent', async () => {
      const result = await ActionsService.createAction({
        title: "Child Action",
        description: "Child description",
        vision: "Child vision",
        parent_id: "parent-id"
      });

      expect(result.action.id).toBe('test-action-id');
      expect(result.parent_id).toBe('parent-id');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify parent summaries were generated
      const { ParentSummaryService } = require("../../lib/services/parent-summary");
      expect(ParentSummaryService.getParentChain).toHaveBeenCalledWith('test-action-id');
      expect(ParentSummaryService.generateBothParentSummaries).toHaveBeenCalledWith({
        actionId: 'test-action-id',
        title: 'Child Action',
        description: 'Child description',
        vision: 'Child vision',
        parentChain: expect.arrayContaining([
          expect.objectContaining({ title: 'Parent Action' })
        ])
      });
      expect(ParentSummaryService.updateParentSummaries).toHaveBeenCalledWith(
        'test-action-id',
        'Generated context summary',
        'Generated vision summary'
      );

      // Verify successful generation was logged
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Generated parent summaries for action test-action-id'
      );
    });

    it('should also generate embeddings and node summaries', async () => {
      await ActionsService.createAction({
        title: "Complete Action",
        description: "Complete description",
        parent_id: "parent-id"
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify all async generation functions were called
      const { EmbeddingsService } = require("../../lib/services/embeddings");
      const { SummaryService } = require("../../lib/services/summary");
      expect(EmbeddingsService.generateEmbedding).toHaveBeenCalledWith(
        'test-action-id',
        expect.objectContaining({
          title: 'Complete Action',
          description: 'Complete description'
        })
      );
      expect(SummaryService.generateNodeSummary).toHaveBeenCalledWith(
        'test-action-id',
        expect.objectContaining({
          title: 'Complete Action'
        })
      );
    });

    it('should handle parent summary generation failures gracefully', async () => {
      // Make parent summary generation fail
      mockParentSummaryService.generateBothParentSummaries.mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      const result = await ActionsService.createAction({
        title: "Test Action",
        parent_id: "parent-id"
      });

      expect(result.action.id).toBe('test-action-id');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Action creation should succeed even if async generation fails
      expect(result.parent_id).toBe('parent-id');

      // Error should be logged
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to generate parent summaries for action test-action-id:',
        expect.objectContaining({ message: 'OpenAI API error' })
      );
    });
  });

  describe('Actions with Auto-placement', () => {
    beforeEach(() => {
      // Mock no existing actions for placement
      mockDb.select.mockReturnValue(createMutableQueryBuilder([]));
    });

    it('should generate parent summaries for auto-placed actions', async () => {
      const result = await ActionsService.createAction({
        title: "Orphaned Action",
        description: "Will be auto-placed"
        // No parent_id provided
      });

      expect(result.action.id).toBe('test-action-id');
      expect(result.needs_auto_placement).toBe(true);
      expect(result.applied_parent_id).toBe('auto-parent-id');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should generate parent summaries for the auto-placed action
      expect(mockParentSummaryService.generateBothParentSummaries).toHaveBeenCalledWith({
        actionId: 'test-action-id',
        title: 'Orphaned Action',
        description: 'Will be auto-placed',
        vision: undefined,
        parentChain: expect.any(Array)
      });

      // Should also generate subtree summary for the new parent
      expect(mockSubtreeSummaryService.generateSubtreeSummary).toHaveBeenCalledWith('auto-parent-id');
    });

    it('should not generate parent summaries when auto-placement fails', async () => {
      // Mock low confidence placement
      const { PlacementService } = require("../../lib/services/placement");
      PlacementService.findBestParent.mockResolvedValueOnce({
        bestParent: { id: 'potential-parent', title: 'Potential Parent' },
        confidence: 0.3, // Below default threshold of 0.8
        reasoning: 'Low confidence match'
      });

      const result = await ActionsService.createAction({
        title: "Low Confidence Action",
        description: "Won't be auto-placed"
      });

      expect(result.needs_auto_placement).toBe(true);
      expect(result.applied_parent_id).toBeUndefined();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should NOT generate parent summaries since no parent was applied
      expect(mockParentSummaryService.generateBothParentSummaries).not.toHaveBeenCalled();

      // Should still generate embeddings and node summaries
      expect(mockEmbeddingsService.generateEmbedding).toHaveBeenCalled();
      expect(mockSummaryService.generateNodeSummary).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should not generate parent summaries when parent is not found', async () => {
      // Mock parent not found
      mockDb.select.mockReturnValue(createMutableQueryBuilder([]));

      await expect(ActionsService.createAction({
        title: "Orphaned Action",
        parent_id: "non-existent-parent"
      })).rejects.toThrow('Parent action not found');

      // Should not call any async generation functions when action creation fails
      expect(mockParentSummaryService.generateBothParentSummaries).not.toHaveBeenCalled();
      expect(mockEmbeddingsService.generateEmbedding).not.toHaveBeenCalled();
    });

    it('should handle action creation without title', async () => {
      mockDb.select.mockReturnValue(createMutableQueryBuilder([
        { id: 'parent-id', title: 'Parent Action' }
      ]));

      const result = await ActionsService.createAction({
        title: "", // Empty title
        parent_id: "parent-id"
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should skip parent summary generation for actions without title
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Action test-action-id has no title, skipping parent summaries generation'
      );
    });

    it('should handle multiple async failures without affecting action creation', async () => {
      mockDb.select.mockReturnValue(createMutableQueryBuilder([
        { id: 'parent-id', title: 'Parent Action' }
      ]));

      // Make all async operations fail
      mockParentSummaryService.generateBothParentSummaries.mockRejectedValueOnce(new Error('Parent summary error'));
      mockEmbeddingsService.generateEmbedding.mockRejectedValueOnce(new Error('Embedding error'));
      mockSummaryService.generateNodeSummary.mockRejectedValueOnce(new Error('Node summary error'));

      const result = await ActionsService.createAction({
        title: "Error-prone Action",
        parent_id: "parent-id"
      });

      expect(result.action.id).toBe('test-action-id');
      expect(result.parent_id).toBe('parent-id');

      // Wait for all async operations to complete/fail
      await new Promise(resolve => setTimeout(resolve, 150));

      // Action creation should succeed despite all async failures
      expect(result.action.title).toBe("Error-prone Action");

      // All errors should be logged
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to generate parent summaries for action test-action-id:',
        expect.any(Error)
      );
    });
  });

  describe('Database Verification', () => {
    beforeEach(() => {
      mockDb.select.mockReturnValue(createMutableQueryBuilder([
        { id: 'parent-id', title: 'Parent Action' }
      ]));
    });

    it('should create proper database records for action with parent', async () => {
      await ActionsService.createAction({
        title: "Database Test Action",
        description: "Test description",
        vision: "Test vision",
        parent_id: "parent-id",
        depends_on_ids: ["dep-1", "dep-2"]
      });

      // Verify action was created
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'actions' })
      );

      // Verify parent edge was created
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'edges' })
      );

      // Verify dependency edges were created (2 dependencies)
      expect(mockDb.insert).toHaveBeenCalledTimes(4); // action + parent edge + 2 dependency edges
    });
  });
});