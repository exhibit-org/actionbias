/**
 * Keyword and phrase extraction utilities for action content analysis
 * Builds upon the text-processing utilities to identify important terms and phrases
 */

import { preprocessActionText, type ActionContent, type PreprocessedText } from './text-processing';

export interface Keyword {
  term: string;
  score: number;
  frequency: number;
  type: 'single' | 'phrase';
  positions: number[]; // Positions where this keyword appears in the text
}

export interface KeywordExtractionResult {
  keywords: Keyword[];
  phrases: Keyword[];
  combined: Keyword[];
  metadata: {
    totalTokens: number;
    uniqueTokens: number;
    avgWordLength: number;
    totalPhrases: number;
  };
}

export interface ExtractionOptions {
  maxKeywords?: number;
  maxPhrases?: number;
  minKeywordLength?: number;
  maxPhraseLength?: number;
  minPhraseWords?: number;
  maxPhraseWords?: number;
  includeScores?: boolean;
  scoringMethod?: 'frequency' | 'tfidf' | 'weighted';
}

/**
 * Default extraction options
 */
const DEFAULT_OPTIONS: Required<ExtractionOptions> = {
  maxKeywords: 10,
  maxPhrases: 5,
  minKeywordLength: 3,
  maxPhraseLength: 50,
  minPhraseWords: 2,
  maxPhraseWords: 4,
  includeScores: true,
  scoringMethod: 'weighted',
};

/**
 * Calculate TF-IDF score for a term
 * Since we don't have a corpus, we'll use a simplified approach based on term frequency
 * and inverse document frequency approximation
 */
function calculateTfIdfScore(
  termFreq: number,
  totalTerms: number,
  termLength: number,
  avgTermLength: number
): number {
  // Term frequency component
  const tf = termFreq / totalTerms;
  
  // Simple IDF approximation - longer, less common terms get higher scores
  const lengthBoost = Math.min(termLength / avgTermLength, 2.0);
  
  // Frequency penalty for overly common terms
  const frequencyPenalty = termFreq > 3 ? Math.log(termFreq) / Math.log(10) : 1;
  
  return (tf * lengthBoost) / frequencyPenalty;
}

/**
 * Calculate weighted score combining frequency, length, and position
 */
function calculateWeightedScore(
  termFreq: number,
  totalTerms: number,
  termLength: number,
  avgTermLength: number,
  positions: number[],
  totalPositions: number
): number {
  // Base TF-IDF score
  const tfidfScore = calculateTfIdfScore(termFreq, totalTerms, termLength, avgTermLength);
  
  // Position bonus - terms appearing earlier get slight boost
  const avgPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
  const positionBonus = Math.max(0, 1 - (avgPosition / totalPositions)) * 0.2 + 1;
  
  // Length bonus for meaningful terms
  const lengthBonus = Math.min(Math.max(termLength - 2, 1) / 8, 1.5);
  
  return tfidfScore * positionBonus * lengthBonus;
}

/**
 * Extract keywords from preprocessed text
 */
export function extractKeywords(
  preprocessed: PreprocessedText,
  options: ExtractionOptions = {}
): Keyword[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Combine all tokens with their positions
  const allTokens: string[] = [];
  const tokenPositions = new Map<string, number[]>();
  
  // Add tokens from each field with position tracking
  let position = 0;
  
  // Title tokens (higher weight)
  preprocessed.tokens.title.forEach(token => {
    if (token.length >= opts.minKeywordLength) {
      allTokens.push(token);
      if (!tokenPositions.has(token)) {
        tokenPositions.set(token, []);
      }
      tokenPositions.get(token)!.push(position);
      position++;
    }
  });
  
  // Description tokens
  preprocessed.tokens.description.forEach(token => {
    if (token.length >= opts.minKeywordLength) {
      allTokens.push(token);
      if (!tokenPositions.has(token)) {
        tokenPositions.set(token, []);
      }
      tokenPositions.get(token)!.push(position);
      position++;
    }
  });
  
  // Vision tokens
  preprocessed.tokens.vision.forEach(token => {
    if (token.length >= opts.minKeywordLength) {
      allTokens.push(token);
      if (!tokenPositions.has(token)) {
        tokenPositions.set(token, []);
      }
      tokenPositions.get(token)!.push(position);
      position++;
    }
  });
  
  // Calculate frequencies
  const frequencies = new Map<string, number>();
  allTokens.forEach(token => {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  });
  
  // Calculate average term length
  const avgTermLength = allTokens.reduce((sum, token) => sum + token.length, 0) / allTokens.length;
  
  // Generate keywords with scores
  const keywords: Keyword[] = [];
  
  frequencies.forEach((freq, term) => {
    const positions = tokenPositions.get(term) || [];
    let score: number;
    
    switch (opts.scoringMethod) {
      case 'frequency':
        score = freq;
        break;
      case 'tfidf':
        score = calculateTfIdfScore(freq, allTokens.length, term.length, avgTermLength);
        break;
      case 'weighted':
      default:
        score = calculateWeightedScore(freq, allTokens.length, term.length, avgTermLength, positions, position);
        break;
    }
    
    keywords.push({
      term,
      score,
      frequency: freq,
      type: 'single',
      positions,
    });
  });
  
  // Sort by score and limit results
  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.maxKeywords);
}

