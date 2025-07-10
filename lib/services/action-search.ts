import { eq, or, and, ilike, inArray, sql, desc } from "drizzle-orm";
import { actions, edges } from "../../db/schema";
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

    // Check if query is a UUID (action ID)
    const isUuidQuery = this.isValidUuid(query);
    if (isUuidQuery) {
      console.log(`[ActionSearchService] Detected UUID query, performing ID-based search for: ${query}`);
      return await this.performIdBasedSearch(query, limit);
    }

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
    const escapedQuery = this.escapePostgresPattern(query);
    console.log(`[ActionSearchService] Original query: "${query}", Escaped query: "${escapedQuery}"`);
    keywordConditions.push(
      or(
        ilike(actions.title, `%${escapedQuery}%`),
        ilike(actions.description, `%${escapedQuery}%`),
        ilike(actions.vision, `%${escapedQuery}%`)
      )
    );

    // Individual keyword searches
    for (const keyword of keywords) {
      const escapedKeyword = this.escapePostgresPattern(keyword);
      console.log(`[ActionSearchService] Original keyword: "${keyword}", Escaped keyword: "${escapedKeyword}"`);
      keywordConditions.push(
        or(
          ilike(actions.title, `%${escapedKeyword}%`),
          ilike(actions.description, `%${escapedKeyword}%`),
          ilike(actions.vision, `%${escapedKeyword}%`)
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
   * Escape special characters for PostgreSQL LIKE/ILIKE patterns
   * PostgreSQL treats %, _, and \ as special characters in LIKE patterns
   */
  private static escapePostgresPattern(pattern: string): string {
    const escaped = pattern
      .replace(/\\/g, '\\\\')  // Escape backslash first
      .replace(/%/g, '\\%')    // Escape percent
      .replace(/_/g, '\\_');   // Escape underscore
    
    console.log(`[ActionSearchService.escapePostgresPattern] Input: "${pattern}", Output: "${escaped}"`);
    return escaped;
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

  /**
   * Check if a string is a valid UUID format
   */
  private static isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Perform ID-based search that returns the target action and its relationship context
   */
  private static async performIdBasedSearch(
    actionId: string,
    limit: number
  ): Promise<SearchResponse> {
    const startTime = performance.now();
    
    try {
      const db = getDb();
      
      // Get the target action (including completed actions)
      const targetAction = await db
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
        .from(actions)
        .where(eq(actions.id, actionId))
        .limit(1);

      if (targetAction.length === 0) {
        return {
          results: [],
          totalMatches: 0,
          searchQuery: actionId,
          searchMode: 'id-based',
          metadata: {
            vectorMatches: 0,
            keywordMatches: 0,
            hybridMatches: 0,
            processingTimeMs: performance.now() - startTime,
            searchTimeMs: 0
          }
        };
      }

      const target = targetAction[0];
      const results: SearchResult[] = [];

      // Add the target action first
      results.push({
        id: target.id,
        title: target.data?.title || target.title || 'Untitled',
        description: target.data?.description || target.description,
        vision: target.data?.vision || target.vision,
        score: 1.0,
        matchType: 'keyword',
        keywordMatches: ['TARGET ACTION'],
        done: target.done || false,
        createdAt: target.createdAt?.toISOString(),
        updatedAt: target.updatedAt?.toISOString()
      });

      // Get actions that depend on this action (dependents)
      const dependentEdges = await db
        .select()
        .from(edges)
        .where(and(eq(edges.src, actionId), eq(edges.kind, "depends_on")));

      if (dependentEdges.length > 0) {
        const dependentIds = dependentEdges.map((edge: any) => edge.dst).filter(Boolean);
        const dependents = await db
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
          .from(actions)
          .where(inArray(actions.id, dependentIds));

        for (const dependent of dependents) {
          results.push({
            id: dependent.id,
            title: dependent.data?.title || dependent.title || 'Untitled',
            description: dependent.data?.description || dependent.description,
            vision: dependent.data?.vision || dependent.vision,
            score: 0.9,
            matchType: 'keyword',
            keywordMatches: ['DEPENDS ON TARGET'],
            done: dependent.done || false,
            createdAt: dependent.createdAt?.toISOString(),
            updatedAt: dependent.updatedAt?.toISOString()
          });
        }
      }

      // Get actions this action depends on (dependencies)
      const dependencyEdges = await db
        .select()
        .from(edges)
        .where(and(eq(edges.dst, actionId), eq(edges.kind, "depends_on")));

      if (dependencyEdges.length > 0) {
        const dependencyIds = dependencyEdges.map((edge: any) => edge.src).filter(Boolean);
        const dependencies = await db
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
          .from(actions)
          .where(inArray(actions.id, dependencyIds));

        for (const dependency of dependencies) {
          results.push({
            id: dependency.id,
            title: dependency.data?.title || dependency.title || 'Untitled',
            description: dependency.data?.description || dependency.description,
            vision: dependency.data?.vision || dependency.vision,
            score: 0.8,
            matchType: 'keyword',
            keywordMatches: ['TARGET DEPENDS ON'],
            done: dependency.done || false,
            createdAt: dependency.createdAt?.toISOString(),
            updatedAt: dependency.updatedAt?.toISOString()
          });
        }
      }

      // Get family members (parent and siblings)
      const familyEdges = await db
        .select()
        .from(edges)
        .where(and(eq(edges.dst, actionId), eq(edges.kind, "family")));

      if (familyEdges.length > 0) {
        const parentId = familyEdges[0].src;
        if (parentId) {
          // Add parent
          const parentActions = await db
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
            .from(actions)
            .where(eq(actions.id, parentId));

          if (parentActions.length > 0) {
            const parent = parentActions[0];
            results.push({
              id: parent.id,
              title: parent.data?.title || parent.title || 'Untitled',
              description: parent.data?.description || parent.description,
              vision: parent.data?.vision || parent.vision,
              score: 0.7,
              matchType: 'keyword',
              keywordMatches: ['PARENT'],
              done: parent.done || false,
              createdAt: parent.createdAt?.toISOString(),
              updatedAt: parent.updatedAt?.toISOString()
            });
          }

          // Add siblings
          const siblingEdges = await db
            .select()
            .from(edges)
            .where(and(eq(edges.src, parentId), eq(edges.kind, "family")));

          const siblingIds = siblingEdges
            .map((edge: any) => edge.dst)
            .filter((id: any) => id && id !== actionId);

          if (siblingIds.length > 0) {
            const siblings = await db
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
              .from(actions)
              .where(inArray(actions.id, siblingIds))
              .limit(5); // Limit siblings to avoid too many results

            for (const sibling of siblings) {
              results.push({
                id: sibling.id,
                title: sibling.data?.title || sibling.title || 'Untitled',
                description: sibling.data?.description || sibling.description,
                vision: sibling.data?.vision || sibling.vision,
                score: 0.6,
                matchType: 'keyword',
                keywordMatches: ['SIBLING'],
                done: sibling.done || false,
                createdAt: sibling.createdAt?.toISOString(),
                updatedAt: sibling.updatedAt?.toISOString()
              });
            }
          }
        }
      }

      // Get children
      const childEdges = await db
        .select()
        .from(edges)
        .where(and(eq(edges.src, actionId), eq(edges.kind, "family")));

      if (childEdges.length > 0) {
        const childIds = childEdges.map((edge: any) => edge.dst).filter(Boolean);
        const children = await db
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
          .from(actions)
          .where(inArray(actions.id, childIds))
          .limit(5); // Limit children to avoid too many results

        for (const child of children) {
          results.push({
            id: child.id,
            title: child.data?.title || child.title || 'Untitled',
            description: child.data?.description || child.description,
            vision: child.data?.vision || child.vision,
            score: 0.5,
            matchType: 'keyword',
            keywordMatches: ['CHILD'],
            done: child.done || false,
            createdAt: child.createdAt?.toISOString(),
            updatedAt: child.updatedAt?.toISOString()
          });
        }
      }

      // Limit total results and add hierarchy paths
      const limitedResults = results.slice(0, limit);
      const resultsWithPaths = await this.addHierarchyPaths(limitedResults);

      const totalProcessingTimeMs = performance.now() - startTime;

      console.log(`[ActionSearchService] ID-based search completed in ${totalProcessingTimeMs.toFixed(1)}ms`, {
        actionId,
        totalResults: resultsWithPaths.length,
        targetFound: resultsWithPaths.length > 0
      });

      return {
        results: resultsWithPaths,
        totalMatches: resultsWithPaths.length,
        searchQuery: actionId,
        searchMode: 'id-based',
        metadata: {
          vectorMatches: 0,
          keywordMatches: resultsWithPaths.length,
          hybridMatches: 0,
          processingTimeMs: totalProcessingTimeMs,
          searchTimeMs: totalProcessingTimeMs
        }
      };

    } catch (error) {
      console.error('[ActionSearchService] ID-based search failed:', error);
      throw new Error(`ID-based search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}