/**
 * Vector-based family suggestion service
 * 
 * This service uses vector embeddings and similarity search to find potential family
 * actions for new actions. It generates embeddings for input content, performs K-NN
 * search using VectorService, and returns candidates with similarity scores and 
 * hierarchy paths.
 */

import { EmbeddingsService, type EmbeddingInput } from './embeddings';
import { VectorService, type VectorSearchOptions } from './vector';
import { ActionsService } from './actions';
import type { ActionMetadata } from '../types/resources';

export interface VectorFamilyCandidate {
  id: string;
  title: string;
  description?: string;
  similarity: number;
  hierarchyPath: string[];
  depth: number;
}

export interface VectorFamilySuggestionResult {
  candidates: VectorFamilyCandidate[];
  queryEmbedding: number[];
  totalProcessingTimeMs: number;
  searchTimeMs: number;
  embeddingTimeMs: number;
}

export interface VectorPlacementOptions {
  limit?: number;
  similarityThreshold?: number;
  excludeIds?: string[];
  includeHierarchyPaths?: boolean;
}

export class VectorPlacementService {
  /**
   * Find potential family actions using vector similarity search with improved family detection
   * 
   * This enhanced algorithm analyzes family commonality among similar actions to better
   * distinguish between sibling-level matches and true family candidates.
   * 
   * @param input - The action content to find families for
   * @param options - Search configuration options
   * @returns Vector-based family suggestions with similarity scores and hierarchy paths
   */
  static async findVectorFamilySuggestions(
    input: EmbeddingInput,
    options: VectorPlacementOptions = {}
  ): Promise<VectorFamilySuggestionResult> {
    const startTime = performance.now();
    
    const {
      limit = 15,
      similarityThreshold = 0.5,
      excludeIds = [],
      includeHierarchyPaths = true
    } = options;

    // Step 1: Generate embedding for input content
    const embeddingStartTime = performance.now();
    const queryEmbedding = await EmbeddingsService.generateEmbedding(input);
    const embeddingTimeMs = performance.now() - embeddingStartTime;

    // Step 2: Perform K-NN search using VectorService
    // Get more results to analyze parent patterns
    const searchStartTime = performance.now();
    const similarActions = await VectorService.findSimilarActions(queryEmbedding, {
      limit: Math.max(30, limit * 3), // Get more results to analyze parent patterns
      threshold: Math.max(0.3, similarityThreshold - 0.2), // Lower threshold to catch more potential siblings
      excludeIds
    });
    const searchTimeMs = performance.now() - searchStartTime;
    
    // Debug logging
    console.log('VectorPlacement debug:', {
      similarActionsType: typeof similarActions,
      similarActionsIsArray: Array.isArray(similarActions),
      similarActionsLength: similarActions?.length,
      similarActions: similarActions
    });

    // Step 3: Build hierarchy paths for similar actions
    let candidates: VectorFamilyCandidate[] = [];
    
    // Safety check: ensure similarActions is a valid array
    if (!Array.isArray(similarActions)) {
      console.error('VectorService.findSimilarActions returned non-array:', typeof similarActions, similarActions);
      return {
        candidates: [],
        queryEmbedding,
        totalProcessingTimeMs: performance.now() - startTime,
        searchTimeMs,
        embeddingTimeMs
      };
    }
    
    if (includeHierarchyPaths && similarActions.length > 0) {
      // Get all actions to build hierarchy paths (no limit/offset to get all actions)
      const allActions = await ActionsService.listActions({ limit: 10000 });
      const actionMap = new Map<string, any>();
      
      // Safety check: ensure allActions is an array
      if (Array.isArray(allActions)) {
        allActions.forEach((action: any) => {
          actionMap.set(action.id, action);
        });
      } else {
        console.error('ActionsService.listActions returned non-array:', typeof allActions, allActions);
      }

      // Build family relationships from edges table
      const familyMap = await this.buildFamilyMap();

      // Step 3: Analyze family frequency among similar actions
      const familyFrequency = new Map<string, number>();
      const familySimilarities = new Map<string, number[]>();
      
      // Count how often each family appears among similar actions
      similarActions.forEach(action => {
        const familyId = familyMap.get(action.id);
        if (familyId) {
          familyFrequency.set(familyId, (familyFrequency.get(familyId) || 0) + 1);
          
          // Track similarities of family members to help score the family
          if (!familySimilarities.has(familyId)) {
            familySimilarities.set(familyId, []);
          }
          familySimilarities.get(familyId)!.push(action.similarity);
        }
      });
      
      // Step 4: Build candidate list prioritizing common parents
      const familyCandidates: VectorFamilyCandidate[] = [];
      const siblingCandidates: VectorFamilyCandidate[] = [];
      
      // First, add frequently appearing families
      for (const [familyId, frequency] of familyFrequency.entries()) {
        const familyAction = actionMap.get(familyId);
        if (familyAction && frequency >= 2) { // Family appears at least twice
          const memberSimilarities = familySimilarities.get(familyId) || [];
          const avgMemberSimilarity = memberSimilarities.reduce((a, b) => a + b, 0) / memberSimilarities.length;
          
          // Calculate direct similarity between query and family if family has embedding
          let directFamilySimilarity = 0;
          const familyEmbedding = await this.getActionEmbedding(familyId);
          if (familyEmbedding && familyEmbedding.length === queryEmbedding.length) {
            directFamilySimilarity = this.cosineSimilarity(queryEmbedding, familyEmbedding);
          }
          
          // Score based on:
          // - Frequency of family among similar actions (30%)
          // - Average similarity of members (40%)
          // - Direct family-to-query similarity (30%)
          const familyScore = 
            (frequency / Math.min(10, similarActions.length)) * 0.3 + 
            avgMemberSimilarity * 0.4 +
            directFamilySimilarity * 0.3;
          
          const hierarchyPath = this.buildHierarchyPathFromEdges(familyId, actionMap, familyMap);
          familyCandidates.push({
            id: familyId,
            title: familyAction.title || familyAction.data?.title || 'Untitled',
            description: familyAction.description || familyAction.data?.description,
            similarity: familyScore,
            hierarchyPath,
            depth: hierarchyPath.length
          });
        }
      }
      
      // Sort family candidates by score
      familyCandidates.sort((a, b) => b.similarity - a.similarity);
      
      // Then add high-similarity individual actions that could also be families
      similarActions.forEach(similar => {
        // Skip if this action's family is already in family candidates
        const familyId = familyMap.get(similar.id);
        if (familyId && familyCandidates.some(f => f.id === familyId)) {
          return;
        }
        
        // Add high-similarity actions that might be good families themselves
        if (similar.similarity >= similarityThreshold) {
          const hierarchyPath = this.buildHierarchyPathFromEdges(similar.id, actionMap, familyMap);
          siblingCandidates.push({
            id: similar.id,
            title: similar.title,
            description: similar.description,
            similarity: similar.similarity,
            hierarchyPath,
            depth: hierarchyPath.length
          });
        }
      });
      
      // Combine results: families first, then siblings
      candidates = [
        ...familyCandidates.slice(0, Math.ceil(limit * 0.6)), // 60% family candidates
        ...siblingCandidates.slice(0, Math.floor(limit * 0.4)) // 40% sibling candidates
      ].slice(0, limit);
      
      console.log('Family frequency analysis:', {
        totalSimilarActions: similarActions.length,
        uniqueFamilies: familyFrequency.size,
        commonFamilies: Array.from(familyFrequency.entries())
          .filter(([_, freq]) => freq >= 2)
          .map(([id, freq]) => ({ id, frequency: freq })),
        familyCandidatesCount: familyCandidates.length,
        siblingCandidatesCount: siblingCandidates.length
      });
    } else {
      // Return simple candidates without hierarchy paths
      candidates = similarActions
        .slice(0, limit)
        .map(similar => ({
          id: similar.id,
          title: similar.title,
          description: similar.description,
          similarity: similar.similarity,
          hierarchyPath: [similar.title],
          depth: 1
        }));
    }

    const totalProcessingTimeMs = performance.now() - startTime;

    return {
      candidates,
      queryEmbedding,
      totalProcessingTimeMs,
      searchTimeMs,
      embeddingTimeMs
    };
  }

