/**
 * @jest-environment jsdom
 */
import { ObjectiveEditorialService, ObjectiveCompletionData } from '../../../lib/services/objective-editorial';

// Mock the AI service
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model'),
}));

describe('ObjectiveEditorialService', () => {
  const mockObjectiveData: ObjectiveCompletionData = {
    technical_changes: {
      files_modified: ['/lib/services/actions.ts', '/db/schema.ts'],
      files_created: ['/lib/services/objective-editorial.ts'],
      functions_added: ['generateEditorialContent', 'formatImplementationStory'],
      apis_modified: ['/mcp/complete_action'],
      dependencies_added: ['ai@2.1.0'],
      config_changes: ['Updated TypeScript config'],
    },
    outcomes: {
      features_implemented: ['Server-side editorial generation', 'Objective completion schema'],
      bugs_fixed: ['Fixed completion context type errors'],
      performance_improvements: ['Reduced MCP payload size by 60%'],
      tests_passing: true,
      build_status: 'success',
    },
    challenges: {
      blockers_encountered: ['TypeScript compilation errors', 'AI integration complexity'],
      blockers_resolved: ['Updated type definitions', 'Simplified AI prompts'],
      approaches_tried: ['Direct AI integration', 'Service-based architecture'],
      discoveries: ['Structured data easier to process', 'Hook data provides rich context'],
    },
    alignment_reflection: {
      purpose_interpretation: 'Understood this as building server-side editorial generation to replace agent-generated content with consistent, high-quality prose.',
      goal_achievement_assessment: 'Successfully implemented the complete editorial generation service with all required functions and proper error handling.',
      context_influence: 'Phase 3 architecture context guided the service-based approach and emphasis on consistency over creativity.',
      assumptions_made: ['AI models would generate better content than agents', 'Structured data would be sufficient input', 'Service should be stateless'],
    },
    git_context: {
      commits: [{
        hash: 'abc123',
        message: 'feat: implement objective editorial service',
        author: { name: 'Claude Code' },
      }],
    },
  };

  const mockHookActivity = {
    session_id: 'test-session',
    tool_usage: [
      { tool_name: 'Write', timestamp: '2025-07-03T00:00:00Z' },
      { tool_name: 'Edit', timestamp: '2025-07-03T00:01:00Z' },
      { tool_name: 'Read', timestamp: '2025-07-03T00:02:00Z' },
      { tool_name: 'Write', timestamp: '2025-07-03T00:03:00Z' },
    ],
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock generateText to return predictable content
    const { generateText } = require('ai');
    generateText.mockResolvedValue({ text: 'Generated editorial content' });
  });

  describe('generateEditorialContent', () => {
    it('should generate complete editorial content from objective data', async () => {
      const result = await ObjectiveEditorialService.generateEditorialContent(
        'Test Action',
        mockObjectiveData,
        mockHookActivity
      );

      expect(result).toHaveProperty('implementation_story');
      expect(result).toHaveProperty('impact_story');
      expect(result).toHaveProperty('learning_story');
      expect(result).toHaveProperty('headline');
      expect(result).toHaveProperty('deck');
      expect(result).toHaveProperty('pull_quotes');
      expect(Array.isArray(result.pull_quotes)).toBe(true);
    });

    it('should work without hook activity data', async () => {
      const result = await ObjectiveEditorialService.generateEditorialContent(
        'Test Action',
        mockObjectiveData
      );

      expect(result).toHaveProperty('implementation_story');
      expect(result.implementation_story).toBe('Generated editorial content');
    });
  });

  describe('formatImplementationStory', () => {
    it('should include technical changes and challenges', async () => {
      await ObjectiveEditorialService.formatImplementationStory(
        'Test Action',
        mockObjectiveData,
        mockHookActivity
      );

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Technical Changes Made:'),
      }));
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Challenges Encountered & Solutions:'),
      }));
    });

    it('should include hook activity when provided', async () => {
      await ObjectiveEditorialService.formatImplementationStory(
        'Test Action',
        mockObjectiveData,
        mockHookActivity
      );

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Development Process:'),
      }));
    });
  });

  describe('formatImpactStory', () => {
    it('should focus on outcomes and achievements', async () => {
      await ObjectiveEditorialService.formatImpactStory('Test Action', mockObjectiveData);

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Outcomes Achieved:'),
      }));
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Agent\'s Assessment:'),
      }));
    });
  });

  describe('formatLearningStory', () => {
    it('should include challenges and insights', async () => {
      await ObjectiveEditorialService.formatLearningStory('Test Action', mockObjectiveData);

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Challenges & Solutions:'),
      }));
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Key Assumptions Made:'),
      }));
    });
  });

  describe('generateHeadline', () => {
    it('should create technical headline from outcomes', async () => {
      await ObjectiveEditorialService.generateHeadline('Test Action', mockObjectiveData);

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Server-side editorial generation'),
      }));
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        temperature: 0.1, // Should use low temperature for consistency
      }));
    });
  });

  describe('generateDeck', () => {
    it('should create measured standfirst', async () => {
      await ObjectiveEditorialService.generateDeck('Test Action', mockObjectiveData);

      const { generateText } = require('ai');
      expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('The Economist'),
      }));
    });
  });

  describe('extractPullQuotes', () => {
    it('should extract meaningful quotes from reflection and discoveries', async () => {
      const quotes = await ObjectiveEditorialService.extractPullQuotes(mockObjectiveData);

      expect(Array.isArray(quotes)).toBe(true);
      expect(quotes.length).toBeLessThanOrEqual(3);
      
      // Should include content from alignment reflection or discoveries
      const quotesText = quotes.join(' ');
      const hasReflectionContent = quotes.some(q => 
        q.includes('editorial generation') || 
        q.includes('Successfully implemented') ||
        q.includes('Phase 3 architecture')
      );
      const hasDiscoveries = quotes.some(q => 
        mockObjectiveData.challenges.discoveries.includes(q)
      );
      
      expect(hasReflectionContent || hasDiscoveries).toBe(true);
    });

    it('should limit to 3 quotes maximum', async () => {
      const quotes = await ObjectiveEditorialService.extractPullQuotes(mockObjectiveData);
      expect(quotes.length).toBeLessThanOrEqual(3);
    });
  });

  describe('helper methods', () => {
    it('should format technical changes correctly', () => {
      // Access private method for testing via any cast
      const service = ObjectiveEditorialService as any;
      const formatted = service.formatTechnicalChanges(mockObjectiveData.technical_changes);
      
      expect(formatted).toContain('Modified 2 files');
      expect(formatted).toContain('Created 1 files');
      expect(formatted).toContain('/lib/services/actions.ts');
    });

    it('should format outcomes correctly', () => {
      const service = ObjectiveEditorialService as any;
      const formatted = service.formatOutcomes(mockObjectiveData.outcomes);
      
      expect(formatted).toContain('Implemented 2 features');
      expect(formatted).toContain('Fixed 1 bugs');
      expect(formatted).toContain('Tests: passing');
    });

    it('should format challenges correctly', () => {
      const service = ObjectiveEditorialService as any;
      const formatted = service.formatChallenges(mockObjectiveData.challenges);
      
      expect(formatted).toContain('Blockers encountered:');
      expect(formatted).toContain('TypeScript compilation errors');
      expect(formatted).toContain('Key discoveries:');
    });
  });
});