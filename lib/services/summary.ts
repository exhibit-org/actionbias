/**
 * Summary generation service for action management
 * 
 * This service provides utilities for generating concise node summaries
 * using the Vercel AI SDK to create human-readable action descriptions.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDb } from '../db/adapter';
import { actions } from '../../db/schema';
import { sql } from 'drizzle-orm';

export interface SummaryInput {
  title: string;
  description?: string;
  vision?: string;
}

export class SummaryService {
  /**
   * Generate a concise node summary for an action
   * Target: < 25 tokens, captures action's essence
   */
  static async generateNodeSummary(input: SummaryInput): Promise<string> {
    // Return dummy summary for tests or when no API key
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      return `${input.title.toLowerCase().replace(/\s+/g, '-')} task summary`;
    }

    try {
      const text = this.prepareTextForSummary(input);
      
      const { text: summary } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt: `Generate a concise one-sentence summary (under 25 tokens) that captures the essence of this action:

Title: ${input.title}
${input.description ? `Description: ${input.description}` : ''}
${input.vision ? `Vision: ${input.vision}` : ''}

Summary should be actionable and clear. Focus on what needs to be done, not why.`,
        maxTokens: 30,
        temperature: 0.3,
      });

      return summary.trim();
    } catch (error) {
      console.error('Failed to generate node summary:', error);
      // Fallback to title-based summary
      return `${input.title.split(' ').slice(0, 8).join(' ')}`;
    }
  }

  /**
   * Generate batch node summaries for multiple actions
   */
  static async generateBatchNodeSummaries(inputs: Array<{
    id: string;
    title: string;
    description?: string;
    vision?: string;
  }>): Promise<Array<{ id: string; summary: string }>> {
    const results: Array<{ id: string; summary: string }> = [];
    
    // Process in batches of 5 to avoid API rate limits
    for (let i = 0; i < inputs.length; i += 5) {
      const batch = inputs.slice(i, i + 5);
      const batchPromises = batch.map(async (input) => {
        const summary = await this.generateNodeSummary({
          title: input.title,
          description: input.description,
          vision: input.vision
        });
        return { id: input.id, summary };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + 5 < inputs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Update the node summary for an action
   */
  static async updateNodeSummary(actionId: string, summary: string): Promise<void> {
    const db = getDb();
    
    try {
      await db.execute(sql`
        UPDATE ${actions}
        SET node_summary = ${summary},
            updated_at = NOW()
        WHERE id = ${actionId}
      `);
      
      console.log(`Successfully stored node summary for action ${actionId}`);
    } catch (error) {
      console.error(`Failed to store node summary for action ${actionId}:`, error);
      throw error;
    }
  }

  /**
   * Get actions that don't have node summaries yet (for batch processing)
   */
  static async getActionsWithoutNodeSummaries(limit: number = 100): Promise<Array<{
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
      WHERE ${actions.nodeSummary} IS NULL
        AND ${actions.data}->>'title' IS NOT NULL
      ORDER BY ${actions.createdAt} DESC
      LIMIT ${limit}
    `);
    
    // Handle different database result formats
    let rows: any[] = [];
    
    try {
      if (Array.isArray(results)) {
        rows = results;
      } else if (results.rows && Array.isArray(results.rows)) {
        rows = results.rows;
      } else if (results && typeof results[Symbol.iterator] === 'function') {
        rows = [...results];
      } else if (results && results.length !== undefined) {
        rows = Array.prototype.slice.call(results);
      } else {
        console.error('Database query returned unexpected format:', typeof results, Object.keys(results || {}));
        return [];
      }
      
      console.log(`Successfully extracted ${rows.length} actions without node summaries`);
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
   * Get node summary statistics for monitoring
   */
  static async getNodeSummaryStats(): Promise<{
    totalActions: number;
    actionsWithNodeSummaries: number;
    actionsWithoutNodeSummaries: number;
    coveragePercentage: number;
  }> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(${actions.nodeSummary}) as actions_with_node_summaries,
        COUNT(*) - COUNT(${actions.nodeSummary}) as actions_without_node_summaries
      FROM ${actions}
    `);
    
    // Handle different database result formats
    const rows = results.rows || results;
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('No results from node summary stats query:', results);
      return {
        totalActions: 0,
        actionsWithNodeSummaries: 0,
        actionsWithoutNodeSummaries: 0,
        coveragePercentage: 0
      };
    }
    
    const row = rows[0] as any;
    const totalActions = parseInt(row.total_actions);
    const actionsWithNodeSummaries = parseInt(row.actions_with_node_summaries);
    const actionsWithoutNodeSummaries = parseInt(row.actions_without_node_summaries);
    
    return {
      totalActions,
      actionsWithNodeSummaries,
      actionsWithoutNodeSummaries,
      coveragePercentage: totalActions > 0 ? (actionsWithNodeSummaries / totalActions) * 100 : 0
    };
  }

  /**
   * Prepare text input for summary generation
   */
  private static prepareTextForSummary(input: SummaryInput): string {
    const parts = [input.title];
    
    if (input.description) {
      parts.push(input.description);
    }
    
    if (input.vision) {
      parts.push(input.vision);
    }
    
    return parts.join(' ').slice(0, 1000); // Limit input length
  }
}