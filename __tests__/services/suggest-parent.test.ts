import { describe, it, expect, beforeEach } from '@jest/globals';
import { ActionsService } from '../../lib/services/actions';
import { VectorPlacementService } from '../../lib/services/vector-placement';
import { ClassificationService } from '../../lib/services/classification';
import type { ParentSuggestion } from '../../lib/services/parent-suggestion';

// Mock the dependencies
jest.mock('../../lib/services/actions');
jest.mock('../../lib/services/vector-placement');
jest.mock('../../lib/services/classification');

describe('ParentSuggestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('suggestParents', () => {
    it('should return multiple parent suggestions with confidence scores', async () => {
      // Mock data
      const mockVectorSuggestions = {
        candidates: [
          {
            id: 'vec-1',
            title: 'UI Components',
            description: 'User interface components',
            similarity: 0.85,
            hierarchyPath: ['Frontend', 'UI Components'],
            depth: 2
          },
          {
            id: 'vec-2', 
            title: 'Frontend Features',
            description: 'Frontend feature development',
            similarity: 0.78,
            hierarchyPath: ['Frontend', 'Frontend Features'],
            depth: 2
          }
        ],
        queryEmbedding: [0.1, 0.2, 0.3],
        totalProcessingTimeMs: 150,
        searchTimeMs: 100,
        embeddingTimeMs: 50
      };

      const mockClassificationResult = {
        decision: 'ADD_AS_CHILD' as const,
        parentId: 'class-1',
        confidence: 0.75,
        reasoning: 'This action fits well under existing UI category'
      };

      // Mock the services
      (VectorPlacementService.findVectorFamilySuggestions as jest.Mock).mockResolvedValue(mockVectorSuggestions);
      (ClassificationService.classifyAction as jest.Mock).mockResolvedValue(mockClassificationResult);
      (ActionsService.listActions as jest.Mock).mockResolvedValue([
        { id: 'vec-1', title: 'UI Components', description: 'User interface components' },
        { id: 'vec-2', title: 'Frontend Features', description: 'Frontend feature development' },
        { id: 'class-1', title: 'UI Library', description: 'UI component library' }
      ]);

      // Import the service after mocking
      const { ParentSuggestionService } = await import('../../lib/services/parent-suggestion');

      // Test the function
      const result = await ParentSuggestionService.suggestParents({
        title: 'Add button component',
        description: 'Create a reusable button component with variants'
      });

      expect(result).toEqual({
        suggestions: [
          {
            id: 'vec-1',
            title: 'UI Components',
            description: 'User interface components',
            confidence: 85,
            source: 'vector',
            reasoning: expect.stringContaining('High semantic similarity (85%)'),
            hierarchyPath: ['Frontend', 'UI Components'],
            canCreateNewParent: false
          },
          {
            id: 'vec-2',
            title: 'Frontend Features', 
            description: 'Frontend feature development',
            confidence: 78,
            source: 'vector',
            reasoning: expect.stringContaining('High semantic similarity (78%)'),
            hierarchyPath: ['Frontend', 'Frontend Features'],
            canCreateNewParent: false
          },
          {
            id: 'class-1',
            title: 'UI Library',
            description: 'UI component library',
            confidence: 75,
            source: 'classification',
            reasoning: 'This action fits well under existing UI category',
            hierarchyPath: ['UI Library'],
            canCreateNewParent: false
          }
        ],
        metadata: {
          totalProcessingTimeMs: expect.any(Number),
          vectorTimeMs: expect.any(Number),
          classificationTimeMs: expect.any(Number),
          totalCandidates: 3
        }
      });
    });

    it('should suggest creating new parent when confidence is low', async () => {
      const mockVectorSuggestions = {
        candidates: [
          {
            id: 'vec-1',
            title: 'Unrelated Action',
            description: 'Something completely different',
            similarity: 0.3,
            hierarchyPath: ['Other', 'Unrelated Action'],
            depth: 2
          }
        ],
        queryEmbedding: [0.1, 0.2, 0.3],
        totalProcessingTimeMs: 150,
        searchTimeMs: 100,
        embeddingTimeMs: 50
      };

      const mockClassificationResult = {
        decision: 'CREATE_PARENT' as const,
        parentId: null,
        confidence: 0.2,
        reasoning: 'No suitable existing parent found, suggest creating new category',
        suggestedParent: {
          title: 'Email & Communication Infrastructure',
          description: 'Email sending and communication tools'
        }
      };

      (VectorPlacementService.findVectorFamilySuggestions as jest.Mock).mockResolvedValue(mockVectorSuggestions);
      (ClassificationService.classifyAction as jest.Mock).mockResolvedValue(mockClassificationResult);
      (ActionsService.listActions as jest.Mock).mockResolvedValue([
        { id: 'vec-1', title: 'Unrelated Action', description: 'Something completely different' }
      ]);

      const { ParentSuggestionService } = await import('../../lib/services/parent-suggestion');

      const result = await ParentSuggestionService.suggestParents({
        title: 'use loops.so to send emails',
        description: 'Integrate loops.so email service'
      });

      expect(result.suggestions).toContainEqual({
        id: 'CREATE_NEW_PARENT',
        title: 'Email & Communication Infrastructure',
        description: 'Email sending and communication tools',
        confidence: 75, // Boosted for new parent suggestion
        source: 'create_new',
        reasoning: 'No suitable existing parent found, suggest creating new category',
        hierarchyPath: ['Email & Communication Infrastructure'],
        canCreateNewParent: true
      });
    });

    it('should filter out low confidence suggestions', async () => {
      const mockVectorSuggestions = {
        candidates: [
          {
            id: 'vec-1',
            title: 'High Confidence',
            description: 'Good match',
            similarity: 0.85,
            hierarchyPath: ['High Confidence'],
            depth: 1
          },
          {
            id: 'vec-2',
            title: 'Low Confidence',
            description: 'Poor match',
            similarity: 0.25,
            hierarchyPath: ['Low Confidence'],
            depth: 1
          }
        ],
        queryEmbedding: [0.1, 0.2, 0.3],
        totalProcessingTimeMs: 150,
        searchTimeMs: 100,
        embeddingTimeMs: 50
      };

      const mockClassificationResult = {
        decision: 'ADD_AS_CHILD' as const,
        parentId: 'vec-1',
        confidence: 0.8,
        reasoning: 'Good classification match'
      };

      (VectorPlacementService.findVectorFamilySuggestions as jest.Mock).mockResolvedValue(mockVectorSuggestions);
      (ClassificationService.classifyAction as jest.Mock).mockResolvedValue(mockClassificationResult);
      (ActionsService.listActions as jest.Mock).mockResolvedValue([
        { id: 'vec-1', title: 'High Confidence', description: 'Good match' },
        { id: 'vec-2', title: 'Low Confidence', description: 'Poor match' }
      ]);

      const { ParentSuggestionService } = await import('../../lib/services/parent-suggestion');

      const result = await ParentSuggestionService.suggestParents({
        title: 'Test action',
        description: 'Test description'
      }, { confidenceThreshold: 50 });

      // Only high confidence suggestions should be included
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].confidence).toBeGreaterThanOrEqual(50);
    });
  });
});