  /**
   * Build a map of member -> family relationships from the edges table
   * 
   * @returns Map of member action ID to family action ID
   */
  private static async buildFamilyMap(): Promise<Map<string, string>> {
    const { getDb } = await import('../db/adapter');
    const { edges } = await import('../../db/schema');
    const { eq, and } = await import('drizzle-orm');
    
    const familyEdges = await getDb()
      .select()
      .from(edges)
      .where(eq(edges.kind, "family"));
    
    const familyMap = new Map<string, string>();
    
    // Build family map from edges (edges with kind="family" have src=parent, dst=child)
    for (const edge of familyEdges) {
      if (edge.src && edge.dst) {
        familyMap.set(edge.dst, edge.src); // child -> parent mapping
      }
    }
    
    return familyMap;
  }

  /**
   * Build hierarchy path for an action using edges table for family relationships
   * 
   * @param actionId - The action ID to build path for
   * @param actionMap - Map of all actions for efficient lookup
   * @param familyMap - Map of member -> family relationships
   * @returns Array of action titles from root to the target action
   */
  private static buildHierarchyPathFromEdges(
    actionId: string,
    actionMap: Map<string, any>,
    familyMap: Map<string, string>
  ): string[] {
    const path: string[] = [];
    let currentId: string | undefined = actionId;
    
    const visited = new Set<string>(); // Prevent infinite loops
    
    // Build path from current action up to root
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      
      const currentAction = actionMap.get(currentId);
      if (!currentAction) {
        path.unshift('Unknown Action');
        break;
      }
      
      // Get title from either new column or data JSON
      const title = currentAction.title || currentAction.data?.title || 'Untitled';
      path.unshift(title);
      
      // Get family from family map
      currentId = familyMap.get(currentId);
    }

