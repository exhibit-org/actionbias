/**
 * @jest-environment node
 */

import { AnalysisService } from '../analysis';
import type { ActionContent } from '../../utils/text-processing';

describe('Deterministic Analysis Behavior', () => {
  // Test cases with known expected outcomes
  const testCases = [
    {
      name: 'Authentication action',
      action: {
        title: 'Implement user authentication system',
        description: 'Build login and logout functionality with OAuth support',
        vision: 'Users can securely access the application'
      },
      expectedKeywords: ['authentication', 'system', 'login', 'logout', 'functionality', 'oauth', 'support', 'users', 'securely', 'access', 'application', 'implement', 'build'],
      expectedPhrases: ['user authentication system', 'login logout functionality', 'oauth support users securely'],
      minQualityScore: 0.7,
      shouldHaveSufficientContent: true
    },
    {
      name: 'Database action',
      action: {
        title: 'Create database schema',
        description: 'Design and implement database tables for user data storage',
        vision: 'Organized data structure for efficient queries'
      },
      expectedKeywords: ['database', 'schema', 'design', 'implement', 'tables', 'user', 'data', 'storage', 'organized', 'structure', 'efficient', 'queries', 'create'],
      expectedPhrases: ['database schema design implement', 'implement database tables user', 'user data storage organized'],
      minQualityScore: 0.6,
      shouldHaveSufficientContent: true
    },
    {
      name: 'Minimal action',
      action: {
        title: 'Fix bug'
      },
      expectedKeywords: ['fix', 'bug'],
      expectedPhrases: [], // Too short for meaningful phrases
      maxQualityScore: 0.4, // Adjusted based on actual deterministic output
      shouldHaveSufficientContent: false
    }
  ];

  testCases.forEach(testCase => {
    describe(testCase.name, () => {
      let analysis: any;

      beforeAll(async () => {
        analysis = await AnalysisService.analyzeAction(testCase.action);
      });

      it('should extract expected keywords', () => {
        const extractedTerms = analysis.keywords.keywords.map((k: any) => k.term);
        
        // Check that most expected keywords are present
        const foundExpected = testCase.expectedKeywords.filter(expected => 
          extractedTerms.includes(expected)
        );
        
        // Should find at least 70% of expected keywords
        expect(foundExpected.length).toBeGreaterThanOrEqual(
          Math.floor(testCase.expectedKeywords.length * 0.7)
        );
      });

      it('should have consistent quality score range', () => {
        if (testCase.minQualityScore) {
          expect(analysis.metadata.qualityScore).toBeGreaterThanOrEqual(testCase.minQualityScore);
        }
        if (testCase.maxQualityScore) {
          expect(analysis.metadata.qualityScore).toBeLessThanOrEqual(testCase.maxQualityScore);
        }
      });

      it('should correctly assess content sufficiency', () => {
        expect(analysis.metadata.hasSufficientContent).toBe(testCase.shouldHaveSufficientContent);
      });

      it('should be deterministic across multiple runs', async () => {
        // Run analysis multiple times
        const analysis2 = await AnalysisService.analyzeAction(testCase.action);
        const analysis3 = await AnalysisService.analyzeAction(testCase.action);

        // Quality scores should be identical (deterministic)
        expect(analysis2.metadata.qualityScore).toBe(analysis.metadata.qualityScore);
        expect(analysis3.metadata.qualityScore).toBe(analysis.metadata.qualityScore);

        // Keyword lists should be identical
        expect(analysis2.keywords.keywords.map((k: any) => k.term)).toEqual(
          analysis.keywords.keywords.map((k: any) => k.term)
        );
        expect(analysis3.keywords.keywords.map((k: any) => k.term)).toEqual(
          analysis.keywords.keywords.map((k: any) => k.term)
        );

        // Important terms should be identical
        expect(analysis2.importantTerms).toEqual(analysis.importantTerms);
        expect(analysis3.importantTerms).toEqual(analysis.importantTerms);
      });
    });
  });

  describe('Similarity calculations', () => {
    it('should produce deterministic similarity scores', async () => {
      const action1 = {
        title: 'Create user authentication',
        description: 'Build login system with OAuth',
        vision: 'Secure user access'
      };

      const action2 = {
        title: 'Implement user authorization',
        description: 'Create role-based access control',
        vision: 'Controlled user permissions'
      };

      // Calculate similarity multiple times
      const comparison1 = await AnalysisService.compareActions(action1, action2);
      const comparison2 = await AnalysisService.compareActions(action1, action2);
      const comparison3 = await AnalysisService.compareActions(action1, action2);

      // Should be identical across runs
      expect(comparison2.similarity).toBe(comparison1.similarity);
      expect(comparison3.similarity).toBe(comparison1.similarity);
      expect(comparison2.sharedTerms).toEqual(comparison1.sharedTerms);
      expect(comparison3.sharedTerms).toEqual(comparison1.sharedTerms);
    });

    it('should have predictable similarity relationships', async () => {
      const baseAction = {
        title: 'User authentication system',
        description: 'Login and logout functionality',
        vision: 'Secure access control'
      };

      const relatedAction = {
        title: 'User authorization system', 
        description: 'Permission and role management',
        vision: 'Access control system'
      };

      const unrelatedAction = {
        title: 'Database backup process',
        description: 'Automated data backup procedures', 
        vision: 'Data protection and recovery'
      };

      const [relatedComparison, unrelatedComparison] = await Promise.all([
        AnalysisService.compareActions(baseAction, relatedAction),
        AnalysisService.compareActions(baseAction, unrelatedAction)
      ]);

      // Related should have higher similarity than unrelated
      expect(relatedComparison.similarity).toBeGreaterThan(unrelatedComparison.similarity);
      
      // Should have some shared terms with related action
      expect(relatedComparison.sharedTerms.length).toBeGreaterThan(0);
      
      // Related actions should share terms like 'user', 'system', 'access', 'control'
      const sharedTermsText = relatedComparison.sharedTerms.join(' ');
      expect(sharedTermsText).toMatch(/user|system|access|control/);
    });
  });

  describe('Batch analysis consistency', () => {
    it('should produce identical results in batch vs individual analysis', async () => {
      const actions = [
        { title: 'Create API endpoints', description: 'Build REST API for data access' },
        { title: 'Design UI components', description: 'Create reusable React components' },
        { title: 'Setup database', description: 'Configure PostgreSQL database' }
      ];

      // Analyze individually
      const individualResults = await Promise.all(
        actions.map(action => AnalysisService.analyzeAction(action))
      );

      // Analyze in batch
      const batchResult = await AnalysisService.batchAnalyze(actions);

      // Results should be identical
      expect(batchResult.analyses.length).toBe(individualResults.length);
      
      for (let i = 0; i < actions.length; i++) {
        expect(batchResult.analyses[i].metadata.qualityScore)
          .toBe(individualResults[i].metadata.qualityScore);
        
        expect(batchResult.analyses[i].importantTerms)
          .toEqual(individualResults[i].importantTerms);
        
        expect(batchResult.analyses[i].keywords.keywords.map((k: any) => k.term))
          .toEqual(individualResults[i].keywords.keywords.map((k: any) => k.term));
      }
    });
  });

  describe('Edge case determinism', () => {
    it('should handle empty content deterministically', async () => {
      const emptyAction = { title: '' };
      
      const analysis1 = await AnalysisService.analyzeAction(emptyAction);
      const analysis2 = await AnalysisService.analyzeAction(emptyAction);

      expect(analysis1.metadata.qualityScore).toBe(0);
      expect(analysis2.metadata.qualityScore).toBe(0);
      expect(analysis1.keywords.keywords).toEqual([]);
      expect(analysis2.keywords.keywords).toEqual([]);
      expect(analysis1.importantTerms).toEqual([]);
      expect(analysis2.importantTerms).toEqual([]);
    });

    it('should handle identical content deterministically', async () => {
      const action = {
        title: 'Test action',
        description: 'This is a test',
        vision: 'Testing works'
      };

      const analysis1 = await AnalysisService.analyzeAction(action);
      const analysis2 = await AnalysisService.analyzeAction(action);

      // Everything should be identical
      expect(analysis1.metadata.qualityScore).toBe(analysis2.metadata.qualityScore);
      expect(analysis1.metadata.contentLength).toBe(analysis2.metadata.contentLength);
      expect(analysis1.importantTerms).toEqual(analysis2.importantTerms);
      expect(analysis1.keywords.keywords).toEqual(analysis2.keywords.keywords);
      expect(analysis1.keywords.phrases).toEqual(analysis2.keywords.phrases);
    });
  });

  describe('Content variations produce expected differences', () => {
    it('should rank content richness correctly', async () => {
      const shortAction = { title: 'Fix' };
      const mediumAction = { title: 'Fix user authentication bug' };
      const richAction = {
        title: 'Fix user authentication bug in OAuth flow',
        description: 'Investigate and resolve authentication issues in the OAuth2 authorization flow',
        vision: 'Users can authenticate reliably without errors'
      };

      const [shortAnalysis, mediumAnalysis, richAnalysis] = await Promise.all([
        AnalysisService.analyzeAction(shortAction),
        AnalysisService.analyzeAction(mediumAction), 
        AnalysisService.analyzeAction(richAction)
      ]);

      // Quality should increase with content richness
      expect(shortAnalysis.metadata.qualityScore)
        .toBeLessThan(mediumAnalysis.metadata.qualityScore);
      expect(mediumAnalysis.metadata.qualityScore)
        .toBeLessThan(richAnalysis.metadata.qualityScore);

      // Keyword count should increase
      expect(shortAnalysis.keywords.keywords.length)
        .toBeLessThan(mediumAnalysis.keywords.keywords.length);
      expect(mediumAnalysis.keywords.keywords.length)
        .toBeLessThanOrEqual(richAnalysis.keywords.keywords.length);
    });
  });
});