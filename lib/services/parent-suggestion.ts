/**
 * Parent Suggestion Service
 * 
 * Combines vector-based similarity search with classification to provide
 * multiple parent suggestions with confidence scores. This service powers
 * the suggest_parent MCP tool and UI components.
 */

import { VectorPlacementService } from './vector-placement';
import { ClassificationService } from './classification';
import { ActionsService } from './actions';
import type { EmbeddingInput } from './embeddings';
import type { ActionToClassify, ExistingAction } from '../prompts/classification-template';

export interface ParentSuggestion {
  id: string;
  title: string;
  description?: string;
  confidence: number; // 0-100
  source: 'vector' | 'classification' | 'create_new';
  reasoning: string;
  hierarchyPath: string[];
  canCreateNewParent: boolean;
}

export interface ParentSuggestionsResult {
  suggestions: ParentSuggestion[];
  metadata: {
    totalProcessingTimeMs: number;
    vectorTimeMs: number;
    classificationTimeMs: number;
    totalCandidates: number;
  };
}

export interface ParentSuggestionOptions {
  limit?: number;
  confidenceThreshold?: number; // 0-100
  includeCreateNew?: boolean;
  vectorWeight?: number; // 0-1, weight for vector vs classification
}

export class ParentSuggestionService {
  /**
   * Get multiple parent suggestions with confidence scores
   */
  static async suggestParents(
    input: EmbeddingInput,
    options: ParentSuggestionOptions = {}
  ): Promise<ParentSuggestionsResult> {
    const startTime = performance.now();
    
    const {
      limit = 5,
      confidenceThreshold = 40,
      includeCreateNew = true,
      vectorWeight = 0.6
    } = options;

    // Get all existing actions for classification
    const existingActions = await ActionsService.listActions({ limit: 10000 });
    const existingActionsForClassification: ExistingAction[] = existingActions.map((action: any) => ({
      id: action.id,
      title: action.title || action.data?.title || 'Untitled',
      description: action.description || action.data?.description
    }));

    // Run vector and classification in parallel
    const vectorStartTime = performance.now();
    const [vectorResults, classificationResult] = await Promise.all([
      VectorPlacementService.findVectorFamilySuggestions(input, {
        limit: Math.max(10, limit * 2),
        similarityThreshold: 0.3,
        includeHierarchyPaths: true
      }),
      ClassificationService.classifyAction(
        {
          title: typeof input === 'string' ? input : input.title || '',
          description: typeof input === 'string' ? undefined : input.description
        },
        existingActionsForClassification
      )
    ]);
    
    const vectorTimeMs = performance.now() - vectorStartTime;
    const classificationTimeMs = performance.now() - vectorStartTime - vectorResults.totalProcessingTimeMs;

    // Combine and deduplicate suggestions
    const suggestionMap = new Map<string, ParentSuggestion>();

    // Add vector suggestions
    vectorResults.candidates.forEach(candidate => {
      const confidence = Math.round(candidate.similarity * 100);
      
      if (confidence >= confidenceThreshold) {
        suggestionMap.set(candidate.id, {
          id: candidate.id,
          title: candidate.title,
          description: candidate.description,
          confidence,
          source: 'vector',
          reasoning: `High semantic similarity (${confidence}%) with existing ${candidate.title.toLowerCase()} work`,
          hierarchyPath: candidate.hierarchyPath,
          canCreateNewParent: false
        });
      }
    });

    // Add classification suggestion (if different from vector suggestions)
    if (classificationResult.decision === 'ADD_AS_CHILD' && classificationResult.parentId) {
      const classificationConfidence = Math.round(classificationResult.confidence * 100);
      
      if (classificationConfidence >= confidenceThreshold) {
        const existingAction = existingActionsForClassification.find(a => a.id === classificationResult.parentId);
        
        if (existingAction && !suggestionMap.has(classificationResult.parentId)) {
          suggestionMap.set(classificationResult.parentId, {
            id: classificationResult.parentId,
            title: existingAction.title,
            description: existingAction.description,
            confidence: classificationConfidence,
            source: 'classification',
            reasoning: classificationResult.reasoning,
            hierarchyPath: [existingAction.title],
            canCreateNewParent: false
          });
        }
      }
    }

    // Add create new parent suggestion if enabled and classification suggests it
    if (includeCreateNew && 
        classificationResult.decision === 'CREATE_PARENT' && 
        classificationResult.suggestedParent) {
      
      // Boost confidence for new parent suggestions to make them more prominent
      const createNewConfidence = Math.max(75, Math.round(classificationResult.confidence * 100));
      
      suggestionMap.set('CREATE_NEW_PARENT', {
        id: 'CREATE_NEW_PARENT',
        title: classificationResult.suggestedParent.title,
        description: classificationResult.suggestedParent.description,
        confidence: createNewConfidence,
        source: 'create_new',
        reasoning: classificationResult.reasoning,
        hierarchyPath: [classificationResult.suggestedParent.title],
        canCreateNewParent: true
      });
    }

    // Sort by confidence and limit results
    const suggestions = Array.from(suggestionMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    const totalProcessingTimeMs = performance.now() - startTime;

    return {
      suggestions,
      metadata: {
        totalProcessingTimeMs,
        vectorTimeMs,
        classificationTimeMs,
        totalCandidates: suggestions.length
      }
    };
  }

  /**
   * Validate a parent suggestion result
   */
  static validateSuggestion(
    suggestion: ParentSuggestion,
    existingActions: ExistingAction[]
  ): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (suggestion.confidence < 50) {
      warnings.push('Low confidence suggestion - consider alternative placement');
    }

    if (suggestion.source === 'vector' && suggestion.confidence < 60) {
      warnings.push('Vector similarity is below recommended threshold');
    }

    if (!suggestion.canCreateNewParent && suggestion.id !== 'CREATE_NEW_PARENT') {
      const parentExists = existingActions.some(a => a.id === suggestion.id);
      if (!parentExists) {
        warnings.push(`Parent action ${suggestion.id} not found in database`);
      }
    }

    if (suggestion.canCreateNewParent && !suggestion.title.trim()) {
      warnings.push('New parent title cannot be empty');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Get detailed reasoning for a suggestion
   */
  static getDetailedReasoning(
    suggestion: ParentSuggestion,
    input: EmbeddingInput
  ): string {
    const inputTitle = typeof input === 'string' ? input : input.title || '';
    
    switch (suggestion.source) {
      case 'vector':
        return `Vector similarity analysis shows ${suggestion.confidence}% semantic similarity between "${inputTitle}" and existing "${suggestion.title}" work. This suggests the action fits well within the existing category based on content and context.`;
      
      case 'classification':
        return `AI classification analysis determined this action belongs under "${suggestion.title}" with ${suggestion.confidence}% confidence. ${suggestion.reasoning}`;
      
      case 'create_new':
        return `No existing parent category was found with sufficient confidence. Creating a new parent "${suggestion.title}" would provide better organization for this type of work. ${suggestion.reasoning}`;
      
      default:
        return suggestion.reasoning;
    }
  }

  /**
   * Convert suggestion to create_action format
   */
  static toCreateActionFormat(suggestion: ParentSuggestion): {
    family_id: string | null;
    shouldCreateParent: boolean;
    newParentData?: {
      title: string;
      description: string;
    };
  } {
    if (suggestion.canCreateNewParent) {
      return {
        family_id: null,
        shouldCreateParent: true,
        newParentData: {
          title: suggestion.title,
          description: suggestion.description || ''
        }
      };
    }

    return {
      family_id: suggestion.id,
      shouldCreateParent: false
    };
  }
}