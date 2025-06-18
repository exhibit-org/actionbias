/**
 * Action Content Analysis Service
 * 
 * Coordinates text preprocessing and keyword extraction to provide structured
 * analysis of action content for intelligent hierarchy placement decisions.
 */

import { 
  preprocessActionText, 
  type ActionContent, 
  type PreprocessedText 
} from '../utils/text-processing';

import { 
  extractKeywordsAndPhrases, 
  calculateKeywordSimilarity,
  getImportantTerms,
  type KeywordExtractionResult,
  type Keyword,
  type ExtractionOptions 
} from '../utils/keyword-extraction';

/**
 * Comprehensive analysis result for action content
 */
export interface ActionAnalysisResult {
  /** Original action content being analyzed */
  action: ActionContent;
  
  /** Preprocessed text with tokens, normalization, etc. */
  preprocessed: PreprocessedText;
  
  /** Keyword and phrase extraction results */
  keywords: KeywordExtractionResult;
  
  /** Top terms for quick comparison (convenience) */
  importantTerms: string[];
  
  /** Analysis metadata and quality indicators */
  metadata: {
    /** Total content length (characters) */
    contentLength: number;
    
    /** Processing quality score (0-1, higher is better) */
    qualityScore: number;
    
    /** Whether action has sufficient content for analysis */
    hasSufficientContent: boolean;
    
    /** Timestamp when analysis was performed */
    analyzedAt: string;
    
    /** Analysis processing time in milliseconds */
    processingTime: number;
  };
}

/**
 * Options for content analysis
 */
export interface AnalysisOptions {
  /** Maximum number of keywords to extract */
  maxKeywords?: number;
  
  /** Maximum number of phrases to extract */
  maxPhrases?: number;
  
  /** Minimum content length required for full analysis */
  minContentLength?: number;
  
  /** Whether to remove stop words during preprocessing */
  removeStopWords?: boolean;
  
  /** Minimum token length for preprocessing */
  minTokenLength?: number;
  
  /** Keyword extraction scoring method */
  scoringMethod?: 'frequency' | 'tfidf' | 'weighted';
}

/**
 * Default analysis options
 */
const DEFAULT_ANALYSIS_OPTIONS: Required<AnalysisOptions> = {
  maxKeywords: 12,
  maxPhrases: 6,
  minContentLength: 10,
  removeStopWords: true,
  minTokenLength: 3,
  scoringMethod: 'weighted',
};

/**
 * Action content analysis service
 */
export class AnalysisService {
  /**
   * Perform comprehensive analysis of action content
   */
  static async analyzeAction(
    action: ActionContent, 
    options: AnalysisOptions = {}
  ): Promise<ActionAnalysisResult> {
    const startTime = Date.now();
    const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
    
    // Calculate content length
    const contentLength = this.calculateContentLength(action);
    
    // Check if content is sufficient for analysis
    const hasSufficientContent = contentLength >= opts.minContentLength;
    
    // Preprocess the text
    const preprocessed = preprocessActionText(action, {
      removeStopWords: opts.removeStopWords,
      minTokenLength: opts.minTokenLength,
    });
    
    // Extract keywords and phrases
    const keywords = extractKeywordsAndPhrases(action, {
      maxKeywords: opts.maxKeywords,
      maxPhrases: opts.maxPhrases,
      scoringMethod: opts.scoringMethod,
    });
    
    // Get important terms for quick comparison
    const importantTerms = getImportantTerms(action, Math.min(8, opts.maxKeywords));
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(preprocessed, keywords, contentLength);
    
    const processingTime = Date.now() - startTime;
    
    return {
      action,
      preprocessed,
      keywords,
      importantTerms,
      metadata: {
        contentLength,
        qualityScore,
        hasSufficientContent,
        analyzedAt: new Date().toISOString(),
        processingTime,
      },
    };
  }
  
