import { eq, or, and, ilike, inArray, sql, desc } from "drizzle-orm";
import { actions } from "../../db/schema";
import { getDb } from "../db/adapter";
import { EmbeddingsService } from "./embeddings";
import { VectorService } from "./vector";
import { buildActionPath } from "../utils/path-builder";

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  score: number;
  matchType: 'vector' | 'keyword' | 'hybrid';
  similarity?: number; // For vector matches
  keywordMatches?: string[]; // For keyword matches
  hierarchyPath?: string[];
  depth?: number;
  done?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchOptions {
  limit?: number;
  similarityThreshold?: number;
  includeCompleted?: boolean;
  searchMode?: 'vector' | 'keyword' | 'hybrid';
  excludeIds?: string[];
  minKeywordLength?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalMatches: number;
  searchQuery: string;
  searchMode: string;
  metadata: {
    vectorMatches: number;
    keywordMatches: number;
    hybridMatches: number;
    processingTimeMs: number;
    embeddingTimeMs?: number;
    searchTimeMs: number;
    queryEmbeddingLength?: number;
  };
}

export class ActionSearchService {
  /**
   * Main search function that combines vector and keyword search
   */
  static async searchActions(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const startTime = performance.now();
    
    const {
      limit = 20,
      similarityThreshold = 0.3,
      includeCompleted = false,
      searchMode = 'hybrid',
      excludeIds = [],
      minKeywordLength = 2
    } = options;

    console.log(`[ActionSearchService] Starting ${searchMode} search for: "${query}"`);

    let vectorResults: SearchResult[] = [];
    let keywordResults: SearchResult[] = [];
    let embeddingTimeMs = 0;
    let searchTimeMs = 0;

    const searchStartTime = performance.now();

    try {
      // Vector search (semantic similarity)
      if (searchMode === 'vector' || searchMode === 'hybrid') {
        const embeddingStartTime = performance.now();
        
        try {
          const queryEmbedding = await EmbeddingsService.generateEmbedding({ title: query });
          embeddingTimeMs = performance.now() - embeddingStartTime;
          
          const vectorMatches = await VectorService.findSimilarActions(
            queryEmbedding,
            {
              limit: searchMode === 'hybrid' ? limit * 2 : limit, // Get more for hybrid to allow mixing
              threshold: similarityThreshold,
              excludeIds
            }
          );

          vectorResults = await this.convertVectorResultsToSearchResults(
            vectorMatches,
            'vector'
          );
        } catch (embeddingError) {
          console.warn('[ActionSearchService] Vector search failed, falling back to keyword-only:', embeddingError);
          embeddingTimeMs = performance.now() - embeddingStartTime;
        }
      }

      // Keyword search (exact phrase and partial matches)
      if (searchMode === 'keyword' || searchMode === 'hybrid') {
        keywordResults = await this.performKeywordSearch(
          query,
          {
            limit: searchMode === 'hybrid' ? limit * 2 : limit,
            includeCompleted,
            excludeIds,
            minKeywordLength
          }
        );
      }

      searchTimeMs = performance.now() - searchStartTime;

      // Combine and rank results
      const combinedResults = this.combineAndRankResults(
        vectorResults,
        keywordResults,
        query,
        searchMode,
        limit
      );

      // Add hierarchy paths for final results
      const finalResults = await this.addHierarchyPaths(combinedResults);

      const totalProcessingTimeMs = performance.now() - startTime;

      console.log(`[ActionSearchService] Search completed in ${totalProcessingTimeMs.toFixed(1)}ms`, {
        query: query.substring(0, 50),
        searchMode,
        vectorMatches: vectorResults.length,
        keywordMatches: keywordResults.length,
        finalResults: finalResults.length,
        embeddingTimeMs,
        searchTimeMs
      });

      return {
        results: finalResults,
        totalMatches: finalResults.length,
        searchQuery: query,
        searchMode,
        metadata: {
          vectorMatches: vectorResults.length,
          keywordMatches: keywordResults.length,
          hybridMatches: finalResults.filter(r => r.matchType === 'hybrid').length,
          processingTimeMs: totalProcessingTimeMs,
          embeddingTimeMs: embeddingTimeMs > 0 ? embeddingTimeMs : undefined,
          searchTimeMs,
          queryEmbeddingLength: vectorResults.length > 0 ? 1536 : undefined
        }
      };

    } catch (error) {
      console.error('[ActionSearchService] Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform keyword-based search using ILIKE for fuzzy matching
   */
  private static async performKeywordSearch(
    query: string,
    options: {
      limit: number;
      includeCompleted: boolean;
      excludeIds: string[];
      minKeywordLength: number;
    }
  ): Promise<SearchResult[]> {
    const { limit, includeCompleted, excludeIds, minKeywordLength } = options;
    
    // Extract keywords and create search patterns
    const keywords = this.extractKeywords(query, minKeywordLength);
    if (keywords.length === 0) {
      return [];
    }

    console.log(`[ActionSearchService] Keyword search for: ${keywords.join(', ')}`);

    const db = getDb();
    let dbQuery = db
      .select({
        id: actions.id,
        title: actions.title,
        description: actions.description,
        vision: actions.vision,
        done: actions.done,
        createdAt: actions.createdAt,
        updatedAt: actions.updatedAt,
        data: actions.data
      })
      .from(actions);

    // Build WHERE conditions
    const whereConditions = [];

    // Exclude completed actions if requested
    if (!includeCompleted) {
      whereConditions.push(eq(actions.done, false));
    }

    // Exclude specific IDs
    if (excludeIds.length > 0) {
      whereConditions.push(sql`${actions.id} NOT IN (${excludeIds.map(id => `'${id}'`).join(',')})`);
    }

    // Create keyword search conditions
    const keywordConditions = [];
    
    // Exact phrase search (highest priority)
    keywordConditions.push(
      or(
        ilike(actions.title, `%${query}%`),
        ilike(actions.description, `%${query}%`),
        ilike(actions.vision, `%${query}%`)
      )
    );

    // Individual keyword searches
    for (const keyword of keywords) {
      keywordConditions.push(
        or(
          ilike(actions.title, `%${keyword}%`),
          ilike(actions.description, `%${keyword}%`),
          ilike(actions.vision, `%${keyword}%`)
        )
      );
    }

    whereConditions.push(or(...keywordConditions));

    if (whereConditions.length > 0) {
      dbQuery = dbQuery.where(and(...whereConditions));
    }

    const results = await dbQuery
      .orderBy(desc(actions.updatedAt))
      .limit(limit);

    return results.map((action: any) => {
      const title = action.data?.title || action.title || 'Untitled';
      const description = action.data?.description || action.description;
      const vision = action.data?.vision || action.vision;
      
      // Calculate keyword match score and find matching keywords
      const { score, matches } = this.calculateKeywordScore(
        query,
        keywords,
        title,
        description,
        vision
      );

      return {
        id: action.id,
        title,
        description,
        vision,
        score,
        matchType: 'keyword' as const,
        keywordMatches: matches,
        done: action.done || false,
        createdAt: action.createdAt?.toISOString(),
        updatedAt: action.updatedAt?.toISOString()
      };
    });
  }

  /**
   * Extract meaningful keywords from search query
   */
  private static extractKeywords(query: string, minLength: number): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has',
      'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was',
      'will', 'with', 'action', 'task', 'todo', 'work', 'add', 'create', 'make'
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length >= minLength && !stopWords.has(word));
  }

  /**
   * Calculate keyword matching score and identify matching terms
   */
  private static calculateKeywordScore(
    originalQuery: string,
    keywords: string[],
    title: string,
    description?: string,
    vision?: string
  ): { score: number, matches: string[] } {
    const text = `${title} ${description || ''} ${vision || ''}`.toLowerCase();
    const queryLower = originalQuery.toLowerCase();
    
    let score = 0;
    const matches: string[] = [];

    // Exact phrase match (highest score)
    if (text.includes(queryLower)) {
      score += 1.0;
      matches.push(originalQuery);
    }

    // Individual keyword matches
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Higher score for title matches
        if (title.toLowerCase().includes(keyword)) {
          score += 0.3;
        } else {
          score += 0.1;
        }
        matches.push(keyword);
      }
    }

