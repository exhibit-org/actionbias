/**
 * Tests for Classification Service
 * Validates the service layer that uses JSON-mode prompts
 */

import { ClassificationService } from '../classification';
import type { ActionToClassify, ExistingAction } from '../../prompts/classification-template';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn()
}));

import { generateObject } from 'ai';
const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

describe('ClassificationService', () => {
  const mockAction: ActionToClassify = {
    title: 'Create OAuth integration',
    description: 'Implement OAuth2 flow for third-party authentication',
    vision: 'Secure user authentication with external providers'
  };

  const mockExistingActions: ExistingAction[] = [
    {
      id: 'auth-001',
      title: 'Authentication System',
      description: 'User authentication and authorization',
      children: [
        {
          id: 'auth-002',
          title: 'JWT Token Management',
          parentId: 'auth-001'
        }
      ]
    },
    {
      id: 'ui-001',
      title: 'User Interface',
      description: 'Frontend components and pages'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyAction', () => {
    it('should return ADD_AS_CHILD classification', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          decision: 'ADD_AS_CHILD',
          parentId: 'auth-001',
          confidence: 0.9,
          reasoning: 'OAuth integration is an authentication feature'
        }
      } as any);

      const result = await ClassificationService.classifyAction(
        mockAction,
        mockExistingActions
      );

      expect(result.decision).toBe('ADD_AS_CHILD');
      expect(result.parentId).toBe('auth-001');
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toContain('authentication');
    });

    it('should return CREATE_PARENT classification', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          decision: 'CREATE_PARENT',
          parentId: null,
          confidence: 0.8,
          reasoning: 'Analytics requires a new parent category',
          newParentTitle: 'Analytics & Reporting',
          newParentDescription: 'Data analysis and reporting features'
        }
      } as any);

      const analyticsAction: ActionToClassify = {
        title: 'Build analytics dashboard',
        description: 'Create charts and metrics visualization'
      };

      const result = await ClassificationService.classifyAction(
        analyticsAction,
        mockExistingActions
      );

      expect(result.decision).toBe('CREATE_PARENT');
      expect(result.parentId).toBeNull();
      expect(result.suggestedParent).toEqual({
        title: 'Analytics & Reporting',
        description: 'Data analysis and reporting features'
      });
    });

    it('should return ADD_AS_ROOT classification', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          decision: 'ADD_AS_ROOT',
          parentId: null,
          confidence: 0.85,
          reasoning: 'Mobile app is a major independent initiative'
        }
      } as any);

      const mobileAction: ActionToClassify = {
        title: 'Launch mobile application',
        description: 'Develop and deploy mobile app'
      };

      const result = await ClassificationService.classifyAction(
        mobileAction,
        mockExistingActions
      );

      expect(result.decision).toBe('ADD_AS_ROOT');
      expect(result.parentId).toBeNull();
      expect(result.confidence).toBe(0.85);
      expect(result.suggestedParent).toBeUndefined();
    });

    it('should handle LLM failures gracefully', async () => {
      mockGenerateObject.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await ClassificationService.classifyAction(
        mockAction,
        mockExistingActions
      );

      expect(result.decision).toBe('ADD_AS_ROOT');
      expect(result.parentId).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain('Classification failed');
    });

    it('should use custom confidence threshold', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          decision: 'ADD_AS_CHILD',
          parentId: 'auth-001',
          confidence: 0.6,
          reasoning: 'Medium confidence placement'
        }
      } as any);

      const result = await ClassificationService.classifyAction(
        mockAction,
        mockExistingActions,
        0.5 // Lower threshold
      );

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('0.5'), // Should use custom threshold
          schema: expect.any(Object),
          temperature: 0
        })
      );
    });
  });

  describe('classifyActions (batch)', () => {
    it('should classify multiple actions sequentially', async () => {
      const actions: ActionToClassify[] = [
        { title: 'Action 1', description: 'First action' },
        { title: 'Action 2', description: 'Second action' }
      ];

      mockGenerateObject
        .mockResolvedValueOnce({
          object: {
            decision: 'ADD_AS_CHILD',
            parentId: 'auth-001',
            confidence: 0.8,
            reasoning: 'First action classification'
          }
        } as any)
        .mockResolvedValueOnce({
          object: {
            decision: 'ADD_AS_ROOT',
            parentId: null,
            confidence: 0.9,
            reasoning: 'Second action classification'
          }
        } as any);

      const results = await ClassificationService.classifyActions(
        actions,
        mockExistingActions
      );

      expect(results).toHaveLength(2);
      expect(results[0].decision).toBe('ADD_AS_CHILD');
      expect(results[1].decision).toBe('ADD_AS_ROOT');
      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    });

    it('should add suggested parents to context for subsequent classifications', async () => {
      const actions: ActionToClassify[] = [
        { title: 'Create analytics feature', description: 'New analytics feature' },
        { title: 'Add reporting dashboard', description: 'Dashboard for analytics' }
      ];

      mockGenerateObject
        .mockResolvedValueOnce({
          object: {
            decision: 'CREATE_PARENT',
            parentId: null,
            confidence: 0.8,
            reasoning: 'Need analytics parent',
            newParentTitle: 'Analytics',
            newParentDescription: 'Analytics features'
          }
        } as any)
        .mockResolvedValueOnce({
          object: {
            decision: 'ADD_AS_CHILD',
            parentId: 'temp-123', // Would be the newly created parent
            confidence: 0.9,
            reasoning: 'Fits under analytics'
          }
        } as any);

      const results = await ClassificationService.classifyActions(
        actions,
        mockExistingActions
      );

      expect(results[0].decision).toBe('CREATE_PARENT');
      expect(results[1].decision).toBe('ADD_AS_CHILD');
      
      // Second call should have additional context from first classification
      const secondCallArgs = mockGenerateObject.mock.calls[1];
      expect(secondCallArgs[0].prompt).toContain('Analytics');
    });
  });

  describe('validateClassification', () => {
    it('should validate ADD_AS_CHILD with valid parent', () => {
      const result = {
        decision: 'ADD_AS_CHILD' as const,
        parentId: 'auth-001',
        confidence: 0.9,
        reasoning: 'Valid placement'
      };

      const validation = ClassificationService.validateClassification(
        result,
        mockAction,
        mockExistingActions
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should warn about low confidence', () => {
      const result = {
        decision: 'ADD_AS_ROOT' as const,
        parentId: null,
        confidence: 0.3,
        reasoning: 'Low confidence placement'
      };

      const validation = ClassificationService.validateClassification(
        result,
        mockAction,
        mockExistingActions
      );

      expect(validation.warnings).toContainEqual(
        expect.stringContaining('Low confidence')
      );
    });

    it('should warn about invalid parent ID', () => {
      const result = {
        decision: 'ADD_AS_CHILD' as const,
        parentId: 'nonexistent-id',
        confidence: 0.9,
        reasoning: 'Invalid parent'
      };

      const validation = ClassificationService.validateClassification(
        result,
        mockAction,
        mockExistingActions
      );

      expect(validation.isValid).toBe(false);
      expect(validation.warnings).toContainEqual(
        expect.stringContaining('not found')
      );
    });

    it('should validate CREATE_PARENT with suggested parent', () => {
      const result = {
        decision: 'CREATE_PARENT' as const,
        parentId: null,
        confidence: 0.8,
        reasoning: 'Need new parent',
        suggestedParent: {
          title: 'New Category',
          description: 'Description of new category'
        }
      };

      const validation = ClassificationService.validateClassification(
        result,
        mockAction,
        mockExistingActions
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should warn about CREATE_PARENT without suggested parent info', () => {
      const result = {
        decision: 'CREATE_PARENT' as const,
        parentId: null,
        confidence: 0.8,
        reasoning: 'Need new parent'
        // missing suggestedParent
      };

      const validation = ClassificationService.validateClassification(
        result,
        mockAction,
        mockExistingActions
      );

      expect(validation.isValid).toBe(false);
      expect(validation.warnings).toContainEqual(
        expect.stringContaining('requires suggestedParent')
      );
    });

    it('should provide recommendations', () => {
      const result = {
        decision: 'ADD_AS_ROOT' as const,
        parentId: null,
        confidence: 0.9,
        reasoning: 'Root placement'
      };

      const validation = ClassificationService.validateClassification(
        result,
        mockAction,
        mockExistingActions
      );

      expect(validation.recommendations).toContainEqual(
        expect.stringContaining('existing category')
      );
    });
  });

  describe('toPlacementResult', () => {
    it('should convert ADD_AS_CHILD to placement format', () => {
      const classification = {
        decision: 'ADD_AS_CHILD' as const,
        parentId: 'auth-001',
        confidence: 0.9,
        reasoning: 'Good fit'
      };

      const placementResult = ClassificationService.toPlacementResult(
        classification,
        mockExistingActions
      );

      expect(placementResult.bestParent).toEqual({
        id: 'auth-001',
        title: 'Authentication System'
      });
      expect(placementResult.confidence).toBe(0.9);
      expect(placementResult.suggestedNewParent).toBeUndefined();
    });

    it('should convert CREATE_PARENT to placement format', () => {
      const classification = {
        decision: 'CREATE_PARENT' as const,
        parentId: null,
        confidence: 0.8,
        reasoning: 'Need new category',
        suggestedParent: {
          title: 'Analytics',
          description: 'Analytics features'
        }
      };

      const placementResult = ClassificationService.toPlacementResult(
        classification,
        mockExistingActions
      );

      expect(placementResult.bestParent).toBeNull();
      expect(placementResult.suggestedNewParent).toEqual({
        title: 'Analytics',
        description: 'Analytics features',
        reasoning: 'Need new category'
      });
    });

    it('should convert ADD_AS_ROOT to placement format', () => {
      const classification = {
        decision: 'ADD_AS_ROOT' as const,
        parentId: null,
        confidence: 0.85,
        reasoning: 'Independent initiative'
      };

      const placementResult = ClassificationService.toPlacementResult(
        classification,
        mockExistingActions
      );

      expect(placementResult.bestParent).toBeNull();
      expect(placementResult.confidence).toBe(0.85);
      expect(placementResult.suggestedNewParent).toBeUndefined();
    });
  });
});