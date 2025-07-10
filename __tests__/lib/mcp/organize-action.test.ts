import { jest } from '@jest/globals';
import { z } from 'zod';

// Mock ActionsService
const mockActionsService = {
  organizeAction: jest.fn(),
};

jest.mock('../../../lib/services/actions', () => ({
  ActionsService: mockActionsService,
}));

// Mock getDb
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

jest.mock('../../../lib/db/adapter', () => ({
  getDb: jest.fn(() => mockDb),
}));

// Schema for organize_action tool
const organizeActionSchema = z.object({
  action_id: z.string().uuid().describe("The ID of the action to analyze for organization suggestions"),
  scope: z.enum(["action_only", "include_siblings", "include_subtree"]).optional().default("action_only").describe("Scope of analysis: action_only (default), include_siblings, or include_subtree"),
  limit: z.number().min(1).max(10).optional().default(5).describe("Maximum number of suggestions to return (default: 5)"),
  confidence_threshold: z.number().min(0).max(100).optional().default(40).describe("Minimum confidence threshold for suggestions (0-100, default: 40)"),
});

// Mock tool handler function
async function organizeActionTool(
  { action_id, scope = "action_only", limit = 5, confidence_threshold = 40 }: z.infer<typeof organizeActionSchema>
) {
  // Use the mocked ActionsService
  return await mockActionsService.organizeAction({
    action_id,
    scope,
    limit,
    confidence_threshold,
  });
}

describe('organize_action MCP tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema validation', () => {
    it('should validate required action_id parameter', () => {
      const result = organizeActionSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['action_id']);
      }
    });

    it('should validate action_id is a valid UUID', () => {
      const result = organizeActionSchema.safeParse({ action_id: 'invalid-uuid' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid uuid');
      }
    });

    it('should accept valid parameters', () => {
      const validInput = {
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        scope: 'include_siblings' as const,
        limit: 3,
        confidence_threshold: 60,
      };
      const result = organizeActionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should use default values for optional parameters', () => {
      const input = { action_id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = organizeActionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe('action_only');
        expect(result.data.limit).toBe(5);
        expect(result.data.confidence_threshold).toBe(40);
      }
    });

    it('should validate scope enum values', () => {
      const invalidScope = organizeActionSchema.safeParse({
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        scope: 'invalid_scope',
      });
      expect(invalidScope.success).toBe(false);
    });

    it('should validate limit range', () => {
      const tooSmall = organizeActionSchema.safeParse({
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        limit: 0,
      });
      expect(tooSmall.success).toBe(false);

      const tooLarge = organizeActionSchema.safeParse({
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        limit: 11,
      });
      expect(tooLarge.success).toBe(false);
    });

    it('should validate confidence_threshold range', () => {
      const tooSmall = organizeActionSchema.safeParse({
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        confidence_threshold: -1,
      });
      expect(tooSmall.success).toBe(false);

      const tooLarge = organizeActionSchema.safeParse({
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        confidence_threshold: 101,
      });
      expect(tooLarge.success).toBe(false);
    });
  });

  describe('tool functionality', () => {
    it('should call ActionsService.organizeAction with correct parameters', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      const mockSuggestions = [
        {
          type: 'move',
          title: 'Move to better parent',
          description: 'This action would be better organized under "API Development"',
          target_parent_id: '123e4567-e89b-12d3-a456-426614174000',
          target_parent_title: 'API Development',
          confidence: 0.85,
          reasoning: 'Strong semantic similarity with API-related tasks',
        },
        {
          type: 'rename',
          title: 'Rename for clarity',
          description: 'Rename to "Implement organize_action MCP tool and REST API endpoint"',
          new_title: 'Implement organize_action MCP tool and REST API endpoint',
          confidence: 0.75,
          reasoning: 'Current title could be more specific about implementation details',
        },
        {
          type: 'split',
          title: 'Split into separate concerns',
          description: 'Split into two actions: MCP tool implementation and API endpoint',
          suggested_actions: [
            { title: 'Implement organize_action MCP tool', description: 'Create the MCP tool handler and schema' },
            { title: 'Create organize_action API endpoint', description: 'Build REST API endpoint for UI integration' },
          ],
          confidence: 0.70,
          reasoning: 'Separating MCP and API concerns improves clarity and allows parallel work',
        },
      ];

      mockActionsService.organizeAction.mockResolvedValue({
        action: { id: actionId, title: 'Add Organize Action Tool and API Endpoint' },
        suggestions: mockSuggestions,
        metadata: { processingTimeMs: 250, analyzedCount: 15 },
      });

      const result = await organizeActionTool({
        action_id: actionId,
        scope: 'include_siblings',
        limit: 3,
        confidence_threshold: 60,
      });

      expect(mockActionsService.organizeAction).toHaveBeenCalledWith({
        action_id: actionId,
        scope: 'include_siblings',
        limit: 3,
        confidence_threshold: 60,
      });

      expect(result).toEqual({
        action: { id: actionId, title: 'Add Organize Action Tool and API Endpoint' },
        suggestions: mockSuggestions,
        metadata: { processingTimeMs: 250, analyzedCount: 15 },
      });
    });

    it('should use default values when optional parameters not provided', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockActionsService.organizeAction.mockResolvedValue({
        action: { id: actionId, title: 'Test Action' },
        suggestions: [],
        metadata: { processingTimeMs: 100, analyzedCount: 1 },
      });

      await organizeActionTool({ action_id: actionId });

      expect(mockActionsService.organizeAction).toHaveBeenCalledWith({
        action_id: actionId,
        scope: 'action_only',
        limit: 5,
        confidence_threshold: 40,
      });
    });

    it('should handle empty suggestions', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockActionsService.organizeAction.mockResolvedValue({
        action: { id: actionId, title: 'Well Organized Action' },
        suggestions: [],
        metadata: { processingTimeMs: 150, analyzedCount: 10 },
      });

      const result = await organizeActionTool({
        action_id: actionId,
        confidence_threshold: 90, // High threshold might return no suggestions
      });

      expect(result.suggestions).toEqual([]);
      expect(result.metadata.analyzedCount).toBe(10);
    });

    it('should handle service errors', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      const error = new Error('Failed to analyze action');
      
      mockActionsService.organizeAction.mockRejectedValue(error);

      await expect(organizeActionTool({ action_id: actionId })).rejects.toThrow('Failed to analyze action');
    });
  });
});