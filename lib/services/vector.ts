/**
 * Vector similarity service for semantic action management
 * 
 * This service provides utilities for vector operations including similarity search,
 * embedding management, and efficient querying of the pgvector-indexed embedding_vector column.
 */

import { getDb } from '../db/adapter';
import { actions } from '../../db/schema';
import { sql } from 'drizzle-orm';

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
        ${exclusionCondition}
      ORDER BY ${actions.embeddingVector} <=> ${sql.raw(`'${vectorString}'::vector`)}
      LIMIT ${limit}
    `);
    
    return results.rows.map((row: any) => ({
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
    
    // Convert embedding to vector format
    const vectorString = `[${embeddingVector.join(',')}]`;
    
    await db.execute(sql`
      UPDATE ${actions}
      SET ${actions.embeddingVector} = ${sql.raw(`'${vectorString}'::vector`)},
          ${actions.updatedAt} = NOW()
      WHERE ${actions.id} = ${actionId}
    `);
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
    const rows = results.rows || results;
    if (!Array.isArray(rows)) {
      console.error('Database query returned unexpected format:', results);
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
    
    const row = results.rows[0] as any;
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