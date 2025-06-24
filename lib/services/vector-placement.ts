/**
 * Vector-based parent suggestion service
 * 
 * This service uses vector embeddings and similarity search to find potential parent
 * actions for new actions. It generates embeddings for input content, performs K-NN
 * search using VectorService, and returns candidates with similarity scores and 
 * hierarchy paths.
 */

import { EmbeddingsService, type EmbeddingInput } from './embeddings';
import { VectorService, type VectorSearchOptions } from './vector';
import { ActionsService } from './actions';
import type { ActionMetadata } from '../types/resources';

export interface VectorParentCandidate {
  id: string;
  title: string;
  description?: string;
  similarity: number;
  hierarchyPath: string[];
  depth: number;
}

export interface VectorParentSuggestionResult {
  candidates: VectorParentCandidate[];
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
   * Find potential parent actions using vector similarity search with improved parent detection
   * 
   * This enhanced algorithm analyzes parent commonality among similar actions to better
   * distinguish between sibling-level matches and true parent candidates.
   * 
   * @param input - The action content to find parents for
   * @param options - Search configuration options
   * @returns Vector-based parent suggestions with similarity scores and hierarchy paths
   */
  static async findVectorParentSuggestions(
    input: EmbeddingInput,
    options: VectorPlacementOptions = {}
  ): Promise<VectorParentSuggestionResult> {
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
    let candidates: VectorParentCandidate[] = [];
    
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

      // Build parent relationships from edges table
      const parentMap = await this.buildParentMap();

      // Step 3: Analyze parent frequency among similar actions
      const parentFrequency = new Map<string, number>();
      const parentSimilarities = new Map<string, number[]>();
      
      // Count how often each parent appears among similar actions
      similarActions.forEach(action => {
        const parentId = parentMap.get(action.id);
        if (parentId) {
          parentFrequency.set(parentId, (parentFrequency.get(parentId) || 0) + 1);
          
          // Track similarities of children to help score the parent
          if (!parentSimilarities.has(parentId)) {
            parentSimilarities.set(parentId, []);
          }
          parentSimilarities.get(parentId)!.push(action.similarity);
        }
      });
      
      // Step 4: Build candidate list prioritizing common parents
      const parentCandidates: VectorParentCandidate[] = [];
      const siblingCandidates: VectorParentCandidate[] = [];
      
      // First, add frequently appearing parents
      for (const [parentId, frequency] of parentFrequency.entries()) {
        const parentAction = actionMap.get(parentId);
        if (parentAction && frequency >= 2) { // Parent appears at least twice
          const childSimilarities = parentSimilarities.get(parentId) || [];
          const avgChildSimilarity = childSimilarities.reduce((a, b) => a + b, 0) / childSimilarities.length;
          
          // Calculate direct similarity between query and parent if parent has embedding
          let directParentSimilarity = 0;
          const parentEmbedding = await this.getActionEmbedding(parentId);
          if (parentEmbedding && parentEmbedding.length === queryEmbedding.length) {
            directParentSimilarity = this.cosineSimilarity(queryEmbedding, parentEmbedding);
          }
          
          // Score based on:
          // - Frequency of parent among similar actions (30%)
          // - Average similarity of children (40%)
          // - Direct parent-to-query similarity (30%)
          const parentScore = 
            (frequency / Math.min(10, similarActions.length)) * 0.3 + 
            avgChildSimilarity * 0.4 +
            directParentSimilarity * 0.3;
          
          const hierarchyPath = this.buildHierarchyPathFromEdges(parentId, actionMap, parentMap);
          parentCandidates.push({
            id: parentId,
            title: parentAction.title || parentAction.data?.title || 'Untitled',
            description: parentAction.description || parentAction.data?.description,
            similarity: parentScore,
            hierarchyPath,
            depth: hierarchyPath.length
          });
        }
      }
      
      // Sort parent candidates by score
      parentCandidates.sort((a, b) => b.similarity - a.similarity);
      
      // Then add high-similarity individual actions that could also be parents
      similarActions.forEach(similar => {
        // Skip if this action's parent is already in parent candidates
        const parentId = parentMap.get(similar.id);
        if (parentId && parentCandidates.some(p => p.id === parentId)) {
          return;
        }
        
        // Add high-similarity actions that might be good parents themselves
        if (similar.similarity >= similarityThreshold) {
          const hierarchyPath = this.buildHierarchyPathFromEdges(similar.id, actionMap, parentMap);
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
      
      // Combine results: parents first, then siblings
      candidates = [
        ...parentCandidates.slice(0, Math.ceil(limit * 0.6)), // 60% parent candidates
        ...siblingCandidates.slice(0, Math.floor(limit * 0.4)) // 40% sibling candidates
      ].slice(0, limit);
      
      console.log('Parent frequency analysis:', {
        totalSimilarActions: similarActions.length,
        uniqueParents: parentFrequency.size,
        commonParents: Array.from(parentFrequency.entries())
          .filter(([_, freq]) => freq >= 2)
          .map(([id, freq]) => ({ id, frequency: freq })),
        parentCandidatesCount: parentCandidates.length,
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
   * Build a map of child -> parent relationships from the edges table
   * 
   * @returns Map of child action ID to parent action ID
   */
  private static async buildParentMap(): Promise<Map<string, string>> {
    const { getDb } = await import('../db/adapter');
    const { edges } = await import('../../db/schema');
    const { eq, and } = await import('drizzle-orm');
    
    const parentEdges = await getDb()
      .select()
      .from(edges)
      .where(eq(edges.kind, "child"));
    
    const parentMap = new Map<string, string>();
    
    // Build parent map from edges (edges are src=parent, dst=child for "child" kind)
    for (const edge of parentEdges) {
      if (edge.src && edge.dst) {
        parentMap.set(edge.dst, edge.src); // child -> parent
      }
    }
    
    return parentMap;
  }

  /**
   * Build hierarchy path for an action using edges table for parent relationships
   * 
   * @param actionId - The action ID to build path for
   * @param actionMap - Map of all actions for efficient lookup
   * @param parentMap - Map of child -> parent relationships
   * @returns Array of action titles from root to the target action
   */
  private static buildHierarchyPathFromEdges(
    actionId: string,
    actionMap: Map<string, any>,
    parentMap: Map<string, string>
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
      
      // Get parent from parent map
      currentId = parentMap.get(currentId);
    }

    return path.length > 0 ? path : ['Unknown Action'];
  }

  /**
   * Get parent suggestions for a new action combining vector and LLM approaches
   * 
   * This method provides both vector-based similarity suggestions and traditional
   * LLM-based placement reasoning for comparison and validation.
   * 
   * @param input - The action content to find parents for
   * @param options - Search configuration options
   * @returns Combined vector and LLM parent suggestions
   */
  static async getHybridParentSuggestions(
    input: EmbeddingInput,
    options: VectorPlacementOptions = {}
  ): Promise<{
    vectorSuggestions: VectorParentSuggestionResult;
    // Future: Could add LLM suggestions here for comparison
    hybridScore?: number;
  }> {
    // Get vector-based suggestions
    const vectorSuggestions = await this.findVectorParentSuggestions(input, options);

    return {
      vectorSuggestions
      // Future enhancement: combine with LLM-based suggestions
    };
  }

  /**
   * Get action embedding from database
   * Helper method to fetch stored embeddings for parent context comparison
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