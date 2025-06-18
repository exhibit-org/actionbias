/**
 * Text extraction and preprocessing utilities for action content analysis
 */

export interface ActionContent {
  title: string;
  description?: string;
  vision?: string;
}

export interface ExtractedText {
  title: string;
  description: string;
  vision: string;
  combined: string;
}

export interface PreprocessedText {
  original: ExtractedText;
  normalized: ExtractedText;
  cleaned: ExtractedText;
  tokens: {
    title: string[];
    description: string[];
    vision: string[];
    combined: string[];
  };
}

/**
 * Common English stop words to remove during preprocessing
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to',
  'was', 'will', 'with', 'would', 'could', 'should', 'have', 'had', 'can',
  'may', 'this', 'these', 'those', 'they', 'them', 'their', 'we', 'our',
  'you', 'your', 'i', 'my', 'me', 'am', 'do', 'does', 'did', 'get', 'got',
  'all', 'any', 'but', 'if', 'not', 'or', 'so', 'when', 'where', 'who',
  'what', 'how', 'up', 'out', 'down', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'than', 'too', 'very', 'own', 'same', 'few',
  'more', 'most', 'other', 'some', 'such', 'only', 'just', 'now', 'here',
  'there', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'both', 'each', 'either', 'neither', 'against'
]);

/**
 * Extract text content from action data
 */
export function extractText(action: ActionContent): ExtractedText {
  const title = action.title || '';
  const description = action.description || '';
  const vision = action.vision || '';
  
  return {
    title,
    description,
    vision,
    combined: [title, description, vision].filter(Boolean).join(' ')
  };
}

/**
 * Normalize text by converting to lowercase and handling unicode
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .trim();
}

/**
 * Clean text by removing special characters and extra whitespace
 */
export function cleanText(text: string): string {
  return text
    .replace(/[^\w\s-]/g, ' ') // Replace non-word chars (except hyphens) with spaces
    .replace(/[-_]+/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Tokenize text into individual words
 */
export function tokenizeText(text: string): string[] {
  if (!text.trim()) {
    return [];
  }
  
  return text
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Remove stop words from token array
 */
export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter(token => !STOP_WORDS.has(token.toLowerCase()));
}

/**
 * Filter tokens by minimum length to remove very short words
 */
export function filterByLength(tokens: string[], minLength: number = 2): string[] {
  return tokens.filter(token => token.length >= minLength);
}

/**
 * Full preprocessing pipeline for a single text string
 */
export function preprocessSingleText(text: string, options: {
  removeStopWords?: boolean;
  minTokenLength?: number;
} = {}): {
  original: string;
  normalized: string;
  cleaned: string;
  tokens: string[];
} {
  const { removeStopWords: shouldRemoveStopWords = true, minTokenLength = 2 } = options;
  
  const normalized = normalizeText(text);
  const cleaned = cleanText(normalized);
  let tokens = tokenizeText(cleaned);
  
  if (shouldRemoveStopWords) {
    tokens = removeStopWords(tokens);
  }
  
  tokens = filterByLength(tokens, minTokenLength);
  
  return {
    original: text,
    normalized,
    cleaned,
    tokens
  };
}

/**
 * Complete text extraction and preprocessing pipeline for action content
 */
export function preprocessActionText(
  action: ActionContent,
  options: {
    removeStopWords?: boolean;
    minTokenLength?: number;
  } = {}
): PreprocessedText {
  // Extract text content
  const extracted = extractText(action);
  
  // Preprocess each text field
  const titleProcessed = preprocessSingleText(extracted.title, options);
  const descriptionProcessed = preprocessSingleText(extracted.description, options);
  const visionProcessed = preprocessSingleText(extracted.vision, options);
  const combinedProcessed = preprocessSingleText(extracted.combined, options);
  
  return {
    original: extracted,
    normalized: {
      title: titleProcessed.normalized,
      description: descriptionProcessed.normalized,
      vision: visionProcessed.normalized,
      combined: combinedProcessed.normalized
    },
    cleaned: {
      title: titleProcessed.cleaned,
      description: descriptionProcessed.cleaned,
      vision: visionProcessed.cleaned,
      combined: combinedProcessed.cleaned
    },
    tokens: {
      title: titleProcessed.tokens,
      description: descriptionProcessed.tokens,
      vision: visionProcessed.tokens,
      combined: combinedProcessed.tokens
    }
  };
}

/**
 * Get all unique tokens from preprocessed action text
 */
export function getAllTokens(preprocessed: PreprocessedText): string[] {
  const allTokens = [
    ...preprocessed.tokens.title,
    ...preprocessed.tokens.description,
    ...preprocessed.tokens.vision
  ];
  
  return Array.from(new Set(allTokens));
}

/**
 * Calculate token frequency in preprocessed text
 */
export function getTokenFrequency(preprocessed: PreprocessedText): Map<string, number> {
  const frequency = new Map<string, number>();
  
  // Count tokens from all fields (including duplicates)
  const allTokens = [
    ...preprocessed.tokens.title,
    ...preprocessed.tokens.description,
    ...preprocessed.tokens.vision
  ];
  
  for (const token of allTokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }
  
  return frequency;
}

/**
 * Get the most frequent tokens (simple keyword extraction)
 */
export function getTopTokens(
  preprocessed: PreprocessedText,
  limit: number = 10
): Array<{ token: string; frequency: number }> {
  const frequency = getTokenFrequency(preprocessed);
  
  return Array.from(frequency.entries())
    .map(([token, freq]) => ({ token, frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}