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
  suggestedNewParent?: { title: string; description: string; reasoning: string };
}

export interface ActionHierarchyItem {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  parentId?: string;
}

export interface PlacementConfig {
  confidenceThreshold?: number;
  similarityThreshold?: number;
}

export class PlacementService {
  /**
   * Find the best parent for a new action using semantic reasoning
   */
  static async findBestParent(
    newAction: ActionContent,
    existingActions: ActionHierarchyItem[],
    config: PlacementConfig = {}
  ): Promise<PlacementResult> {
    const { confidenceThreshold = 0.3, similarityThreshold = 0.7 } = config;
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
    const placement = await this.determineBestPlacement(newAction, parentContexts, { confidenceThreshold, similarityThreshold });
    
    return {
      bestParent: placement.bestParent,
      confidence: placement.confidence,
      reasoning: placement.reasoning,
      analysis: newActionAnalysis,
      suggestedNewParent: placement.suggestedNewParent
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
    }>,
    config: { confidenceThreshold: number; similarityThreshold: number }
  ): Promise<{
    bestParent: { id: string; title: string } | null;
    confidence: number;
    reasoning: string;
    suggestedNewParent?: { title: string; description: string; reasoning: string };
  }> {
    try {
      // Build the prompt for the LLM
      const prompt = this.buildPlacementPrompt(newAction, parentContexts, config.confidenceThreshold);
      
      // Define the response schema with new parent suggestion capability
      const placementSchema = z.object({
        bestParentId: z.string().nullable().describe('The ID of the best parent category, or null if no good match'),
        confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
        reasoning: z.string().describe('Explanation of why this placement was chosen'),
        suggestNewParent: z.boolean().describe('Whether to suggest creating a new parent category'),
        newParentTitle: z.string().optional().describe('Title for the suggested new parent category'),
        newParentDescription: z.string().optional().describe('Description for the suggested new parent category'),
        newParentReasoning: z.string().optional().describe('Why this new parent category should be created')
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

      // Handle new parent suggestion
      let suggestedNewParent = undefined;
      if (result.object.suggestNewParent && result.object.newParentTitle && result.object.newParentDescription) {
        suggestedNewParent = {
          title: result.object.newParentTitle,
          description: result.object.newParentDescription,
          reasoning: result.object.newParentReasoning || 'New category needed for better organization'
        };
      }

      return {
        bestParent,
        confidence: result.object.confidence,
        reasoning: result.object.reasoning,
        suggestedNewParent
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
    parentContexts: Array<{ parent: ActionHierarchyItem; children: ActionHierarchyItem[]; context: string }>,
    confidenceThreshold: number
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
6. If no category is a good fit (confidence < ${confidenceThreshold}), consider suggesting a new parent category

**When to Suggest New Parent Categories:**
- The new action represents a distinct functional domain not covered by existing categories
- Multiple related actions might benefit from a new organizational structure
- The action would be forced into an unnatural parent that doesn't semantically fit
- A new category would improve the overall hierarchy organization and workflow efficiency
- Examples: Analytics/Reporting, Testing/QA, Documentation, DevOps/CI-CD, etc.

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
- suggestNewParent: Set to true if a new parent category should be created instead
- newParentTitle: If suggesting new parent, provide a clear, descriptive title
- newParentDescription: If suggesting new parent, provide a detailed description of its purpose
- newParentReasoning: If suggesting new parent, explain why this new category improves organization

**Decision Logic:**
1. First, try to find a good existing parent (confidence >= ${confidenceThreshold})
2. If no good existing parent, consider if a new parent category would be beneficial
3. Only suggest new parents for actions that represent clear functional domains
4. Prefer existing parents unless new category significantly improves organization

Be thoughtful about semantic relationships. Examples:
- "Integrate polar.sh for payment" belongs with organization/billing management, not technical API categories
- "OAuth Integration" belongs with authentication, not UI, despite containing "integration"  
- "Database Schema" clearly belongs with database categories
- "User Settings UI" could be UI or user management, but user management is more semantically core

Return null for bestParentId only if no existing parent fits AND no new parent should be suggested.`;
  }

}