    return path.length > 0 ? path : ['Unknown Action'];
  }

  /**
   * Get family suggestions for a new action combining vector and LLM approaches
   * 
   * This method provides both vector-based similarity suggestions and traditional
   * LLM-based placement reasoning for comparison and validation.
   * 
   * @param input - The action content to find families for
   * @param options - Search configuration options
   * @returns Combined vector and LLM family suggestions
   */
  static async getHybridFamilySuggestions(
    input: EmbeddingInput,
    options: VectorPlacementOptions = {}
  ): Promise<{
    vectorSuggestions: VectorFamilySuggestionResult;
    // Future: Could add LLM suggestions here for comparison
    hybridScore?: number;
  }> {
    // Get vector-based suggestions
    const vectorSuggestions = await this.findVectorFamilySuggestions(input, options);

    return {
      vectorSuggestions
      // Future enhancement: combine with LLM-based suggestions
    };
  }

  /**
   * Get action embedding from database
   * Helper method to fetch stored embeddings for family context comparison
   * 
   * @param actionId - The action ID to get embedding for
   * @returns The embedding vector or null if not found
   */
  private static async getActionEmbedding(actionId: string): Promise<number[] | null> {
    const { getDb } = await import('../db/adapter');
    const { actions } = await import('../../db/schema');
    const { eq } = await import('drizzle-orm');
    
    const result = await getDb()
      .select({ embeddingVector: actions.embeddingVector })
      .from(actions)
      .where(eq(actions.id, actionId))
      .limit(1);
    
    if (result.length > 0 && result[0].embeddingVector) {
      // The embedding vector might already be an array or a string representation
      const embedding = result[0].embeddingVector;
      
      if (Array.isArray(embedding)) {
        return embedding;
      }
      
      // Convert from database vector string format to number array
      const vectorStr = embedding.toString();
      const matches = vectorStr.match(/[\d.-]+/g);
      if (matches) {
        return matches.map((n: string) => parseFloat(n));
      }
    }
    
    return null;
  }

  /**
   * Calculate cosine similarity between two vectors
   * 
   * @param a - First vector
   * @param b - Second vector
   * @returns Cosine similarity score between 0 and 1
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Analyze vector similarity patterns in the action hierarchy
   * Used for debugging and optimization of vector search parameters
   * 
   * @param sampleSize - Number of random actions to analyze
   * @returns Analysis of similarity patterns and thresholds
   */
  static async analyzeVectorSimilarityPatterns(sampleSize: number = 20): Promise<{
    averageSimilarityScores: number[];
    recommendedThreshold: number;
    clusteringQuality: number;
  }> {
    // This is a placeholder for future analytics functionality
    // Could be used to optimize similarity thresholds and understand
    // how well the vector space represents the action hierarchy
    
    return {
      averageSimilarityScores: [],
      recommendedThreshold: 0.5,
      clusteringQuality: 0.0
    };
  }
}