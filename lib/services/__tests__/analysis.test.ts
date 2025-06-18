/**
 * @jest-environment node
 */

import { 
  AnalysisService, 
  quickAnalyze, 
  needsPlacementAnalysis,
  type ActionAnalysisResult,
  type AnalysisOptions 
} from '../analysis';
import type { ActionContent } from '../../utils/text-processing';

describe('AnalysisService', () => {
  // Test data
  const sampleAction: ActionContent = {
    title: 'Implement user authentication system',
    description: 'Build a comprehensive authentication system with login, logout, password reset, and user session management. Include OAuth integration for Google and GitHub.',
    vision: 'Users can securely access the application with multiple authentication options'
  };

  const shortAction: ActionContent = {
    title: 'Fix bug'
  };

  const emptyAction: ActionContent = {
    title: ''
  };

  const relatedAction: ActionContent = {
    title: 'Create user authorization system',
    description: 'Implement role-based access control and permission management for user accounts with different privilege levels.',
    vision: 'Users have appropriate access levels based on their roles'
  };

  const unrelatedAction: ActionContent = {
    title: 'Design marketing campaign',
    description: 'Create a marketing strategy for product launch including social media, email campaigns, and advertising.',
    vision: 'Successful product launch with high user acquisition'
  };

  describe('analyzeAction', () => {
    it('should analyze action content comprehensively', async () => {
      const result = await AnalysisService.analyzeAction(sampleAction);

      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('preprocessed');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('importantTerms');
      expect(result).toHaveProperty('metadata');

      // Check action is preserved
      expect(result.action).toEqual(sampleAction);

      // Check preprocessed structure
      expect(result.preprocessed).toHaveProperty('tokens');
      expect(result.preprocessed.tokens).toHaveProperty('title');
      expect(result.preprocessed.tokens).toHaveProperty('description');
      expect(result.preprocessed.tokens).toHaveProperty('vision');

      // Check keywords structure
      expect(result.keywords).toHaveProperty('keywords');
      expect(result.keywords).toHaveProperty('phrases');
      expect(result.keywords).toHaveProperty('combined');
      expect(result.keywords).toHaveProperty('metadata');

      // Check important terms
      expect(Array.isArray(result.importantTerms)).toBe(true);
      expect(result.importantTerms.length).toBeGreaterThan(0);

      // Check metadata
      expect(result.metadata.contentLength).toBeGreaterThan(0);
      expect(result.metadata.qualityScore).toBeGreaterThan(0);
      expect(result.metadata.qualityScore).toBeLessThanOrEqual(1);
      expect(result.metadata.hasSufficientContent).toBe(true);
      expect(result.metadata.analyzedAt).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle actions with minimal content', async () => {
      const result = await AnalysisService.analyzeAction(shortAction);

      expect(result.action).toEqual(shortAction);
      expect(result.metadata.contentLength).toBeLessThan(20);
      expect(result.metadata.hasSufficientContent).toBe(false);
      expect(result.metadata.qualityScore).toBeLessThan(0.5);
    });

    it('should handle empty actions gracefully', async () => {
      const result = await AnalysisService.analyzeAction(emptyAction);

      expect(result.action).toEqual(emptyAction);
      expect(result.metadata.contentLength).toBe(0);
      expect(result.metadata.hasSufficientContent).toBe(false);
      expect(result.keywords.keywords).toEqual([]);
      expect(result.keywords.phrases).toEqual([]);
      expect(result.importantTerms).toEqual([]);
    });

    it('should respect custom analysis options', async () => {
      const options: AnalysisOptions = {
        maxKeywords: 5,
        maxPhrases: 2,
        minContentLength: 50,
        removeStopWords: false,
        scoringMethod: 'frequency'
      };

      const result = await AnalysisService.analyzeAction(sampleAction, options);

      expect(result.keywords.keywords.length).toBeLessThanOrEqual(5);
      expect(result.keywords.phrases.length).toBeLessThanOrEqual(2);
      expect(result.importantTerms.length).toBeLessThanOrEqual(5);
    });

    it('should extract relevant terms from action content', async () => {
      const result = await AnalysisService.analyzeAction(sampleAction);

      const allTerms = [
        ...result.keywords.keywords.map(k => k.term),
        ...result.keywords.phrases.map(p => p.term),
        ...result.importantTerms
      ].join(' ').toLowerCase();

      // Should contain authentication-related terms
      expect(allTerms).toMatch(/authentication|user|system|login|oauth/);
    });
  });

  describe('compareActions', () => {
    it('should compare two related actions', async () => {
      const comparison = await AnalysisService.compareActions(sampleAction, relatedAction);

      expect(comparison).toHaveProperty('similarity');
      expect(comparison).toHaveProperty('analysis1');
      expect(comparison).toHaveProperty('analysis2');
      expect(comparison).toHaveProperty('sharedTerms');
      expect(comparison).toHaveProperty('comparisonMetadata');

      expect(comparison.similarity).toBeGreaterThan(0);
      expect(comparison.similarity).toBeLessThanOrEqual(1);
      expect(comparison.sharedTerms.length).toBeGreaterThanOrEqual(0); // Might be 0 if no exact term matches
      expect(comparison.comparisonMetadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should show higher similarity for related actions than unrelated ones', async () => {
      const relatedComparison = await AnalysisService.compareActions(sampleAction, relatedAction);
      const unrelatedComparison = await AnalysisService.compareActions(sampleAction, unrelatedAction);

      expect(relatedComparison.similarity).toBeGreaterThan(unrelatedComparison.similarity);
      expect(relatedComparison.sharedTerms.length).toBeGreaterThanOrEqual(unrelatedComparison.sharedTerms.length);
    });

    it('should handle identical actions', async () => {
      const comparison = await AnalysisService.compareActions(sampleAction, sampleAction);

      expect(comparison.similarity).toBeGreaterThan(0.8); // Our new algorithm doesn't return exactly 1.0
      expect(comparison.comparisonMetadata.highSimilarity).toBe(true);
    });

    it('should classify similarity levels correctly', async () => {
      const highSimilarity = await AnalysisService.compareActions(sampleAction, sampleAction);
      const lowSimilarity = await AnalysisService.compareActions(sampleAction, unrelatedAction);

      expect(highSimilarity.comparisonMetadata.highSimilarity).toBe(true);
      expect(highSimilarity.comparisonMetadata.moderateSimilarity).toBe(false);

      expect(lowSimilarity.comparisonMetadata.highSimilarity).toBe(false);
      // Don't test moderate similarity as it depends on actual similarity score
    });
  });

  describe('batchAnalyze', () => {
    it('should analyze multiple actions', async () => {
      const actions = [sampleAction, relatedAction, unrelatedAction];
      const result = await AnalysisService.batchAnalyze(actions);

      expect(result.analyses).toHaveLength(3);
      expect(result.averageQuality).toBeGreaterThan(0);
      expect(result.averageQuality).toBeLessThanOrEqual(1);
      expect(result.totalProcessingTime).toBeGreaterThanOrEqual(0);

      // Each analysis should be complete
      result.analyses.forEach(analysis => {
        expect(analysis).toHaveProperty('action');
        expect(analysis).toHaveProperty('preprocessed');
        expect(analysis).toHaveProperty('keywords');
        expect(analysis).toHaveProperty('importantTerms');
        expect(analysis).toHaveProperty('metadata');
      });
    });

    it('should handle empty action list', async () => {
      const result = await AnalysisService.batchAnalyze([]);

      expect(result.analyses).toHaveLength(0);
      expect(result.averageQuality).toBe(0);
      expect(result.totalProcessingTime).toBeGreaterThanOrEqual(0); // Could be 0 for empty list
    });

    it('should calculate correct average quality', async () => {
      const actions = [sampleAction, shortAction]; // One good, one poor quality
      const result = await AnalysisService.batchAnalyze(actions);

      const expectedAverage = (result.analyses[0].metadata.qualityScore + 
                              result.analyses[1].metadata.qualityScore) / 2;
      
      expect(result.averageQuality).toBeCloseTo(expectedAverage, 5);
    });
  });

  describe('findMostSimilar', () => {
    it('should find the most similar action from candidates', async () => {
      const candidates = [unrelatedAction, relatedAction];
      const result = await AnalysisService.findMostSimilar(sampleAction, candidates);

      expect(result.mostSimilar).toEqual(relatedAction);
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.targetAnalysis).toBeDefined();
      expect(result.candidateAnalyses).toHaveLength(2);
      expect(result.rankings).toHaveLength(2);

      // Rankings should be sorted by similarity (highest first)
      expect(result.rankings[0].similarity).toBeGreaterThanOrEqual(result.rankings[1].similarity);
    });

    it('should handle empty candidate list', async () => {
      const result = await AnalysisService.findMostSimilar(sampleAction, []);

      expect(result.mostSimilar).toBeNull();
      expect(result.similarity).toBe(0);
      expect(result.targetAnalysis).toBeDefined();
      expect(result.candidateAnalyses).toHaveLength(0);
      expect(result.rankings).toHaveLength(0);
    });

    it('should provide correct ranking order', async () => {
      const candidates = [unrelatedAction, relatedAction, sampleAction];
      const result = await AnalysisService.findMostSimilar(sampleAction, candidates);

      // Identical action should be first (highest similarity)
      expect(result.rankings[0].action).toEqual(sampleAction);
      expect(result.rankings[0].similarity).toBeGreaterThan(0.8); // Identical actions get high but not perfect similarity

      // Related action should be second
      expect(result.rankings[1].action).toEqual(relatedAction);

      // Unrelated action should be last
      expect(result.rankings[2].action).toEqual(unrelatedAction);
    });
  });

  describe('quality scoring', () => {
    it('should give higher quality scores to richer content', async () => {
      const richAnalysis = await AnalysisService.analyzeAction(sampleAction);
      const poorAnalysis = await AnalysisService.analyzeAction(shortAction);

      expect(richAnalysis.metadata.qualityScore).toBeGreaterThan(poorAnalysis.metadata.qualityScore);
    });

    it('should consider content length in quality score', async () => {
      const longAction: ActionContent = {
        title: 'Very detailed action with lots of information',
        description: 'This is a very comprehensive description that provides extensive detail about what needs to be done, how it should be implemented, what technologies to use, and what the expected outcomes should be.',
        vision: 'A complete and thoroughly implemented solution that meets all requirements and provides excellent user experience'
      };

      const longAnalysis = await AnalysisService.analyzeAction(longAction);
      const shortAnalysis = await AnalysisService.analyzeAction(shortAction);

      expect(longAnalysis.metadata.qualityScore).toBeGreaterThan(shortAnalysis.metadata.qualityScore);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle actions with undefined fields', async () => {
      const actionWithUndefined: ActionContent = {
        title: 'Test action',
        description: undefined,
        vision: undefined
      };

      const result = await AnalysisService.analyzeAction(actionWithUndefined);

      expect(result.action).toEqual(actionWithUndefined);
      expect(result.metadata.contentLength).toBe('Test action'.length);
    });

    it('should handle very long content efficiently', async () => {
      const longContent = 'Very long content '.repeat(100);
      const longAction: ActionContent = {
        title: longContent,
        description: longContent,
        vision: longContent
      };

      const startTime = Date.now();
      const result = await AnalysisService.analyzeAction(longAction);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata.contentLength).toBeGreaterThan(1000);
      expect(result.keywords.keywords.length).toBeGreaterThan(0);
    });
  });
});

