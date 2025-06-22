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
   * Find potential parent actions using vector similarity search
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
    const searchStartTime = performance.now();
    const similarActions = await VectorService.findSimilarActions(queryEmbedding, {
      limit: limit * 2, // Get more results to account for filtering
      threshold: similarityThreshold,
      excludeIds
    });
    const searchTimeMs = performance.now() - searchStartTime;

    // Step 3: Build hierarchy paths for similar actions
    let candidates: VectorParentCandidate[] = [];
    
    if (includeHierarchyPaths && similarActions.length > 0) {
      // Get all actions to build hierarchy paths
      const allActions = await ActionsService.listActions({});
      const actionMap = new Map<string, any>();
      
      allActions.forEach((action: any) => {
        actionMap.set(action.id, action);
      });

      // Build parent relationships from edges table
      const parentMap = await this.buildParentMap();

      // Build candidates with hierarchy paths
      candidates = similarActions
        .slice(0, limit) // Limit to requested number
        .map(similar => {
          const hierarchyPath = this.buildHierarchyPathFromEdges(similar.id, actionMap, parentMap);
          return {
            id: similar.id,
            title: similar.title,
            description: similar.description,
            similarity: similar.similarity,
            hierarchyPath,
            depth: hierarchyPath.length
          };
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