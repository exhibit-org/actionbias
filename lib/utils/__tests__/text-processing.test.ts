import {
  extractText,
  normalizeText,
  cleanText,
  tokenizeText,
  removeStopWords,
  filterByLength,
  preprocessSingleText,
  preprocessActionText,
  getAllTokens,
  getTokenFrequency,
  getTopTokens,
  type ActionContent
} from '../text-processing';

describe('Text Processing Utilities', () => {
  const sampleAction: ActionContent = {
    title: 'Implement text extraction and preprocessing',
    description: 'Create functions to extract and clean text from action titles and descriptions, including normalization, stop word removal, and preparation for analysis.',
    vision: 'Action content is properly cleaned and formatted for reliable analysis'
  };

  describe('extractText', () => {
    it('should extract all text fields from action', () => {
      const result = extractText(sampleAction);
      
      expect(result.title).toBe('Implement text extraction and preprocessing');
      expect(result.description).toBe('Create functions to extract and clean text from action titles and descriptions, including normalization, stop word removal, and preparation for analysis.');
      expect(result.vision).toBe('Action content is properly cleaned and formatted for reliable analysis');
      expect(result.combined).toContain('Implement text extraction');
      expect(result.combined).toContain('Create functions');
      expect(result.combined).toContain('Action content is properly');
    });

    it('should handle missing fields', () => {
      const actionWithMissingFields: ActionContent = {
        title: 'Test Action'
      };
      
      const result = extractText(actionWithMissingFields);
      
      expect(result.title).toBe('Test Action');
      expect(result.description).toBe('');
      expect(result.vision).toBe('');
      expect(result.combined).toBe('Test Action');
    });
  });

  describe('normalizeText', () => {
    it('should convert text to lowercase', () => {
      expect(normalizeText('HELLO World')).toBe('hello world');
    });

    it('should handle unicode characters', () => {
      expect(normalizeText('Café naïve')).toBe('cafe naive');
    });

    it('should trim whitespace', () => {
      expect(normalizeText('  hello world  ')).toBe('hello world');
    });
  });

  describe('cleanText', () => {
    it('should remove special characters', () => {
      expect(cleanText('hello, world!')).toBe('hello world');
    });

    it('should replace hyphens and underscores with spaces', () => {
      expect(cleanText('hello-world_test')).toBe('hello world test');
    });

    it('should collapse multiple spaces', () => {
      expect(cleanText('hello    world')).toBe('hello world');
    });
  });

  describe('tokenizeText', () => {
    it('should split text into tokens', () => {
      const tokens = tokenizeText('hello world test');
      expect(tokens).toEqual(['hello', 'world', 'test']);
    });

    it('should handle empty text', () => {
      expect(tokenizeText('')).toEqual([]);
      expect(tokenizeText('   ')).toEqual([]);
    });
  });

  describe('removeStopWords', () => {
    it('should remove common stop words', () => {
      const tokens = ['the', 'quick', 'brown', 'fox', 'is', 'running'];
      const filtered = removeStopWords(tokens);
      expect(filtered).toEqual(['quick', 'brown', 'fox', 'running']);
    });

    it('should preserve non-stop words', () => {
      const tokens = ['implement', 'text', 'processing'];
      const filtered = removeStopWords(tokens);
      expect(filtered).toEqual(['implement', 'text', 'processing']);
    });
  });

  describe('filterByLength', () => {
    it('should filter tokens by minimum length', () => {
      const tokens = ['a', 'to', 'the', 'hello', 'world'];
      const filtered = filterByLength(tokens, 3);
      expect(filtered).toEqual(['the', 'hello', 'world']);
    });

    it('should use default minimum length of 2', () => {
      const tokens = ['a', 'to', 'be', 'hello'];
      const filtered = filterByLength(tokens);
      expect(filtered).toEqual(['to', 'be', 'hello']);
    });
  });

  describe('preprocessSingleText', () => {
    it('should perform complete preprocessing pipeline', () => {
      const text = 'Hello, World! This is a TEST.';
      const result = preprocessSingleText(text);
      
      expect(result.original).toBe('Hello, World! This is a TEST.');
      expect(result.normalized).toBe('hello, world! this is a test.');
      expect(result.cleaned).toBe('hello world this is a test');
      expect(result.tokens).toEqual(['hello', 'world', 'test']);
    });

    it('should respect options for stop word removal', () => {
      const text = 'The quick brown fox';
      const result = preprocessSingleText(text, { removeStopWords: false });
      
      expect(result.tokens).toEqual(['the', 'quick', 'brown', 'fox']);
    });

    it('should respect options for minimum token length', () => {
      const text = 'a big test case';
      const result = preprocessSingleText(text, { minTokenLength: 3 });
      
      expect(result.tokens).toEqual(['big', 'test', 'case']);
    });
  });

  describe('preprocessActionText', () => {
    it('should preprocess all action text fields', () => {
      const result = preprocessActionText(sampleAction);
      
      expect(result.original.title).toBe(sampleAction.title);
      expect(result.original.description).toBe(sampleAction.description);
      expect(result.original.vision).toBe(sampleAction.vision);
      
      expect(result.tokens.title).toContain('implement');
      expect(result.tokens.title).toContain('text');
      expect(result.tokens.title).toContain('extraction');
      expect(result.tokens.title).toContain('preprocessing');
      
      expect(result.tokens.description).toContain('create');
      expect(result.tokens.description).toContain('functions');
      expect(result.tokens.description).toContain('extract');
      expect(result.tokens.description).toContain('clean');
      
      expect(result.tokens.vision).toContain('action');
      expect(result.tokens.vision).toContain('content');
      expect(result.tokens.vision).toContain('properly');
      expect(result.tokens.vision).toContain('cleaned');
    });
  });

  describe('getAllTokens', () => {
    it('should return unique tokens from all fields', () => {
      const preprocessed = preprocessActionText({
        title: 'Test action implementation',
        description: 'Implement test functions',
        vision: 'Test implementation complete'
      });
      
      const allTokens = getAllTokens(preprocessed);
      
      expect(allTokens).toContain('test');
      expect(allTokens).toContain('action');
      expect(allTokens).toContain('implementation');
      expect(allTokens).toContain('implement');
      expect(allTokens).toContain('functions');
      expect(allTokens).toContain('complete');
      
      // Should be unique
      const uniqueTokens = new Set(allTokens);
      expect(allTokens.length).toBe(uniqueTokens.size);
    });
  });

  describe('getTokenFrequency', () => {
    it('should calculate token frequencies', () => {
      const preprocessed = preprocessActionText({
        title: 'Test implementation system',
        description: 'Test the implementation of system features',
        vision: 'Implementation and system test complete'
      });
      
      const frequency = getTokenFrequency(preprocessed);
      
      expect(frequency.get('test')).toBeGreaterThan(1);
      expect(frequency.get('implementation')).toBeGreaterThan(1);
      expect(frequency.get('system')).toBeGreaterThan(1);
      expect(frequency.get('complete')).toBe(1);
    });
  });

  describe('getTopTokens', () => {
    it('should return top tokens by frequency', () => {
      const preprocessed = preprocessActionText({
        title: 'Test implementation system test',
        description: 'Test the implementation of system features',
        vision: 'Implementation and system test complete with testing'
      });
      
      const topTokens = getTopTokens(preprocessed, 4);
      
      expect(topTokens.length).toBeGreaterThan(0);
      expect(topTokens.length).toBeLessThanOrEqual(4);
      
      // Check that results are sorted by frequency (descending)
      for (let i = 1; i < topTokens.length; i++) {
        expect(topTokens[i-1].frequency).toBeGreaterThanOrEqual(topTokens[i].frequency);
      }
      
      topTokens.forEach(item => {
        expect(item).toHaveProperty('token');
        expect(item).toHaveProperty('frequency');
        expect(typeof item.frequency).toBe('number');
        expect(item.frequency).toBeGreaterThan(0);
      });
    });

    it('should limit results to specified count', () => {
      const preprocessed = preprocessActionText(sampleAction);
      const topTokens = getTopTokens(preprocessed, 5);
      
      expect(topTokens.length).toBeLessThanOrEqual(5);
    });
  });
});