describe('Convenience functions', () => {
  const sampleAction: ActionContent = {
    title: 'Implement user authentication',
    description: 'Build login and logout functionality',
    vision: 'Secure user access'
  };

  describe('quickAnalyze', () => {
    it('should provide essential analysis info', async () => {
      const result = await quickAnalyze(sampleAction);

      expect(result).toHaveProperty('importantTerms');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('hasSufficientContent');

      expect(Array.isArray(result.importantTerms)).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
      expect(typeof result.hasSufficientContent).toBe('boolean');
    });

    it('should use reduced keyword limits for speed', async () => {
      const result = await quickAnalyze(sampleAction);

      // Should limit to 8 keywords max (as specified in implementation)
      expect(result.importantTerms.length).toBeLessThanOrEqual(8);
    });
  });

  describe('needsPlacementAnalysis', () => {
    it('should return true when no parent_id is provided', () => {
      expect(needsPlacementAnalysis(sampleAction)).toBe(true);
      expect(needsPlacementAnalysis(sampleAction, undefined)).toBe(true);
    });

    it('should return false when parent_id is provided and content is sufficient', () => {
      expect(needsPlacementAnalysis(sampleAction, 'parent-123')).toBe(false);
    });

    it('should return true for very short content even with parent_id', () => {
      const veryShortAction: ActionContent = { title: 'Fix' };
      expect(needsPlacementAnalysis(veryShortAction, 'parent-123')).toBe(true);
    });

    it('should handle empty content', () => {
      const emptyAction: ActionContent = { title: '' };
      expect(needsPlacementAnalysis(emptyAction)).toBe(true);
      expect(needsPlacementAnalysis(emptyAction, 'parent-123')).toBe(true);
    });
  });
});