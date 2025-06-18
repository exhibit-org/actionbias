/**
 * LLM-based intelligent action placement service
 * 
 * This service determines the optimal parent for new actions using semantic reasoning.
 * It builds context about existing action hierarchies and uses LLM calls via the 
 * Vercel AI SDK to make intelligent placement decisions. If the LLM call fails,
 * no placement suggestion is provided.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ActionContent } from '../utils/text-processing';
import { AnalysisService } from './analysis';

export interface PlacementResult {
  bestParent: { id: string; title: string } | null;
  confidence: number;
  reasoning: string;
  analysis: any;
}

export interface ActionHierarchyItem {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  parentId?: string;
}

export class PlacementService {
  /**
   * Find the best parent for a new action using semantic reasoning
   */
  static async findBestParent(
    newAction: ActionContent,
    existingActions: ActionHierarchyItem[]
  ): Promise<PlacementResult> {
    // Analyze the new action for quality scoring and structured data
    const newActionAnalysis = await AnalysisService.analyzeAction(newAction);
    
    // Get all actions as potential parents (not just root-level)
    // This allows placement anywhere in the hierarchy
    const potentialParents = existingActions;
    
    if (potentialParents.length === 0) {
      return {
        bestParent: null,
        confidence: 0,
        reasoning: 'No potential parent actions found',
        analysis: newActionAnalysis
      };
    }

    // Build context for each potential parent
    const parentContexts = potentialParents.map(parent => {
      const children = existingActions.filter(action => action.parentId === parent.id);
      return {
        parent,
        children,
        context: this.buildParentContext(parent, children, existingActions)
      };
    });

    // Determine best placement using semantic heuristics
    const placement = await this.determineBestPlacement(newAction, parentContexts);
    
    return {
      bestParent: placement.bestParent,
      confidence: placement.confidence,
      reasoning: placement.reasoning,
      analysis: newActionAnalysis
    };
  }

  /**
   * Build a descriptive context for a parent and its children
   */
  private static buildParentContext(parent: ActionHierarchyItem, children: ActionHierarchyItem[], allActions: ActionHierarchyItem[]): string {
    let context = `**${parent.title}**\n`;
    if (parent.description) context += `Description: ${parent.description}\n`;
    if (parent.vision) context += `Vision: ${parent.vision}\n`;
    
    // Add hierarchy path for better context
    const hierarchyPath = this.buildHierarchyPath(parent, allActions);
    if (hierarchyPath.length > 1) {
      context += `Hierarchy: ${hierarchyPath.join(' → ')}\n`;
    }
    
    if (children.length > 0) {
      context += `\nExisting children:\n`;
      children.forEach(child => {
        context += `- ${child.title}`;
        if (child.description) context += `: ${child.description}`;
        context += `\n`;
      });
    } else {
      context += `\nNo existing children.\n`;
    }
    
    return context;
  }

  /**
   * Build hierarchy path for better contextual understanding
   */
  private static buildHierarchyPath(action: ActionHierarchyItem, allActions: ActionHierarchyItem[]): string[] {
    const path = [action.title];
    
    if (action.parentId) {
      const parent = allActions.find(a => a.id === action.parentId);
      if (parent) {
        const parentPath = this.buildHierarchyPath(parent, allActions);
        return [...parentPath, action.title];
      }
    }
    
    return path;
  }

  /**
   * Use LLM to determine the best placement for a new action
   */
  private static async determineBestPlacement(
    newAction: ActionContent, 
    parentContexts: Array<{ 
      parent: ActionHierarchyItem; 
      children: ActionHierarchyItem[]; 
      context: string 
    }>
  ): Promise<{
    bestParent: { id: string; title: string } | null;
    confidence: number;
    reasoning: string;
  }> {
    try {
      // Build the prompt for the LLM
      const prompt = this.buildPlacementPrompt(newAction, parentContexts);
      
      // Define the response schema
      const placementSchema = z.object({
        bestParentId: z.string().nullable().describe('The ID of the best parent category, or null if no good match'),
        confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
        reasoning: z.string().describe('Explanation of why this placement was chosen')
      });

      // Make the LLM call
      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        prompt,
        schema: placementSchema,
        temperature: 0, // Deterministic results
      });

      // Find the parent object if ID was provided
      let bestParent = null;
      if (result.object.bestParentId) {
        const parentContext = parentContexts.find(p => p.parent.id === result.object.bestParentId);
        if (parentContext) {
          bestParent = {
            id: parentContext.parent.id,
            title: parentContext.parent.title
          };
        }
      }

      return {
        bestParent,
        confidence: result.object.confidence,
        reasoning: result.object.reasoning
      };

    } catch (error) {
      console.error('Error in LLM placement call:', error);
      
      // Return no placement suggestion if LLM fails
      return {
        bestParent: null,
        confidence: 0,
        reasoning: `LLM placement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build the prompt for LLM placement decision
   */
  private static buildPlacementPrompt(
    newAction: ActionContent,
    parentContexts: Array<{ parent: ActionHierarchyItem; children: ActionHierarchyItem[]; context: string }>
  ): string {
    const newActionDescription = `
**New Action to Place:**
Title: ${newAction.title}
${newAction.description ? `Description: ${newAction.description}` : ''}
${newAction.vision ? `Vision: ${newAction.vision}` : ''}
`;

    const categoryDescriptions = parentContexts.map((ctx, index) => 
      `${index + 1}. **${ctx.parent.title}** (ID: ${ctx.parent.id})
${ctx.parent.description ? `   Description: ${ctx.parent.description}` : ''}
${ctx.parent.vision ? `   Vision: ${ctx.parent.vision}` : ''}
${ctx.children.length > 0 ? 
  `   Existing children: ${ctx.children.map(c => c.title).join(', ')}` : 
  '   No existing children'}`
    ).join('\n\n');

    return `You are an intelligent action categorization system. Your task is to determine the best parent category for a new action based on semantic similarity, logical organization, and software architecture patterns.

${newActionDescription}

**Available Parent Categories:**
${categoryDescriptions}

**Instructions:**
1. Analyze the semantic meaning and purpose of the new action
2. Consider which parent category it most naturally belongs to based on:
   - Functional domain (auth, payments, UI, API, etc.)
   - Architectural layer (frontend, backend, database, infrastructure)
   - Business context (user management, billing, content, etc.)
3. Look at existing children to understand each category's scope
4. Consider the hierarchy path - deeper nesting often indicates more specific functional areas
5. Prioritize semantic similarity over superficial keyword matching
6. If no category is a good fit (confidence < 0.3), return null for bestParentId

**Domain Knowledge Patterns:**
- **Payment/Billing**: Usually belongs with organization management, user accounts, or subscription features
- **Authentication**: Core security feature, often separate but related to user management
- **Multi-tenancy**: Organizational structure, billing, and access control are tightly related
- **API Development**: Technical implementation details, distinct from business features
- **Infrastructure**: Deployment, monitoring, security scanning are operational concerns

**Response Requirements:**
- bestParentId: The ID of the most appropriate parent category, or null if no good match
- confidence: A score from 0 to 1 indicating how confident you are in this placement
- reasoning: A clear explanation considering functional domain, architecture, and business context

Be thoughtful about semantic relationships. Examples:
- "Integrate polar.sh for payment" belongs with organization/billing management, not technical API categories
- "OAuth Integration" belongs with authentication, not UI, despite containing "integration"  
- "Database Schema" clearly belongs with database categories
- "User Settings UI" could be UI or user management, but user management is more semantically core

Only suggest a placement if you are reasonably confident. Return null if uncertain.`;
  }

}