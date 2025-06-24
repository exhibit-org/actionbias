/**
 * Family summary generation service for hierarchical action management
 * 
 * This service generates AI-powered summaries that describe how an action
 * fits into the broader context and vision of its family chain.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDb } from '../db/adapter';
import { actions, edges } from '../../db/schema';
import { sql, eq, and } from 'drizzle-orm';

export interface FamilySummaryInput {
  actionId: string;
  title: string;
  description?: string;
  vision?: string;
  familyChain: Array<{
    title: string;
    description?: string;
    vision?: string;
  }>;
}

export class FamilySummaryService {
  /**
   * Generate a family context summary that explains how the action fits into broader project context
   */
  static async generateFamilyContextSummary(input: FamilySummaryInput): Promise<string> {
    // Return dummy summary for tests or when no API key
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      const familyCount = input.familyChain.length;
      return familyCount > 0 
        ? `This action fits within ${familyCount} levels of family context`
        : 'This action has no family context.';
    }

    // Get only family descriptions, excluding the current action
    const familyDescriptions = input.familyChain
      .map(family => family.description)
      .filter((desc): desc is string => Boolean(desc));
    
    // If no family descriptions, return default summary
    if (familyDescriptions.length === 0) {
      return "This action has no family context.";
    }

    try {
      // Reverse the array so we go from closest to furthest parent
      const reversedDescriptions = [...familyDescriptions].reverse();
      
      let prompt = `You are creating a contextual summary to help someone understand how the current action "${input.title}" fits into the broader project context.\n\n`;
      prompt += "CURRENT ACTION:\n";
      prompt += `${input.title}`;
      if (input.description) {
        prompt += `: ${input.description}`;
      }
      prompt += "\n\n";
      prompt += "FAMILY CONTEXTS (from closest to furthest):\n";
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
      console.error('Failed to generate family context summary:', error);
      // Fallback to simple summary
      return `This action contributes to ${familyDescriptions.length} broader project contexts.`;
    }
  }

  /**
   * Generate a family vision summary that explains how completing the action contributes to broader outcomes
   */
  static async generateFamilyVisionSummary(input: FamilySummaryInput): Promise<string> {
    // Return dummy summary for tests or when no API key
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      const familyCount = input.familyChain.length;
      return familyCount > 0 
        ? `Completing this action advances ${familyCount} levels of family visions`
        : 'This action has no family vision context.';
    }

    // Get only family visions, excluding the current action
    const familyVisions = input.familyChain
      .map(family => family.vision)
      .filter((vision): vision is string => Boolean(vision));
    
    // If no family visions, return default summary
    if (familyVisions.length === 0) {
      return "This action has no family vision context.";
    }

    try {
      // Reverse the array so we go from closest to furthest parent
      const reversedVisions = [...familyVisions].reverse();
      
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
      prompt += "FAMILY VISIONS (from closest to furthest):\n";
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
      console.error('Failed to generate family vision summary:', error);
      // Fallback to simple summary
      return `Completing this action advances ${familyVisions.length} broader project visions.`;
    }
  }

  /**
   * Generate both family summaries for an action
   */
  static async generateBothFamilySummaries(input: FamilySummaryInput): Promise<{
    contextSummary: string;
    visionSummary: string;
  }> {
    const [contextSummary, visionSummary] = await Promise.all([
      this.generateFamilyContextSummary(input),
      this.generateFamilyVisionSummary(input)
    ]);

    return { contextSummary, visionSummary };
  }

  /**
   * Update family summaries for an action
   */
  static async updateFamilySummaries(actionId: string, contextSummary: string, visionSummary: string): Promise<void> {
    const db = getDb();
    
    try {
      await db.execute(sql`
        UPDATE ${actions}
        SET family_context_summary = ${contextSummary},
            family_vision_summary = ${visionSummary},
            updated_at = NOW()
        WHERE id = ${actionId}
      `);
      
      console.log(`Successfully stored family summaries for action ${actionId}`);
    } catch (error) {
      console.error(`Failed to store family summaries for action ${actionId}:`, error);
      throw error;
    }
  }

  /**
   * Get family chain for an action to build summary input
   */
  static async getFamilyChain(actionId: string): Promise<Array<{
    title: string;
    description?: string;
    vision?: string;
  }>> {
    const db = getDb();
    const familyChain: Array<{ title: string; description?: string; vision?: string }> = [];
    let currentActionId = actionId;

    // Traverse up the family chain
    while (true) {
      // Get family relationship
      const familyEdgeResult = await db.execute(sql`
        SELECT e.src as family_id
        FROM ${edges} e
        WHERE e.dst = ${currentActionId} AND e.kind = 'child'
        LIMIT 1
      `);

      // Handle different database result formats
      let rows: any[] = [];
      if (Array.isArray(familyEdgeResult)) {
        rows = familyEdgeResult;
      } else if (familyEdgeResult.rows && Array.isArray(familyEdgeResult.rows)) {
        rows = familyEdgeResult.rows;
      } else if (familyEdgeResult && typeof familyEdgeResult[Symbol.iterator] === 'function') {
        rows = [...familyEdgeResult];
      } else if (familyEdgeResult && familyEdgeResult.length !== undefined) {
        rows = Array.prototype.slice.call(familyEdgeResult);
      }

      if (rows.length === 0) {
        break; // No more family members in chain
      }

      const familyId = rows[0].family_id;
      if (!familyId) {
        break;
      }

      // Get family action details
      const familyActionResult = await db.execute(sql`
        SELECT 
          COALESCE(title, data->>'title') as title,
          COALESCE(description, data->>'description') as description,
          COALESCE(vision, data->>'vision') as vision
        FROM ${actions}
        WHERE id = ${familyId}
        LIMIT 1
      `);

      // Handle different database result formats for family action
      let familyRows: any[] = [];
      if (Array.isArray(familyActionResult)) {
        familyRows = familyActionResult;
      } else if (familyActionResult.rows && Array.isArray(familyActionResult.rows)) {
        familyRows = familyActionResult.rows;
      } else if (familyActionResult && typeof familyActionResult[Symbol.iterator] === 'function') {
        familyRows = [...familyActionResult];
      } else if (familyActionResult && familyActionResult.length !== undefined) {
        familyRows = Array.prototype.slice.call(familyActionResult);
      }

      if (familyRows.length === 0) {
        break;
      }

      const family = familyRows[0];
      familyChain.push({
        title: family.title || 'Untitled',
        description: family.description || undefined,
        vision: family.vision || undefined
      });

      currentActionId = familyId;
    }

    return familyChain;
  }

  /**
   * Get actions that don't have family summaries yet (for batch processing)
   */
  static async getActionsWithoutFamilySummaries(limit: number = 50): Promise<Array<FamilySummaryInput>> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        id,
        COALESCE(title, data->>'title') as title,
        COALESCE(description, data->>'description') as description,
        COALESCE(vision, data->>'vision') as vision
      FROM ${actions}
      WHERE (family_context_summary IS NULL OR family_vision_summary IS NULL)
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
      
      console.log(`Successfully extracted ${rows.length} actions without family summaries`);
    } catch (error) {
      console.error('Error extracting rows from database results:', error);
      return [];
    }
    
    // For each action, get its family chain
    const familySummaryInputs: FamilySummaryInput[] = [];
    
    for (const row of rows) {
      try {
        const familyChain = await this.getFamilyChain(row.id);
        
        familySummaryInputs.push({
          actionId: row.id,
          title: row.title,
          description: row.description || undefined,
          vision: row.vision || undefined,
          familyChain
        });
      } catch (error) {
        console.error(`Failed to get family chain for action ${row.id}:`, error);
        continue;
      }
    }
    
    return familySummaryInputs;
  }

  /**
   * Generate batch family summaries for multiple actions
   */
  static async generateBatchFamilySummaries(inputs: Array<FamilySummaryInput>): Promise<Array<{ 
    id: string; 
    contextSummary: string; 
    visionSummary: string; 
  }>> {
    const results: Array<{ id: string; contextSummary: string; visionSummary: string }> = [];
    
    // Process in batches of 2 to avoid API rate limits (family summaries are complex with long prompts)
    for (let i = 0; i < inputs.length; i += 2) {
      const batch = inputs.slice(i, i + 2);
      const batchPromises = batch.map(async (input) => {
        const { contextSummary, visionSummary } = await this.generateBothFamilySummaries(input);
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
   * Get family summary statistics for monitoring
   */
  static async getFamilySummaryStats(): Promise<{
    totalActions: number;
    actionsWithFamilySummaries: number;
    actionsWithoutFamilySummaries: number;
    coveragePercentage: number;
  }> {
    const db = getDb();
    
    const results = await db.execute(sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN family_context_summary IS NOT NULL AND family_vision_summary IS NOT NULL THEN 1 END) as actions_with_family_summaries,
        COUNT(CASE WHEN family_context_summary IS NULL OR family_vision_summary IS NULL THEN 1 END) as actions_without_family_summaries
      FROM ${actions}
    `);
    
    // Handle different database result formats
    const rows = results.rows || results;
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('No results from family summary stats query:', results);
      return {
        totalActions: 0,
        actionsWithFamilySummaries: 0,
        actionsWithoutFamilySummaries: 0,
        coveragePercentage: 0
      };
    }
    
    const row = rows[0] as any;
    const totalActions = parseInt(row.total_actions) || 0;
    const actionsWithFamilySummaries = parseInt(row.actions_with_family_summaries) || 0;
    const actionsWithoutFamilySummaries = parseInt(row.actions_without_family_summaries) || 0;
    
    return {
      totalActions,
      actionsWithFamilySummaries,
      actionsWithoutFamilySummaries,
      coveragePercentage: totalActions > 0 ? (actionsWithFamilySummaries / totalActions) * 100 : 0
    };
  }
}