    return { score, matches: [...new Set(matches)] };
  }

  /**
   * Convert vector search results to SearchResult format
   */
  private static async convertVectorResultsToSearchResults(
    vectorMatches: any[],
    matchType: 'vector' | 'hybrid'
  ): Promise<SearchResult[]> {
    return vectorMatches.map(match => ({
      id: match.id,
      title: match.title || 'Untitled',
      description: match.description,
      vision: undefined, // VectorService doesn't return vision
      score: match.similarity,
      similarity: match.similarity,
      matchType,
      done: false, // VectorService only returns incomplete actions
      createdAt: undefined, // VectorService doesn't return timestamps
      updatedAt: undefined
    }));
  }

  /**
   * Combine and rank results from vector and keyword searches
   */
  private static combineAndRankResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    query: string,
    searchMode: string,
    limit: number
  ): SearchResult[] {
    if (searchMode === 'vector') {
      return vectorResults.slice(0, limit);
    }
    
    if (searchMode === 'keyword') {
      return keywordResults
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    // Hybrid mode: combine and deduplicate
    const resultMap = new Map<string, SearchResult>();
    
    // Add vector results
    for (const result of vectorResults) {
      resultMap.set(result.id, result);
    }
    
    // Add or merge keyword results
    for (const result of keywordResults) {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Merge results - this is a hybrid match
        resultMap.set(result.id, {
          ...existing,
          matchType: 'hybrid',
          score: Math.max(existing.score, result.score),
          keywordMatches: result.keywordMatches,
          // Keep the higher confidence data
          similarity: existing.similarity
        });
      } else {
        resultMap.set(result.id, result);
      }
    }

    // Sort by combined score (hybrid matches get boost)
    return Array.from(resultMap.values())
      .sort((a, b) => {
        // Boost hybrid matches
        const scoreA = a.matchType === 'hybrid' ? a.score * 1.2 : a.score;
        const scoreB = b.matchType === 'hybrid' ? b.score * 1.2 : b.score;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Add hierarchy paths to search results
   */
  private static async addHierarchyPaths(results: SearchResult[]): Promise<SearchResult[]> {
    const resultsWithPaths = await Promise.all(
      results.map(async (result) => {
        try {
          const pathResult = await buildActionPath(result.id);
          return {
            ...result,
            hierarchyPath: pathResult.titles,
            depth: Math.max(0, pathResult.titles.length - 1)
          };
        } catch (error) {
          console.warn(`[ActionSearchService] Failed to build path for ${result.id}:`, error);
          return {
            ...result,
            hierarchyPath: [result.title],
            depth: 0
          };
        }
      })
    );

    return resultsWithPaths;
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    if (partialQuery.length < 2) {
      return [];
    }

    const db = getDb();
    const results = await db
      .select({
        title: actions.title,
        data: actions.data
      })
      .from(actions)
      .where(
        or(
          ilike(actions.title, `${partialQuery}%`),
          ilike(actions.description, `%${partialQuery}%`)
        )
      )
      .limit(limit * 2); // Get more to filter duplicates

    const suggestions = new Set<string>();
    
    for (const result of results) {
      const title = result.data?.title || result.title || '';
      if (title.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(title);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }
}