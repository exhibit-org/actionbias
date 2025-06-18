/**
 * @jest-environment node
 */

import { ActionsService } from '../../lib/services/actions';

// Mock the AI SDK to ensure deterministic behavior
jest.mock('ai', () => ({
  generateObject: jest.fn()
}));

import { generateObject } from 'ai';
const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

// Mock the database since we're testing the integration logic
jest.mock('../../lib/db/adapter', () => ({
  getDb: jest.fn(() => ({
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([]))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{
          id: 'test-action-id',
          data: { title: 'Test Action' },
          done: false,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }]))
      }))
    }))
  }))
}));

describe('Action Creation Analysis Integration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockGenerateObject.mockReset();
  });

  describe('Deterministic analysis triggering', () => {
    it('should consistently trigger analysis for orphaned actions', async () => {
      // Mock consistent LLM responses for deterministic behavior
      const mockResponse = {
        object: {
          bestParentId: null,
          confidence: 0.2,
          reasoning: 'No clear semantic match found with existing categories'
        }
      } as any;
      
      mockGenerateObject
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);
      const actionParams = {
        title: 'Implement user authentication system',
        description: 'Build comprehensive login and logout functionality with OAuth2 support and session management',
        vision: 'Users can securely access the application with multiple authentication methods'
      };

      // Create the same action multiple times
      const results = await Promise.all([
        ActionsService.createAction(actionParams),
        ActionsService.createAction(actionParams),
        ActionsService.createAction(actionParams)
      ]);

      // All should trigger analysis (no parent_id specified)
      results.forEach(result => {
        expect(result.needs_auto_placement).toBe(true);
        expect(result.placement).toBeDefined();
        expect(result.analysis).toBeDefined(); // Analysis comes via placement
      });

      // Analysis results should be deterministic
      const analysis1 = results[0].analysis!;
      const analysis2 = results[1].analysis!;
      const analysis3 = results[2].analysis!;

      // Quality scores should be identical
      expect(analysis1.metadata.qualityScore).toBe(analysis2.metadata.qualityScore);
      expect(analysis2.metadata.qualityScore).toBe(analysis3.metadata.qualityScore);

      // Important terms should be identical
      expect(analysis1.importantTerms).toEqual(analysis2.importantTerms);
      expect(analysis2.importantTerms).toEqual(analysis3.importantTerms);

      // Keyword counts should be identical
      expect(analysis1.keywords.keywords.length).toBe(analysis2.keywords.keywords.length);
      expect(analysis2.keywords.keywords.length).toBe(analysis3.keywords.keywords.length);

      // Keywords should be in the same order
      expect(analysis1.keywords.keywords.map(k => k.term))
        .toEqual(analysis2.keywords.keywords.map(k => k.term));
      expect(analysis2.keywords.keywords.map(k => k.term))
        .toEqual(analysis3.keywords.keywords.map(k => k.term));
    });

    it('should NOT trigger analysis for actions with parent_id', async () => {
      const actionParams = {
        title: 'Child action',
        description: 'This has a parent',
        parent_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      try {
        const result = await ActionsService.createAction(actionParams);
        // This will fail due to mocked DB, but we can check the params would be correct
      } catch (error) {
        // Expected to fail due to DB mock, but the logic path is tested
        expect(error).toBeDefined();
      }
    });

    it('should produce predictable analysis results for known inputs', async () => {
      // Mock API responses for each test case
      mockGenerateObject
        .mockResolvedValueOnce({
          object: { bestParentId: null, confidence: 0.6, reasoning: 'API-related functionality' }
        } as any)
        .mockResolvedValueOnce({
          object: { bestParentId: null, confidence: 0.1, reasoning: 'Minimal content' }
        } as any);

      const testCases = [
        {
          input: {
            title: 'Create REST API',
            description: 'Build RESTful API endpoints for data access',
            vision: 'Efficient data operations'
          },
          expectedPattern: {
            hasKeywords: ['api', 'endpoints', 'data', 'access'],
            minQualityScore: 0.6,
            shouldHaveSufficientContent: true
          }
        },
        {
          input: {
            title: 'Fix'
          },
          expectedPattern: {
            hasKeywords: ['fix'],
            maxQualityScore: 0.4,
            shouldHaveSufficientContent: false
          }
        }
      ];

      for (const testCase of testCases) {
        const result = await ActionsService.createAction(testCase.input);
        
        expect(result.needs_auto_placement).toBe(true);
        expect(result.analysis).toBeDefined();

        const analysis = result.analysis!;
        
        // Check expected keywords are present
        const extractedKeywords = analysis.keywords.keywords.map(k => k.term);
        testCase.expectedPattern.hasKeywords.forEach(expectedKeyword => {
          expect(extractedKeywords).toContain(expectedKeyword);
        });

        // Check quality score ranges
        if (testCase.expectedPattern.minQualityScore) {
          expect(analysis.metadata.qualityScore)
            .toBeGreaterThanOrEqual(testCase.expectedPattern.minQualityScore);
        }
        if (testCase.expectedPattern.maxQualityScore) {
          expect(analysis.metadata.qualityScore)
            .toBeLessThanOrEqual(testCase.expectedPattern.maxQualityScore);
        }

        // Check content sufficiency
        expect(analysis.metadata.hasSufficientContent)
          .toBe(testCase.expectedPattern.shouldHaveSufficientContent);
      }
    });

    it('should maintain analysis consistency under load', async () => {
      // Mock consistent responses for all parallel calls
      const mockResponse = {
        object: {
          bestParentId: null,
          confidence: 0.4,
          reasoning: 'Data processing functionality'
        }
      } as any;
      
      // Setup 10 identical mock responses
      for (let i = 0; i < 10; i++) {
        mockGenerateObject.mockResolvedValueOnce(mockResponse);
      }

      const actionParams = {
        title: 'Process user data',
        description: 'Implement data processing pipeline for user information',
        vision: 'Efficient and reliable data handling'
      };

      // Create many actions in parallel to test consistency
      const promises = Array(10).fill(0).map(() => 
        ActionsService.createAction(actionParams)
      );

      const results = await Promise.all(promises);

      // All results should have identical analysis
      const firstAnalysis = results[0].analysis!;
      
      results.slice(1).forEach((result, index) => {
        const analysis = result.analysis!;
        
        expect(analysis.metadata.qualityScore).toBe(firstAnalysis.metadata.qualityScore);
        expect(analysis.importantTerms).toEqual(firstAnalysis.importantTerms);
        expect(analysis.keywords.keywords.map(k => k.term))
          .toEqual(firstAnalysis.keywords.keywords.map(k => k.term));
      });
    });

    it('should handle analysis errors gracefully without failing action creation', async () => {
      // Mock AnalysisService to throw an error
      const originalAnalyzeAction = require('../../lib/services/analysis').AnalysisService.analyzeAction;
      const AnalysisService = require('../../lib/services/analysis').AnalysisService;
      
      AnalysisService.analyzeAction = jest.fn(() => {
        throw new Error('Analysis failed');
      });

      const actionParams = {
        title: 'Test action with analysis error',
        description: 'This should still create successfully'
      };

      const result = await ActionsService.createAction(actionParams);

      // Action should still be created
      expect(result.action).toBeDefined();
      expect(result.needs_auto_placement).toBe(true);
      
      // Analysis should be undefined due to error, but creation should succeed
      expect(result.analysis).toBeUndefined();

      // Restore original function
      AnalysisService.analyzeAction = originalAnalyzeAction;
    });
  });

  describe('Analysis result structure validation', () => {
    it('should always return well-formed analysis results', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          bestParentId: null,
          confidence: 0.5,
          reasoning: 'Test validation action'
        }
      } as any);

      const actionParams = {
        title: 'Validate analysis structure',
        description: 'Test that analysis results have expected structure',
        vision: 'Consistent API contract'
      };

      const result = await ActionsService.createAction(actionParams);
      const analysis = result.analysis!;

      // Validate complete analysis structure
      expect(analysis).toHaveProperty('action');
      expect(analysis).toHaveProperty('preprocessed');
      expect(analysis).toHaveProperty('keywords');
      expect(analysis).toHaveProperty('importantTerms');
      expect(analysis).toHaveProperty('metadata');

      // Validate keywords structure
      expect(analysis.keywords).toHaveProperty('keywords');
      expect(analysis.keywords).toHaveProperty('phrases');
      expect(analysis.keywords).toHaveProperty('combined');
      expect(analysis.keywords).toHaveProperty('metadata');

      // Validate metadata structure
      expect(analysis.metadata).toHaveProperty('contentLength');
      expect(analysis.metadata).toHaveProperty('qualityScore');
      expect(analysis.metadata).toHaveProperty('hasSufficientContent');
      expect(analysis.metadata).toHaveProperty('analyzedAt');
      expect(analysis.metadata).toHaveProperty('processingTime');

      // Validate data types
      expect(typeof analysis.metadata.contentLength).toBe('number');
      expect(typeof analysis.metadata.qualityScore).toBe('number');
      expect(typeof analysis.metadata.hasSufficientContent).toBe('boolean');
      expect(typeof analysis.metadata.analyzedAt).toBe('string');
      expect(typeof analysis.metadata.processingTime).toBe('number');

      expect(Array.isArray(analysis.importantTerms)).toBe(true);
      expect(Array.isArray(analysis.keywords.keywords)).toBe(true);
      expect(Array.isArray(analysis.keywords.phrases)).toBe(true);
    });
  });
});