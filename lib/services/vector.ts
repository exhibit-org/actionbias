/**
 * Vector similarity service for semantic action management
 * 
 * This service provides utilities for vector operations including similarity search,
 * embedding management, and efficient querying of the pgvector-indexed embedding_vector column.
 */

import { getDb } from '../db/adapter';
import { actions } from '../../db/schema';
import { sql, eq } from 'drizzle-orm';

export interface SimilarityResult {
  id: string;
  title: string;
  description?: string;
  similarity: number;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  excludeIds?: string[];
}

export class VectorService {
  /**
   * Find actions similar to a given embedding vector
   * Uses cosine similarity with the IVFFLAT index for fast search
   */
  static async findSimilarActions(
    embeddingVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const { limit = 10, threshold = 0.7, excludeIds = [] } = options;
    
    const db = getDb();
    
    // Convert embedding to vector format
    const vectorString = `[${embeddingVector.join(',')}]`;
    
    // Build exclusion condition
    const exclusionCondition = excludeIds.length > 0 
      ? sql`AND ${actions.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`
      : sql``;
    
    const results = await db.execute(sql`
      SELECT 
        ${actions.id},
        ${actions.data}->>'title' as title,
        ${actions.data}->>'description' as description,
        1 - (${actions.embeddingVector} <=> ${sql.raw(`'${vectorString}'::vector`)}) as similarity
      FROM ${actions}
      WHERE ${actions.embeddingVector} IS NOT NULL
        AND 1 - (${actions.embeddingVector} <=> ${sql.raw(`'${vectorString}'::vector`)}) >= ${threshold}
        AND ${actions.done} = false
        ${exclusionCondition}
      ORDER BY ${actions.embeddingVector} <=> ${sql.raw(`'${vectorString}'::vector`)}
      LIMIT ${limit}
    `);
    
    // Debug logging to identify result format
    console.log('VectorService.findSimilarActions debug:', {
      resultsType: typeof results,
      resultsKeys: Object.keys(results || {}),
      hasRows: 'rows' in (results || {}),
      resultsLength: results?.length,
      results: results
    });
    
    // Handle different database result formats
    let rows: any[] = [];
    if (results.rows && Array.isArray(results.rows)) {
      rows = results.rows;
    } else if (Array.isArray(results)) {
      rows = results;
    } else {
      console.error('Unexpected database result format:', typeof results, results);
      return [];
    }
    
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      similarity: parseFloat(row.similarity)
    }));
  }

  /**
   * Update the embedding vector for an action
   */
  static async updateEmbedding(actionId: string, embeddingVector: number[]): Promise<void> {
    const db = getDb();
    
    try {
      // Convert embedding to vector format string
      const vectorString = `[${embeddingVector.join(',')}]`;
      
      // Use parameterized query to safely pass the vector string
      await db.execute(sql`
        UPDATE ${actions}
        SET embedding_vector = ${vectorString}::vector,
            updated_at = NOW()
        WHERE id = ${actionId}
      `);
      
      console.log(`Successfully stored embedding for action ${actionId}`);
    } catch (error) {
      console.error(`Failed to store embedding for action ${actionId}:`, error);
      throw error;
    }
  }

  /**
   * Get actions that don't have embeddings yet (for batch processing)
   */
  static async getActionsWithoutEmbeddings(limit: number = 100): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    vision?: string;
  }>> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        ${actions.id},
        ${actions.data}->>'title' as title,
        ${actions.data}->>'description' as description,
        ${actions.data}->>'vision' as vision
      FROM ${actions}
      WHERE ${actions.embeddingVector} IS NULL
        AND ${actions.data}->>'title' IS NOT NULL
      ORDER BY ${actions.createdAt} DESC
      LIMIT ${limit}
    `);
    
    // Handle different database result formats
    // The query returns a result object that contains the data but isn't a plain array
    // Based on the logs, we know it has 50 items, so let's extract them properly
    let rows: any[] = [];
    
    try {
      if (Array.isArray(results)) {
        rows = results;
      } else if (results.rows && Array.isArray(results.rows)) {
        rows = results.rows;
      } else if (results && typeof results[Symbol.iterator] === 'function') {
        // Handle array-like objects by converting to array
        rows = [...results];
      } else if (results && results.length !== undefined) {
        // Handle array-like objects with length property
        rows = Array.prototype.slice.call(results);
      } else {
        console.error('Database query returned unexpected format:', typeof results, Object.keys(results || {}));
        return [];
      }
      
      console.log(`Successfully extracted ${rows.length} rows from database results`);
    } catch (error) {
      console.error('Error extracting rows from database results:', error);
      return [];
    }
    
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      vision: row.vision || undefined
    }));
  }

  /**
   * Get embedding statistics for monitoring
   */
  static async getEmbeddingStats(): Promise<{
    totalActions: number;
    actionsWithEmbeddings: number;
    actionsWithoutEmbeddings: number;
    coveragePercentage: number;
  }> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(${actions.embeddingVector}) as actions_with_embeddings,
        COUNT(*) - COUNT(${actions.embeddingVector}) as actions_without_embeddings
      FROM ${actions}
    `);
    
    // Handle different database result formats
    const rows = results.rows || results;
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('No results from embedding stats query:', results);
      return {
        totalActions: 0,
        actionsWithEmbeddings: 0,
        actionsWithoutEmbeddings: 0,
        coveragePercentage: 0
      };
    }
    
    const row = rows[0] as any;
    const totalActions = parseInt(row.total_actions);
    const actionsWithEmbeddings = parseInt(row.actions_with_embeddings);
    const actionsWithoutEmbeddings = parseInt(row.actions_without_embeddings);
    
    return {
      totalActions,
      actionsWithEmbeddings,
      actionsWithoutEmbeddings,
      coveragePercentage: totalActions > 0 ? (actionsWithEmbeddings / totalActions) * 100 : 0
    };
  }

  /**
   * Test vector index performance
   * Returns query execution time for similarity search
   */
  static async testIndexPerformance(embeddingVector: number[]): Promise<{
    executionTimeMs: number;
    resultCount: number;
  }> {
    const startTime = performance.now();
    
    const results = await this.findSimilarActions(embeddingVector, {
      limit: 50,
      threshold: 0.5
    });
    
    const executionTimeMs = performance.now() - startTime;
    
    return {
      executionTimeMs,
      resultCount: results.length
    };
  }
}