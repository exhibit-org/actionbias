/**
 * Action Classification Service
 * 
 * Provides JSON-mode classification for actions using structured prompts
 * that yield deterministic ADD_AS_CHILD | CREATE_PARENT | ADD_AS_ROOT decisions.
 * This service bridges the gap between the sophisticated placement service
 * and simple classification needs.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  type ClassificationResponse,
  type ClassificationContext,
  type ActionToClassify,
  type ExistingAction,
  classificationSchema,
  buildClassificationPrompt
} from '../prompts/classification-template';

export interface ClassificationResult {
  decision: 'ADD_AS_CHILD' | 'CREATE_PARENT' | 'ADD_AS_ROOT';
  parentId: string | null;
  confidence: number;
  reasoning: string;
  suggestedParent?: {
    title: string;
    description: string;
  };
}

export class ClassificationService {
  /**
   * Classifies an action using JSON-mode prompts
   */
  static async classifyAction(
    action: ActionToClassify,
    existingActions: ExistingAction[],
    confidenceThreshold: number = 0.7
  ): Promise<ClassificationResult> {
    try {
      const context: ClassificationContext = {
        action,
        existingActions,
        confidenceThreshold
      };

      const prompt = buildClassificationPrompt(context);
      
      // Use generateObject for structured JSON output
      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        system: prompt.systemMessage,
        prompt: prompt.userMessage,
        schema: classificationSchema,
        temperature: 0, // Deterministic results
      });

      const classification = result.object;

      // Transform to our result format
      const classificationResult: ClassificationResult = {
        decision: classification.decision,
        parentId: classification.parentId,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      };

      // Add suggested parent info if CREATE_PARENT decision
      if (classification.decision === 'CREATE_PARENT' && 
          classification.newParentTitle && 
          classification.newParentDescription) {
        classificationResult.suggestedParent = {
          title: classification.newParentTitle,
          description: classification.newParentDescription
        };
      }

      return classificationResult;

    } catch (error) {
      console.error('Error in action classification:', error);
      
      // Fallback to ADD_AS_ROOT with low confidence
      return {
        decision: 'ADD_AS_ROOT',
        parentId: null,
        confidence: 0,
        reasoning: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}. Defaulting to root placement.`
      };
    }
  }

  /**
   * Batch classify multiple actions
   */
  static async classifyActions(
    actions: ActionToClassify[],
    existingActions: ExistingAction[],
    confidenceThreshold: number = 0.7
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    
    // Process sequentially to avoid rate limits and maintain context
    for (const action of actions) {
      const result = await this.classifyAction(action, existingActions, confidenceThreshold);
      results.push(result);
      
      // If a new parent was suggested, add it to existingActions for subsequent classifications
      if (result.decision === 'CREATE_PARENT' && result.suggestedParent) {
        const newParentId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        existingActions.push({
          id: newParentId,
          title: result.suggestedParent.title,
          description: result.suggestedParent.description
        });
      }
    }
    
    return results;
  }

  /**
   * Validates classification decisions and provides recommendations
   */
  static validateClassification(
    result: ClassificationResult,
    action: ActionToClassify,
    existingActions: ExistingAction[]
  ): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check confidence level
    if (result.confidence < 0.5) {
      warnings.push(`Low confidence (${result.confidence}) suggests uncertain placement`);
    }

    // Validate parent ID exists when ADD_AS_CHILD
    if (result.decision === 'ADD_AS_CHILD') {
      if (!result.parentId) {
        warnings.push('ADD_AS_CHILD decision requires a valid parentId');
      } else {
        const parentExists = existingActions.some(a => a.id === result.parentId);
        if (!parentExists) {
          warnings.push(`Parent ID ${result.parentId} not found in existing actions`);
        }
      }
    }

    // Validate new parent info when CREATE_PARENT
    if (result.decision === 'CREATE_PARENT') {
      if (!result.suggestedParent) {
        warnings.push('CREATE_PARENT decision requires suggestedParent information');
      } else {
        if (!result.suggestedParent.title.trim()) {
          warnings.push('New parent title cannot be empty');
        }
        if (!result.suggestedParent.description.trim()) {
          warnings.push('New parent description cannot be empty');
        }
      }
    }

    // Provide recommendations based on decision
    if (result.decision === 'ADD_AS_ROOT' && existingActions.length > 0) {
      recommendations.push('Consider if this action could be organized under an existing category');
    }

    if (result.decision === 'CREATE_PARENT') {
      recommendations.push('Ensure the new parent category will have multiple related actions');
    }

    const isValid = warnings.length === 0;
    return { isValid, warnings, recommendations };
  }

  /**
   * Converts classification result to placement service format
   */
  static toPlacementResult(
    classification: ClassificationResult,
    existingActions: ExistingAction[]
  ): {
    bestParent: { id: string; title: string } | null;
    confidence: number;
    reasoning: string;
    suggestedNewParent?: { title: string; description: string; reasoning: string };
  } {
    let bestParent = null;
    let suggestedNewParent = undefined;

    if (classification.decision === 'ADD_AS_CHILD' && classification.parentId) {
      const parent = existingActions.find(a => a.id === classification.parentId);
      if (parent) {
        bestParent = {
          id: parent.id,
          title: parent.title
        };
      }
    }

    if (classification.decision === 'CREATE_PARENT' && classification.suggestedParent) {
      suggestedNewParent = {
        title: classification.suggestedParent.title,
        description: classification.suggestedParent.description,
        reasoning: classification.reasoning
      };
    }

    return {
      bestParent,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      suggestedNewParent
    };
  }
}