/**
 * Extract n-grams (sequences of n words) from tokens
 */
function extractNGrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    const ngram = tokens.slice(i, i + n).join(' ');
    ngrams.push(ngram);
  }
  
  return ngrams;
}

/**
 * Extract key phrases from preprocessed text
 */
export function extractPhrases(
  preprocessed: PreprocessedText,
  options: ExtractionOptions = {}
): Keyword[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Combine tokens from all fields for phrase extraction
  const allTokens = [
    ...preprocessed.tokens.title,
    ...preprocessed.tokens.description,
    ...preprocessed.tokens.vision,
  ].filter(token => token.length >= opts.minKeywordLength);
  
  // Extract n-grams of different lengths
  const phrases = new Map<string, { frequency: number; positions: number[] }>();
  
  for (let n = opts.minPhraseWords; n <= opts.maxPhraseWords; n++) {
    const ngrams = extractNGrams(allTokens, n);
    
    ngrams.forEach((phrase, index) => {
      // Filter out phrases that are too long
      if (phrase.length <= opts.maxPhraseLength) {
        if (!phrases.has(phrase)) {
          phrases.set(phrase, { frequency: 0, positions: [] });
        }
        const data = phrases.get(phrase)!;
        data.frequency++;
        data.positions.push(index);
      }
    });
  }
  
  // Calculate average phrase length
  const avgPhraseLength = Array.from(phrases.keys())
    .reduce((sum, phrase) => sum + phrase.length, 0) / phrases.size || 1;
  
  // Generate phrase keywords with scores
  const phraseKeywords: Keyword[] = [];
  
  phrases.forEach(({ frequency, positions }, phrase) => {
    // Only include phrases that appear more than once or are long enough
    if (frequency > 1 || phrase.split(' ').length >= 3) {
      let score: number;
      
      switch (opts.scoringMethod) {
        case 'frequency':
          score = frequency;
          break;
        case 'tfidf':
          score = calculateTfIdfScore(frequency, allTokens.length, phrase.length, avgPhraseLength);
          break;
        case 'weighted':
        default:
          score = calculateWeightedScore(
            frequency,
            allTokens.length,
            phrase.length,
            avgPhraseLength,
            positions,
            allTokens.length
          );
          // Boost score for multi-word phrases
          score *= 1.5;
          break;
      }
      
      phraseKeywords.push({
        term: phrase,
        score,
        frequency,
        type: 'phrase',
        positions,
      });
    }
  });
  
  // Sort by score and limit results
  return phraseKeywords
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.maxPhrases);
}

/**
 * Extract both keywords and phrases from action content
 */
export function extractKeywordsAndPhrases(
  action: ActionContent,
  options: ExtractionOptions = {}
): KeywordExtractionResult {
  // First preprocess the text
  const preprocessed = preprocessActionText(action, {
    removeStopWords: true,
    minTokenLength: 3,
  });
  
  // Extract keywords and phrases
  const keywords = extractKeywords(preprocessed, options);
  const phrases = extractPhrases(preprocessed, options);
  
  // Combine and deduplicate (prefer phrases over single words if they contain the word)
  const combined: Keyword[] = [];
  const usedTerms = new Set<string>();
  
  // Add phrases first (they have priority)
  phrases.forEach(phrase => {
    combined.push(phrase);
    usedTerms.add(phrase.term);
    // Mark individual words in the phrase as used
    phrase.term.split(' ').forEach(word => usedTerms.add(word));
  });
  
  // Add keywords that aren't already covered by phrases
  keywords.forEach(keyword => {
    if (!usedTerms.has(keyword.term)) {
      combined.push(keyword);
      usedTerms.add(keyword.term);
    }
  });
  
  // Sort combined results by score
  combined.sort((a, b) => b.score - a.score);
  
  // Calculate metadata
  const allTokens = [
    ...preprocessed.tokens.title,
    ...preprocessed.tokens.description,
    ...preprocessed.tokens.vision,
  ];
  
  const metadata = {
    totalTokens: allTokens.length,
    uniqueTokens: new Set(allTokens).size,
    avgWordLength: allTokens.reduce((sum, token) => sum + token.length, 0) / allTokens.length || 0,
    totalPhrases: phrases.length,
  };
  
  return {
    keywords,
    phrases,
    combined,
    metadata,
  };
}

