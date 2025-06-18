import {
  extractKeywords,
  extractPhrases,
  extractKeywordsAndPhrases,
  getImportantTerms,
  calculateKeywordSimilarity,
  type ActionContent,
  type ExtractionOptions
} from '../keyword-extraction';
import { preprocessActionText } from '../text-processing';

describe('Keyword Extraction', () => {
  const sampleAction: ActionContent = {
    title: 'Implement text extraction and preprocessing system',
    description: 'Create a comprehensive text processing system that can extract and clean text from action titles and descriptions. The system should include normalization, stop word removal, and preparation for analysis.',
    vision: 'A robust text processing system that enables reliable content analysis and keyword extraction for action categorization'
  };

  const techAction: ActionContent = {
    title: 'Build React component library',
    description: 'Develop a reusable component library for React applications with TypeScript support, comprehensive testing, and Storybook documentation.',
    vision: 'A well-documented component library that accelerates development and ensures consistency across React projects'
  };

  const planningAction: ActionContent = {
    title: 'Design project planning workflow',
    description: 'Create a workflow for project planning that includes task breakdown, milestone tracking, and team collaboration features.',
    vision: 'An efficient project planning system that improves team productivity and project delivery'
  };

  describe('extractKeywords', () => {
    it('should extract keywords from preprocessed text', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const keywords = extractKeywords(preprocessed);
      
      expect(keywords).toBeDefined();
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      
      // Check keyword structure
      keywords.forEach(keyword => {
        expect(keyword).toHaveProperty('term');
        expect(keyword).toHaveProperty('score');
        expect(keyword).toHaveProperty('frequency');
        expect(keyword).toHaveProperty('type', 'single');
        expect(keyword).toHaveProperty('positions');
        expect(typeof keyword.term).toBe('string');
        expect(typeof keyword.score).toBe('number');
        expect(typeof keyword.frequency).toBe('number');
        expect(Array.isArray(keyword.positions)).toBe(true);
      });
    });

    it('should extract relevant keywords from action content', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const keywords = extractKeywords(preprocessed);
      
      const keywordTerms = keywords.map(k => k.term);
      
      // Should extract terms related to text processing (system, extraction, processing are key terms)
      expect(keywordTerms).toContain('system');
      expect(keywordTerms).toContain('extraction');
      expect(keywordTerms).toContain('processing');
    });

    it('should respect maxKeywords option', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const keywords = extractKeywords(preprocessed, { maxKeywords: 3 });
      
      expect(keywords.length).toBeLessThanOrEqual(3);
    });

    it('should respect minKeywordLength option', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const keywords = extractKeywords(preprocessed, { minKeywordLength: 5 });
      
      keywords.forEach(keyword => {
        expect(keyword.term.length).toBeGreaterThanOrEqual(5);
      });
    });

    it('should sort keywords by score in descending order', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const keywords = extractKeywords(preprocessed);
      
      for (let i = 1; i < keywords.length; i++) {
        expect(keywords[i - 1].score).toBeGreaterThanOrEqual(keywords[i].score);
      }
    });

    it('should use different scoring methods', () => {
      const preprocessed = preprocessActionText(sampleAction);
      
      const frequencyKeywords = extractKeywords(preprocessed, { scoringMethod: 'frequency' });
      const tfidfKeywords = extractKeywords(preprocessed, { scoringMethod: 'tfidf' });
      const weightedKeywords = extractKeywords(preprocessed, { scoringMethod: 'weighted' });
      
      expect(frequencyKeywords.length).toBeGreaterThan(0);
      expect(tfidfKeywords.length).toBeGreaterThan(0);
      expect(weightedKeywords.length).toBeGreaterThan(0);
      
      // Scores should be different for different methods
      expect(frequencyKeywords[0].score).not.toBe(tfidfKeywords[0].score);
    });
  });

  describe('extractPhrases', () => {
    it('should extract phrases from preprocessed text', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const phrases = extractPhrases(preprocessed);
      
      expect(phrases).toBeDefined();
      expect(Array.isArray(phrases)).toBe(true);
      
      phrases.forEach(phrase => {
        expect(phrase).toHaveProperty('term');
        expect(phrase).toHaveProperty('score');
        expect(phrase).toHaveProperty('frequency');
        expect(phrase).toHaveProperty('type', 'phrase');
        expect(phrase).toHaveProperty('positions');
        expect(phrase.term.split(' ').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should extract meaningful phrases', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const phrases = extractPhrases(preprocessed);
      
      const phraseTerms = phrases.map(p => p.term);
      
      // Should contain multi-word terms
      phrases.forEach(phrase => {
        expect(phrase.term.includes(' ')).toBe(true);
      });
    });

    it('should respect phrase length constraints', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const phrases = extractPhrases(preprocessed, {
        minPhraseWords: 2,
        maxPhraseWords: 3,
        maxPhraseLength: 30
      });
      
      phrases.forEach(phrase => {
        const words = phrase.term.split(' ');
        expect(words.length).toBeGreaterThanOrEqual(2);
        expect(words.length).toBeLessThanOrEqual(3);
        expect(phrase.term.length).toBeLessThanOrEqual(30);
      });
    });

    it('should respect maxPhrases option', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const phrases = extractPhrases(preprocessed, { maxPhrases: 2 });
      
      expect(phrases.length).toBeLessThanOrEqual(2);
    });
  });

  describe('extractKeywordsAndPhrases', () => {
    it('should extract both keywords and phrases', () => {
      const result = extractKeywordsAndPhrases(sampleAction);
      
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('phrases');
      expect(result).toHaveProperty('combined');
      expect(result).toHaveProperty('metadata');
      
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(Array.isArray(result.phrases)).toBe(true);
      expect(Array.isArray(result.combined)).toBe(true);
      expect(typeof result.metadata).toBe('object');
    });

    it('should provide metadata about the extraction', () => {
      const result = extractKeywordsAndPhrases(sampleAction);
      
      expect(result.metadata).toHaveProperty('totalTokens');
      expect(result.metadata).toHaveProperty('uniqueTokens');
      expect(result.metadata).toHaveProperty('avgWordLength');
      expect(result.metadata).toHaveProperty('totalPhrases');
      
      expect(typeof result.metadata.totalTokens).toBe('number');
      expect(typeof result.metadata.uniqueTokens).toBe('number');
      expect(typeof result.metadata.avgWordLength).toBe('number');
      expect(typeof result.metadata.totalPhrases).toBe('number');
      
      expect(result.metadata.totalTokens).toBeGreaterThan(0);
      expect(result.metadata.uniqueTokens).toBeGreaterThan(0);
      expect(result.metadata.avgWordLength).toBeGreaterThan(0);
    });

    it('should combine keywords and phrases without duplication', () => {
      const result = extractKeywordsAndPhrases(sampleAction);
      
      const combinedTerms = result.combined.map(item => item.term);
      const uniqueTerms = new Set(combinedTerms);
      
      expect(combinedTerms.length).toBe(uniqueTerms.size);
    });

    it('should prioritize phrases over individual words in combined results', () => {
      const result = extractKeywordsAndPhrases(sampleAction);
      
      // Find a phrase that contains individual words
      const phrase = result.phrases.find(p => p.term.includes('text'));
      if (phrase) {
        const words = phrase.term.split(' ');
        const combinedTerms = result.combined.map(item => item.term);
        
        // The phrase should be in combined results
        expect(combinedTerms).toContain(phrase.term);
        
        // Individual words from the phrase should not be in combined results
        words.forEach(word => {
          const wordInCombined = combinedTerms.includes(word);
          if (wordInCombined) {
            // If the word is there, it should have a lower position than the phrase
            const wordIndex = combinedTerms.indexOf(word);
            const phraseIndex = combinedTerms.indexOf(phrase.term);
            expect(phraseIndex).toBeLessThan(wordIndex);
          }
        });
      }
    });

    it('should sort combined results by score', () => {
      const result = extractKeywordsAndPhrases(sampleAction);
      
      for (let i = 1; i < result.combined.length; i++) {
        expect(result.combined[i - 1].score).toBeGreaterThanOrEqual(result.combined[i].score);
      }
    });
  });

  describe('getImportantTerms', () => {
    it('should return important terms as strings', () => {
      const terms = getImportantTerms(sampleAction);
      
      expect(Array.isArray(terms)).toBe(true);
      expect(terms.length).toBeGreaterThan(0);
      
      terms.forEach(term => {
        expect(typeof term).toBe('string');
        expect(term.length).toBeGreaterThan(0);
      });
    });

    it('should respect maxTerms parameter', () => {
      const terms = getImportantTerms(sampleAction, 5);
      
      expect(terms.length).toBeLessThanOrEqual(5);
    });

    it('should return the most important terms', () => {
      const terms = getImportantTerms(sampleAction, 10);
      
      // Should include key terms from the action
      expect(terms.some(term => term.includes('text') || term.includes('system') || term.includes('extraction'))).toBe(true);
    });

    it('should work with different action types', () => {
      const techTerms = getImportantTerms(techAction);
      const planningTerms = getImportantTerms(planningAction);
      
      expect(techTerms.length).toBeGreaterThan(0);
      expect(planningTerms.length).toBeGreaterThan(0);
      
      // Different actions should produce different important terms
      expect(techTerms).not.toEqual(planningTerms);
    });
  });

  describe('calculateKeywordSimilarity', () => {
    it('should calculate similarity between actions', () => {
      const similarity1 = calculateKeywordSimilarity(sampleAction, sampleAction);
      const similarity2 = calculateKeywordSimilarity(sampleAction, techAction);
      
      expect(typeof similarity1).toBe('number');
      expect(typeof similarity2).toBe('number');
      
      expect(similarity1).toBeGreaterThanOrEqual(0);
      expect(similarity1).toBeLessThanOrEqual(1);
      expect(similarity2).toBeGreaterThanOrEqual(0);
      expect(similarity2).toBeLessThanOrEqual(1);
    });

    it('should return 1 for identical actions', () => {
      const similarity = calculateKeywordSimilarity(sampleAction, sampleAction);
      
      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different actions', () => {
      const emptyAction: ActionContent = { title: '' };
      const similarity = calculateKeywordSimilarity(sampleAction, emptyAction);
      
      expect(similarity).toBe(0);
    });

    it('should return higher similarity for related actions', () => {
      // Use an action with more overlapping terms
      const relatedAction: ActionContent = {
        title: 'Create text analysis system',
        description: 'Build a comprehensive system for text extraction and processing with analysis capabilities',
        vision: 'A robust text processing system for content analysis'
      };
      
      const unrelatedAction: ActionContent = {
        title: 'Cook dinner',
        description: 'Prepare a meal for family',
        vision: 'Delicious home-cooked food'
      };
      
      const relatedSimilarity = calculateKeywordSimilarity(sampleAction, relatedAction);
      const unrelatedSimilarity = calculateKeywordSimilarity(sampleAction, unrelatedAction);
      
      expect(relatedSimilarity).toBeGreaterThan(unrelatedSimilarity);
    });

    it('should handle edge cases gracefully', () => {
      const emptyAction1: ActionContent = { title: '' };
      const emptyAction2: ActionContent = { title: '' };
      
      const similarity = calculateKeywordSimilarity(emptyAction1, emptyAction2);
      
      expect(similarity).toBe(0);
    });
  });

  describe('Integration with text preprocessing', () => {
    it('should work with preprocessed text from text-processing module', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const keywords = extractKeywords(preprocessed);
      
      expect(keywords.length).toBeGreaterThan(0);
      
      // Should contain meaningful, cleaned terms
      keywords.forEach(keyword => {
        expect(keyword.term).not.toContain(' '); // Single words only
        expect(keyword.term.toLowerCase()).toBe(keyword.term); // Should be lowercase
        expect(keyword.term.length).toBeGreaterThan(2); // Should respect min length
      });
    });

    it('should benefit from stop word removal', () => {
      const withStopWords = preprocessActionText(sampleAction, { removeStopWords: false });
      const withoutStopWords = preprocessActionText(sampleAction, { removeStopWords: true });
      
      const keywordsWithStopWords = extractKeywords(withStopWords);
      const keywordsWithoutStopWords = extractKeywords(withoutStopWords);
      
      // Without stop words should produce more meaningful keywords
      const meaningfulTerms = ['text', 'system', 'extraction', 'processing', 'analysis'];
      
      const meaningfulCount1 = keywordsWithStopWords.filter(k => 
        meaningfulTerms.some(term => k.term.includes(term))
      ).length;
      
      const meaningfulCount2 = keywordsWithoutStopWords.filter(k => 
        meaningfulTerms.some(term => k.term.includes(term))
      ).length;
      
      expect(meaningfulCount2).toBeGreaterThanOrEqual(meaningfulCount1);
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle empty content gracefully', () => {
      const emptyAction: ActionContent = { title: '' };
      const result = extractKeywordsAndPhrases(emptyAction);
      
      expect(result.keywords).toEqual([]);
      expect(result.phrases).toEqual([]);
      expect(result.combined).toEqual([]);
    });

    it('should handle very short content', () => {
      const shortAction: ActionContent = { title: 'Test' };
      const result = extractKeywordsAndPhrases(shortAction);
      
      expect(result.keywords.length).toBeLessThanOrEqual(1);
      expect(result.phrases).toEqual([]);
    });

    it('should handle very long content efficiently', () => {
      const longAction: ActionContent = {
        title: 'Complex system implementation',
        description: 'This is a very long description that contains many repeated words and phrases. ' +
          'The system should be able to handle text processing, keyword extraction, phrase identification, ' +
          'content analysis, and natural language processing efficiently. ' +
          'The implementation should include robust error handling, comprehensive testing, ' +
          'and scalable architecture for enterprise-level applications.',
        vision: 'A comprehensive solution that provides excellent performance and reliability'
      };
      
      const startTime = Date.now();
      const result = extractKeywordsAndPhrases(longAction);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.combined.length).toBeGreaterThan(0);
    });
  });
});