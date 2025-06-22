/**
 * Parent summary generation service for hierarchical action management
 * 
 * This service generates AI-powered summaries that describe how an action
 * fits into the broader context and vision of its parent chain.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDb } from '../db/adapter';
import { actions, edges } from '../../db/schema';
import { sql, eq, and } from 'drizzle-orm';

export interface ParentSummaryInput {
  actionId: string;
  title: string;
  description?: string;
  vision?: string;
  parentChain: Array<{
    title: string;
    description?: string;
    vision?: string;
  }>;
}

export class ParentSummaryService {
  /**
   * Generate a parent context summary that explains how the action fits into broader project context
   */
  static async generateParentContextSummary(input: ParentSummaryInput): Promise<string> {
    // Return dummy summary for tests or when no API key
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      const parentCount = input.parentChain.length;
      return parentCount > 0 
        ? `This action fits within ${parentCount} levels of parent context`
        : 'This action has no parent context.';
    }

    // Get only parent descriptions, excluding the current action
    const parentDescriptions = input.parentChain
      .map(parent => parent.description)
      .filter((desc): desc is string => Boolean(desc));
    
    // If no parent descriptions, return default summary
    if (parentDescriptions.length === 0) {
      return "This action has no parent context.";
    }

    try {
      // Reverse the array so we go from closest to furthest parent
      const reversedDescriptions = [...parentDescriptions].reverse();
      
      let prompt = `You are creating a contextual summary to help someone understand how the current action "${input.title}" fits into the broader project context.\n\n`;
      prompt += "CURRENT ACTION:\n";
      prompt += `${input.title}`;
      if (input.description) {
        prompt += `: ${input.description}`;
      }
      prompt += "\n\n";
      prompt += "PARENT CONTEXTS (from closest to furthest):\n";
      prompt += reversedDescriptions.map((d, i) => `${i + 1}. ${d}`).join("\n");
      prompt += `\n\nWrite a concise summary that explains how "${input.title}" connects to and supports the broader project goals. Focus on the relationship between this specific action and the larger context it serves. Make it clear why this action matters in the bigger picture.`;

      const { text: summary } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt,
        maxTokens: 200,
        temperature: 0.3,
      });

      return summary.trim();
    } catch (error) {
      console.error('Failed to generate parent context summary:', error);
      // Fallback to simple summary
      return `This action contributes to ${parentDescriptions.length} broader project contexts.`;
    }
  }

  /**
   * Generate a parent vision summary that explains how completing the action contributes to broader outcomes
   */
  static async generateParentVisionSummary(input: ParentSummaryInput): Promise<string> {
    // Return dummy summary for tests or when no API key
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      const parentCount = input.parentChain.length;
      return parentCount > 0 
        ? `Completing this action advances ${parentCount} levels of parent visions`
        : 'This action has no parent vision context.';
    }

    // Get only parent visions, excluding the current action
    const parentVisions = input.parentChain
      .map(parent => parent.vision)
      .filter((vision): vision is string => Boolean(vision));
    
    // If no parent visions, return default summary
    if (parentVisions.length === 0) {
      return "This action has no parent vision context.";
    }

    try {
      // Reverse the array so we go from closest to furthest parent
      const reversedVisions = [...parentVisions].reverse();
      
      let prompt = `You are creating a vision summary to help someone understand how completing the current action "${input.title}" contributes to the broader project outcomes.\n\n`;
      prompt += "CURRENT ACTION:\n";
      prompt += `${input.title}`;
      if (input.description) {
        prompt += `: ${input.description}`;
      }
      if (input.vision) {
        prompt += ` (Success criteria: ${input.vision})`;
      }
      prompt += "\n\n";
      prompt += "PARENT VISIONS (from closest to furthest):\n";
      prompt += reversedVisions.map((v, i) => `${i + 1}. ${v}`).join("\n");
      prompt += `\n\nWrite a concise summary that explains how completing "${input.title}" moves the project toward these broader visions. Focus on the connection between this specific action's success and the larger outcomes it enables. Make it clear what bigger picture this action serves.`;

      const { text: summary } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt,
        maxTokens: 200,
        temperature: 0.3,
      });

      return summary.trim();
    } catch (error) {
      console.error('Failed to generate parent vision summary:', error);
      // Fallback to simple summary
      return `Completing this action advances ${parentVisions.length} broader project visions.`;
    }
  }

  /**
   * Generate both parent summaries for an action
   */
  static async generateBothParentSummaries(input: ParentSummaryInput): Promise<{
    contextSummary: string;
    visionSummary: string;
  }> {
    const [contextSummary, visionSummary] = await Promise.all([
      this.generateParentContextSummary(input),
      this.generateParentVisionSummary(input)
    ]);

    return { contextSummary, visionSummary };
  }

  /**
   * Update parent summaries for an action
   */
  static async updateParentSummaries(actionId: string, contextSummary: string, visionSummary: string): Promise<void> {
    const db = getDb();
    
    try {
      await db.execute(sql`
        UPDATE ${actions}
        SET parent_context_summary = ${contextSummary},
            parent_vision_summary = ${visionSummary},
            updated_at = NOW()
        WHERE id = ${actionId}
      `);
      
      console.log(`Successfully stored parent summaries for action ${actionId}`);
    } catch (error) {
      console.error(`Failed to store parent summaries for action ${actionId}:`, error);
      throw error;
    }
  }

  /**
   * Get parent chain for an action to build summary input
   */
  static async getParentChain(actionId: string): Promise<Array<{
    title: string;
    description?: string;
    vision?: string;
  }>> {
    const db = getDb();
    const parentChain: Array<{ title: string; description?: string; vision?: string }> = [];
    let currentActionId = actionId;

    // Traverse up the parent chain
    while (true) {
      // Get parent relationship
      const parentEdgeResult = await db.execute(sql`
        SELECT e.src as parent_id
        FROM ${edges} e
        WHERE e.dst = ${currentActionId} AND e.kind = 'child'
        LIMIT 1
      `);

      // Handle different database result formats
      let rows: any[] = [];
      if (Array.isArray(parentEdgeResult)) {
        rows = parentEdgeResult;
      } else if (parentEdgeResult.rows && Array.isArray(parentEdgeResult.rows)) {
        rows = parentEdgeResult.rows;
      } else if (parentEdgeResult && typeof parentEdgeResult[Symbol.iterator] === 'function') {
        rows = [...parentEdgeResult];
      } else if (parentEdgeResult && parentEdgeResult.length !== undefined) {
        rows = Array.prototype.slice.call(parentEdgeResult);
      }

      if (rows.length === 0) {
        break; // No more parents
      }

      const parentId = rows[0].parent_id;
      if (!parentId) {
        break;
      }

      // Get parent action details
      const parentActionResult = await db.execute(sql`
        SELECT 
          COALESCE(title, data->>'title') as title,
          COALESCE(description, data->>'description') as description,
          COALESCE(vision, data->>'vision') as vision
        FROM ${actions}
        WHERE id = ${parentId}
        LIMIT 1
      `);

      // Handle different database result formats for parent action
      let parentRows: any[] = [];
      if (Array.isArray(parentActionResult)) {
        parentRows = parentActionResult;
      } else if (parentActionResult.rows && Array.isArray(parentActionResult.rows)) {
        parentRows = parentActionResult.rows;
      } else if (parentActionResult && typeof parentActionResult[Symbol.iterator] === 'function') {
        parentRows = [...parentActionResult];
      } else if (parentActionResult && parentActionResult.length !== undefined) {
        parentRows = Array.prototype.slice.call(parentActionResult);
      }

      if (parentRows.length === 0) {
        break;
      }

      const parent = parentRows[0];
      parentChain.push({
        title: parent.title || 'Untitled',
        description: parent.description || undefined,
        vision: parent.vision || undefined
      });

      currentActionId = parentId;
    }

    return parentChain;
  }

  /**
   * Get actions that don't have parent summaries yet (for batch processing)
   */
  static async getActionsWithoutParentSummaries(limit: number = 50): Promise<Array<ParentSummaryInput>> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        id,
        COALESCE(title, data->>'title') as title,
        COALESCE(description, data->>'description') as description,
        COALESCE(vision, data->>'vision') as vision
      FROM ${actions}
      WHERE (parent_context_summary IS NULL OR parent_vision_summary IS NULL)
        AND COALESCE(title, data->>'title') IS NOT NULL
      ORDER BY created_at DESC
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
      
      console.log(`Successfully extracted ${rows.length} actions without parent summaries`);
    } catch (error) {
      console.error('Error extracting rows from database results:', error);
      return [];
    }
    
    // For each action, get its parent chain
    const parentSummaryInputs: ParentSummaryInput[] = [];
    
    for (const row of rows) {
      try {
        const parentChain = await this.getParentChain(row.id);
        
        parentSummaryInputs.push({
          actionId: row.id,
          title: row.title,
          description: row.description || undefined,
          vision: row.vision || undefined,
          parentChain
        });
      } catch (error) {
        console.error(`Failed to get parent chain for action ${row.id}:`, error);
        continue;
      }
    }
    
    return parentSummaryInputs;
  }

  /**
   * Generate batch parent summaries for multiple actions
   */
  static async generateBatchParentSummaries(inputs: Array<ParentSummaryInput>): Promise<Array<{ 
    id: string; 
    contextSummary: string; 
    visionSummary: string; 
  }>> {
    const results: Array<{ id: string; contextSummary: string; visionSummary: string }> = [];
    
    // Process in batches of 2 to avoid API rate limits (parent summaries are complex with long prompts)
    for (let i = 0; i < inputs.length; i += 2) {
      const batch = inputs.slice(i, i + 2);
      const batchPromises = batch.map(async (input) => {
        const { contextSummary, visionSummary } = await this.generateBothParentSummaries(input);
        return { id: input.actionId, contextSummary, visionSummary };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + 2 < inputs.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    return results;
  }

  /**
   * Get parent summary statistics for monitoring
   */
  static async getParentSummaryStats(): Promise<{
    totalActions: number;
    actionsWithParentSummaries: number;
    actionsWithoutParentSummaries: number;
    coveragePercentage: number;
  }> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN parent_context_summary IS NOT NULL AND parent_vision_summary IS NOT NULL THEN 1 END) as actions_with_parent_summaries,
        COUNT(CASE WHEN parent_context_summary IS NULL OR parent_vision_summary IS NULL THEN 1 END) as actions_without_parent_summaries
      FROM ${actions}
    `);
    
    // Handle different database result formats
    const rows = results.rows || results;
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('No results from parent summary stats query:', results);
      return {
        totalActions: 0,
        actionsWithParentSummaries: 0,
        actionsWithoutParentSummaries: 0,
        coveragePercentage: 0
      };
    }
    
    const row = rows[0] as any;
    const totalActions = parseInt(row.total_actions) || 0;
    const actionsWithParentSummaries = parseInt(row.actions_with_parent_summaries) || 0;
    const actionsWithoutParentSummaries = parseInt(row.actions_without_parent_summaries) || 0;
    
    return {
      totalActions,
      actionsWithParentSummaries,
      actionsWithoutParentSummaries,
      coveragePercentage: totalActions > 0 ? (actionsWithParentSummaries / totalActions) * 100 : 0
    };
  }
}