/**
 * Get the most important terms from action content (convenience function)
 */
export function getImportantTerms(
  action: ActionContent,
  maxTerms: number = 8
): string[] {
  const result = extractKeywordsAndPhrases(action, {
    maxKeywords: Math.ceil(maxTerms * 0.7),
    maxPhrases: Math.ceil(maxTerms * 0.3),
  });
  
  return result.combined
    .slice(0, maxTerms)
    .map(keyword => keyword.term);
}

/**
 * Compare two actions based on their keyword similarity
 * Uses multiple similarity measures for better action placement
 */
export function calculateKeywordSimilarity(
  action1: ActionContent,
  action2: ActionContent,
  options: ExtractionOptions = {}
): number {
  const result1 = extractKeywordsAndPhrases(action1, { maxKeywords: 20, maxPhrases: 8 });
  const result2 = extractKeywordsAndPhrases(action2, { maxKeywords: 20, maxPhrases: 8 });
  
  if (result1.keywords.length === 0 || result2.keywords.length === 0) {
    return 0;
  }
  
  // Get keywords with their scores for weighted similarity
  const keywords1 = result1.keywords;
  const keywords2 = result2.keywords;
  
  // 1. Weighted overlap similarity (emphasizes important terms)
  const weightedOverlap = calculateWeightedOverlap(keywords1, keywords2);
  
  // 2. Jaccard similarity (intersection over union)
  const jaccardSim = calculateJaccardSimilarity(keywords1, keywords2);
  
  // 3. Phrase similarity (for longer meaningful matches)
  const phraseSim = calculatePhraseSimilarity(result1.phrases, result2.phrases);
  
  // Combine different similarity measures with weights
  // Weighted overlap gets highest weight as it considers term importance
  const combinedSimilarity = 
    weightedOverlap * 0.5 +    // Most important: weighted term overlap
    jaccardSim * 0.3 +         // Traditional set similarity
    phraseSim * 0.2;           // Phrase matching for context
  
  return Math.min(1.0, combinedSimilarity);
}

/**
 * Calculate weighted overlap similarity considering term importance
 */
function calculateWeightedOverlap(
  keywords1: Array<{ term: string; score: number }>,
  keywords2: Array<{ term: string; score: number }>
): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  // Create maps for quick lookup
  const map1 = new Map(keywords1.map(k => [k.term, k.score]));
  const map2 = new Map(keywords2.map(k => [k.term, k.score]));
  
  // Calculate weighted intersection
  let weightedIntersection = 0;
  let totalWeight1 = 0;
  let totalWeight2 = 0;
  
  // Sum weights for normalization
  for (const kw of keywords1) totalWeight1 += kw.score;
  for (const kw of keywords2) totalWeight2 += kw.score;
  
  // Calculate overlap with importance weighting
  for (const [term, score1] of map1) {
    if (map2.has(term)) {
      const score2 = map2.get(term)!;
      // Use geometric mean of scores for shared terms
      weightedIntersection += Math.sqrt(score1 * score2);
    }
  }
  
  // Normalize by average total weight
  const avgTotalWeight = (totalWeight1 + totalWeight2) / 2;
  return avgTotalWeight > 0 ? weightedIntersection / avgTotalWeight : 0;
}

/**
 * Traditional Jaccard similarity but with better normalization
 */
function calculateJaccardSimilarity(
  keywords1: Array<{ term: string; score: number }>,
  keywords2: Array<{ term: string; score: number }>
): number {
  const set1 = new Set(keywords1.map(k => k.term));
  const set2 = new Set(keywords2.map(k => k.term));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate similarity based on shared phrases
 */
function calculatePhraseSimilarity(
  phrases1: Keyword[],
  phrases2: Keyword[]
): number {
  if (phrases1.length === 0 || phrases2.length === 0) return 0;
  
  const set1 = new Set(phrases1.map(p => p.term));
  const set2 = new Set(phrases2.map(p => p.term));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  
  // For phrases, we use a more lenient calculation since phrase matches are very meaningful
  const maxPhrases = Math.max(phrases1.length, phrases2.length);
  return maxPhrases > 0 ? intersection.size / maxPhrases : 0;
}