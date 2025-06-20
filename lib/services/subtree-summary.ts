/**
 * Subtree summary generation service for hierarchical action management
 * 
 * This service generates AI-powered summaries that describe what a parent action
 * encompasses based on its children's titles, descriptions, and current status.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDb } from '../db/adapter';
import { actions, edges } from '../../db/schema';
import { sql, eq, and } from 'drizzle-orm';

export interface SubtreeSummaryInput {
  actionId: string;
  title: string;
  description?: string;
  children: Array<{
    title: string;
    description?: string;
    done: boolean;
  }>;
}

export class SubtreeSummaryService {
  /**
   * Generate a subtree summary that describes what this action encompasses
   * based on its children's scope and purpose
   */
  static async generateSubtreeSummary(input: SubtreeSummaryInput): Promise<string> {
    // Return dummy summary for tests or when no API key
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      const childCount = input.children.length;
      return `Contains ${childCount} ${childCount === 1 ? 'action' : 'actions'} related to ${input.title.toLowerCase()}`;
    }

    // If no children, return a simple summary
    if (input.children.length === 0) {
      return `${input.title} - a standalone action with no sub-tasks`;
    }

    try {
      const completedCount = input.children.filter(child => child.done).length;
      const totalCount = input.children.length;
      
      const childrenText = input.children
        .map(child => `- ${child.title}${child.done ? ' ✓' : ''}${child.description ? ` (${child.description})` : ''}`)
        .join('\n');

      const { text: summary } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt: `Generate a concise summary (2-3 sentences, max 150 tokens) that describes what this parent action encompasses based on its children.

Parent Action: ${input.title}
${input.description ? `Description: ${input.description}` : ''}

Children (${completedCount}/${totalCount} completed):
${childrenText}

Create a summary that:
1. Explains what this parent action covers as a whole
2. Mentions the scope/theme of the children
3. Optionally notes progress if significant

Focus on the "what" and "scope", not implementation details.`,
        maxTokens: 150,
        temperature: 0.3,
      });

      return summary.trim();
    } catch (error) {
      console.error('Failed to generate subtree summary:', error);
      // Fallback to simple summary
      const completedCount = input.children.filter(child => child.done).length;
      return `${input.title} encompasses ${input.children.length} related actions (${completedCount} completed)`;
    }
  }

  /**
   * Generate batch subtree summaries for multiple actions
   */
  static async generateBatchSubtreeSummaries(inputs: Array<SubtreeSummaryInput>): Promise<Array<{ id: string; summary: string }>> {
    const results: Array<{ id: string; summary: string }> = [];
    
    // Process in batches of 3 to avoid API rate limits (subtree summaries are more complex)
    for (let i = 0; i < inputs.length; i += 3) {
      const batch = inputs.slice(i, i + 3);
      const batchPromises = batch.map(async (input) => {
        const summary = await this.generateSubtreeSummary(input);
        return { id: input.actionId, summary };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + 3 < inputs.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }

  /**
   * Update the subtree summary for an action
   */
  static async updateSubtreeSummary(actionId: string, summary: string): Promise<void> {
    const db = getDb();
    
    try {
      await db.execute(sql`
        UPDATE ${actions}
        SET subtree_summary = ${summary},
            updated_at = NOW()
        WHERE id = ${actionId}
      `);
      
      console.log(`Successfully stored subtree summary for action ${actionId}`);
    } catch (error) {
      console.error(`Failed to store subtree summary for action ${actionId}:`, error);
      throw error;
    }
  }

  /**
   * Get actions that don't have subtree summaries yet (for batch processing)
   * Only returns actions that have children (leaf nodes don't need subtree summaries)
   */
  static async getActionsWithoutSubtreeSummaries(limit: number = 50): Promise<Array<SubtreeSummaryInput>> {
    const db = getDb();
    
    // Find actions without subtree summaries that have children
    const results = await db.execute(sql`
      SELECT DISTINCT
        a.id,
        a.data->>'title' as title,
        a.data->>'description' as description
      FROM ${actions} a
      INNER JOIN ${edges} e ON a.id = e.src AND e.kind = 'child'
      WHERE a.subtree_summary IS NULL
        AND a.data->>'title' IS NOT NULL
      ORDER BY a.created_at DESC
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
      
      console.log(`Successfully extracted ${rows.length} actions without subtree summaries`);
    } catch (error) {
      console.error('Error extracting rows from database results:', error);
      return [];
    }
    
    // For each parent action, get its children
    const subtreeSummaryInputs: SubtreeSummaryInput[] = [];
    
    for (const row of rows) {
      try {
        const children = await this.getActionChildren(row.id);
        
        subtreeSummaryInputs.push({
          actionId: row.id,
          title: row.title,
          description: row.description || undefined,
          children
        });
      } catch (error) {
        console.error(`Failed to get children for action ${row.id}:`, error);
        continue;
      }
    }
    
    return subtreeSummaryInputs;
  }

  /**
   * Get children of an action for subtree summary generation
   */
  private static async getActionChildren(parentId: string): Promise<Array<{
    title: string;
    description?: string;
    done: boolean;
  }>> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        a.data->>'title' as title,
        a.data->>'description' as description,
        a.done
      FROM ${actions} a
      INNER JOIN ${edges} e ON a.id = e.dst
      WHERE e.src = ${parentId} 
        AND e.kind = 'child'
      ORDER BY a.created_at ASC
    `);
    
    // Handle different database result formats
    let rows: any[] = [];
    
    if (Array.isArray(results)) {
      rows = results;
    } else if (results.rows && Array.isArray(results.rows)) {
      rows = results.rows;
    } else if (results && typeof results[Symbol.iterator] === 'function') {
      rows = [...results];
    } else if (results && results.length !== undefined) {
      rows = Array.prototype.slice.call(results);
    }
    
    return rows.map((row: any) => ({
      title: row.title || 'Untitled',
      description: row.description || undefined,
      done: Boolean(row.done)
    }));
  }

  /**
   * Get subtree summary statistics for monitoring
   */
  static async getSubtreeSummaryStats(): Promise<{
    totalParentActions: number;
    actionsWithSubtreeSummaries: number;
    actionsWithoutSubtreeSummaries: number;
    coveragePercentage: number;
  }> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT a.id) as total_parent_actions,
        COUNT(DISTINCT CASE WHEN a.subtree_summary IS NOT NULL THEN a.id END) as actions_with_subtree_summaries,
        COUNT(DISTINCT CASE WHEN a.subtree_summary IS NULL THEN a.id END) as actions_without_subtree_summaries
      FROM ${actions} a
      INNER JOIN ${edges} e ON a.id = e.src AND e.kind = 'child'
    `);
    
    // Handle different database result formats
    const rows = results.rows || results;
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('No results from subtree summary stats query:', results);
      return {
        totalParentActions: 0,
        actionsWithSubtreeSummaries: 0,
        actionsWithoutSubtreeSummaries: 0,
        coveragePercentage: 0
      };
    }
    
    const row = rows[0] as any;
    const totalParentActions = parseInt(row.total_parent_actions) || 0;
    const actionsWithSubtreeSummaries = parseInt(row.actions_with_subtree_summaries) || 0;
    const actionsWithoutSubtreeSummaries = parseInt(row.actions_without_subtree_summaries) || 0;
    
    return {
      totalParentActions,
      actionsWithSubtreeSummaries,
      actionsWithoutSubtreeSummaries,
      coveragePercentage: totalParentActions > 0 ? (actionsWithSubtreeSummaries / totalParentActions) * 100 : 0
    };
  }
}