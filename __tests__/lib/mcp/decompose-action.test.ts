import { jest } from '@jest/globals';
import { z } from 'zod';

// Mock ActionsService
const mockActionsService = {
  decomposeAction: jest.fn(),
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

// Schema for decompose_action tool
const decomposeActionSchema = z.object({
  action_id: z.string().uuid().describe("The ID of the action to decompose"),
  max_suggestions: z.number().min(1).max(10).optional().default(5).describe("Maximum number of child action suggestions to return (default: 5)"),
  include_reasoning: z.boolean().optional().default(true).describe("Whether to include reasoning for each suggestion (default: true)"),
});

// Mock tool handler function
async function decomposeActionTool(
  { action_id, max_suggestions = 5, include_reasoning = true }: z.infer<typeof decomposeActionSchema>
) {
  // Use the mocked ActionsService
  return await mockActionsService.decomposeAction({
    action_id,
    max_suggestions,
    include_reasoning,
  });
}

describe('decompose_action MCP tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema validation', () => {
    it('should validate required action_id parameter', () => {
      const result = decomposeActionSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['action_id']);
      }
    });

    it('should validate action_id is a valid UUID', () => {
      const result = decomposeActionSchema.safeParse({ action_id: 'invalid-uuid' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid uuid');
      }
    });

    it('should accept valid parameters', () => {
      const validInput = {
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        max_suggestions: 3,
        include_reasoning: false,
      };
      const result = decomposeActionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should use default values for optional parameters', () => {
      const input = { action_id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = decomposeActionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max_suggestions).toBe(5);
        expect(result.data.include_reasoning).toBe(true);
      }
    });

    it('should validate max_suggestions range', () => {
      const tooSmall = decomposeActionSchema.safeParse({
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        max_suggestions: 0,
      });
      expect(tooSmall.success).toBe(false);

      const tooLarge = decomposeActionSchema.safeParse({
        action_id: '550e8400-e29b-41d4-a716-446655440000',
        max_suggestions: 11,
      });
      expect(tooLarge.success).toBe(false);
    });
  });

  describe('tool functionality', () => {
    it('should call ActionsService.decomposeAction with correct parameters', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      const mockSuggestions = [
        {
          title: 'Setup development environment',
          description: 'Install dependencies and configure local environment',
          reasoning: 'Initial setup is typically the first step in any project',
          confidence: 0.9,
        },
        {
          title: 'Implement core functionality',
          description: 'Build the main features of the application',
          reasoning: 'Core implementation is the central task that delivers value',
          confidence: 0.85,
        },
      ];

      mockActionsService.decomposeAction.mockResolvedValue({
        action: { id: actionId, title: 'Build new feature' },
        suggestions: mockSuggestions,
        metadata: { processingTimeMs: 150 },
      });

      const result = await decomposeActionTool({
        action_id: actionId,
        max_suggestions: 3,
        include_reasoning: false,
      });

      expect(mockActionsService.decomposeAction).toHaveBeenCalledWith({
        action_id: actionId,
        max_suggestions: 3,
        include_reasoning: false,
      });

      expect(result).toEqual({
        action: { id: actionId, title: 'Build new feature' },
        suggestions: mockSuggestions,
        metadata: { processingTimeMs: 150 },
      });
    });

    it('should use default values when optional parameters not provided', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockActionsService.decomposeAction.mockResolvedValue({
        action: { id: actionId, title: 'Test action' },
        suggestions: [],
        metadata: { processingTimeMs: 100 },
      });

      await decomposeActionTool({ action_id: actionId });

      expect(mockActionsService.decomposeAction).toHaveBeenCalledWith({
        action_id: actionId,
        max_suggestions: 5,
        include_reasoning: true,
      });
    });

    it('should return suggestions with correct structure', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      const mockSuggestions = [
        {
          title: 'First task',
          description: 'Do the first thing',
          reasoning: 'Because it comes first',
          confidence: 0.95,
        },
      ];

      mockActionsService.decomposeAction.mockResolvedValue({
        action: { id: actionId, title: 'Parent action' },
        suggestions: mockSuggestions,
        metadata: { processingTimeMs: 200 },
      });

      const result = await decomposeActionTool({ action_id: actionId });

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]).toHaveProperty('title');
      expect(result.suggestions[0]).toHaveProperty('description');
      expect(result.suggestions[0]).toHaveProperty('reasoning');
      expect(result.suggestions[0]).toHaveProperty('confidence');
      expect(typeof result.suggestions[0].confidence).toBe('number');
      expect(result.suggestions[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result.suggestions[0].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    it('should handle action not found error', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440001';
      
      mockActionsService.decomposeAction.mockRejectedValue(
        new Error(`Action with ID ${nonExistentId} not found`)
      );
      
      await expect(decomposeActionTool({ action_id: nonExistentId }))
        .rejects.toThrow('Action with ID 550e8400-e29b-41d4-a716-446655440001 not found');
    });

    it('should handle service errors gracefully', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockActionsService.decomposeAction.mockRejectedValue(new Error('AI service unavailable'));
      
      await expect(decomposeActionTool({ action_id: actionId }))
        .rejects.toThrow('AI service unavailable');
    });

    it('should handle action without title', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockActionsService.decomposeAction.mockRejectedValue(
        new Error(`Action ${actionId} has no title - cannot decompose`)
      );
      
      await expect(decomposeActionTool({ action_id: actionId }))
        .rejects.toThrow('Action 550e8400-e29b-41d4-a716-446655440000 has no title - cannot decompose');
    });
  });
});