  /**
   * Compare two actions based on their content similarity
   */
  static async compareActions(
    action1: ActionContent,
    action2: ActionContent,
    options: AnalysisOptions = {}
  ): Promise<{
    similarity: number;
    analysis1: ActionAnalysisResult;
    analysis2: ActionAnalysisResult;
    sharedTerms: string[];
    comparisonMetadata: {
      highSimilarity: boolean;
      moderateSimilarity: boolean;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    
    // Analyze both actions
    const [analysis1, analysis2] = await Promise.all([
      this.analyzeAction(action1, options),
      this.analyzeAction(action2, options)
    ]);
    
    // Calculate similarity using the keyword extraction utility
    const similarity = calculateKeywordSimilarity(action1, action2, options);
    
    // Find shared terms
    const terms1 = new Set(analysis1.importantTerms);
    const terms2 = new Set(analysis2.importantTerms);
    const sharedTerms = Array.from(terms1).filter(term => terms2.has(term));
    
    const processingTime = Date.now() - startTime;
    
    return {
      similarity,
      analysis1,
      analysis2,
      sharedTerms,
      comparisonMetadata: {
        highSimilarity: similarity >= 0.4,
        moderateSimilarity: similarity >= 0.2 && similarity < 0.4,
        processingTime,
      },
    };
  }
  
  /**
   * Batch analyze multiple actions for comparison
   */
  static async batchAnalyze(
    actions: ActionContent[],
    options: AnalysisOptions = {}
  ): Promise<{
    analyses: ActionAnalysisResult[];
    averageQuality: number;
    totalProcessingTime: number;
  }> {
    const startTime = Date.now();
    
    // Analyze all actions in parallel for better performance
    const analyses = await Promise.all(
      actions.map(action => this.analyzeAction(action, options))
    );
    
    const averageQuality = analyses.length > 0 
      ? analyses.reduce((sum, analysis) => sum + analysis.metadata.qualityScore, 0) / analyses.length
      : 0;
    
    const totalProcessingTime = Date.now() - startTime;
    
    return {
      analyses,
      averageQuality,
      totalProcessingTime,
    };
  }
  
  /**
   * Find the most similar action from a list
   */
  static async findMostSimilar(
    targetAction: ActionContent,
    candidateActions: ActionContent[],
    options: AnalysisOptions = {}
  ): Promise<{
    mostSimilar: ActionContent | null;
    similarity: number;
    targetAnalysis: ActionAnalysisResult;
    candidateAnalyses: ActionAnalysisResult[];
    rankings: Array<{
      action: ActionContent;
      similarity: number;
      analysis: ActionAnalysisResult;
    }>;
  }> {
    if (candidateActions.length === 0) {
      const targetAnalysis = await this.analyzeAction(targetAction, options);
      return {
        mostSimilar: null,
        similarity: 0,
        targetAnalysis,
        candidateAnalyses: [],
        rankings: [],
      };
    }
    
    // Analyze target action
    const targetAnalysis = await this.analyzeAction(targetAction, options);
    
    // Analyze all candidate actions
    const candidateAnalyses = await Promise.all(
      candidateActions.map(action => this.analyzeAction(action, options))
    );
    
    // Calculate similarities and create rankings
    const rankings = candidateActions.map((action, index) => ({
      action,
      similarity: calculateKeywordSimilarity(targetAction, action, options),
      analysis: candidateAnalyses[index],
    })).sort((a, b) => b.similarity - a.similarity);
    
    const mostSimilar = rankings.length > 0 ? rankings[0] : null;
    
    return {
      mostSimilar: mostSimilar?.action || null,
      similarity: mostSimilar?.similarity || 0,
      targetAnalysis,
      candidateAnalyses,
      rankings,
    };
  }
  
  /**
   * Calculate total content length for quality assessment
   */
  private static calculateContentLength(action: ActionContent): number {
    const title = action.title || '';
    const description = action.description || '';
    const vision = action.vision || '';
    
    return title.length + description.length + vision.length;
  }
  
  /**
   * Calculate content quality score (0-1)
   */
  private static calculateQualityScore(
    preprocessed: PreprocessedText,
    keywords: KeywordExtractionResult,
    contentLength: number
  ): number {
    let score = 0;
    
    // Content length factor (up to 0.3)
    const lengthScore = Math.min(contentLength / 200, 1) * 0.3;
    score += lengthScore;
    
    // Token diversity factor (up to 0.3)
    const totalTokens = keywords.metadata.totalTokens;
    const uniqueTokens = keywords.metadata.uniqueTokens;
    const diversityScore = totalTokens > 0 ? (uniqueTokens / totalTokens) * 0.3 : 0;
    score += diversityScore;
    
    // Meaningful keywords factor (up to 0.2)
    const keywordScore = Math.min(keywords.keywords.length / 8, 1) * 0.2;
    score += keywordScore;
    
    // Phrase extraction factor (up to 0.2)
    const phraseScore = Math.min(keywords.phrases.length / 4, 1) * 0.2;
    score += phraseScore;
    
    return Math.min(score, 1);
  }
}

/**
 * Convenience functions for common analysis tasks
 */

/**
 * Quick analysis for placement decisions - returns essential info only
 */
export async function quickAnalyze(action: ActionContent): Promise<{
  importantTerms: string[];
  qualityScore: number;
  hasSufficientContent: boolean;
}> {
  const analysis = await AnalysisService.analyzeAction(action, {
    maxKeywords: 8,
    maxPhrases: 3,
  });
  
  return {
    importantTerms: analysis.importantTerms,
    qualityScore: analysis.metadata.qualityScore,
    hasSufficientContent: analysis.metadata.hasSufficientContent,
  };
}

/**
 * Check if an action needs placement analysis
 */
export function needsPlacementAnalysis(action: ActionContent, parent_id?: string): boolean {
  // If no parent is specified, analysis is needed
  if (!parent_id) {
    return true;
  }
  
  // If content is very minimal, might need analysis anyway
  const contentLength = (action.title || '').length + 
                       (action.description || '').length + 
                       (action.vision || '').length;
  
  return contentLength < 20; // Very short content might indicate auto-placement need
}