import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';
import { ActionsService } from '@/lib/services/actions';
import { ActionSearchService } from '@/lib/services/action-search';
import { ParentSuggestionService } from '@/lib/services/parent-suggestion';

const analyzeActionSchema = z.object({
  text: z.string().min(1).max(500),
  createAction: z.boolean().optional().default(false), // Only create if explicitly requested
});

const actionFieldsSchema = z.object({
  title: z.string().describe('A concise, action-oriented title (max 100 chars)'),
  description: z.string().describe('Detailed explanation of what needs to be done and why'),
  vision: z.string().describe('Clear description of the desired end state when this action is complete'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, createAction } = analyzeActionSchema.parse(body);

    // First, parse the text into structured fields using structured generation
    console.log('[AnalyzeAPI] Parsing action fields for:', text.substring(0, 50));
    
    let actionFields;
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: actionFieldsSchema,
        prompt: `Parse this action request into structured fields. Be specific and action-oriented:

"${text}"

Guidelines:
- Title: Short, starts with a verb, clearly states the action
- Description: Expand on the title with context, requirements, and approach
- Vision: Describe what success looks like when this is done`,
      });
      
      actionFields = object;
      console.log('[AnalyzeAPI] Successfully parsed fields:', actionFields);
    } catch (parseError) {
      console.error('[AnalyzeAPI] Field parsing failed:', parseError);
      // Fallback if structured generation fails
      actionFields = {
        title: text.slice(0, 100),
        description: text,
        vision: `Successfully complete: ${text}`,
      };
      console.log('[AnalyzeAPI] Using fallback fields:', actionFields);
    }

    // Step 1: Search for similar actions (for duplicate detection)
    console.log('[AnalyzeAPI] Searching for similar actions...');
    const searchResults = await ActionSearchService.searchActions(actionFields.title, {
      limit: 10,
      searchMode: 'hybrid',
      includeCompleted: false,
      similarityThreshold: 0.3,
    });

    // Step 2: Get multiple parent suggestions using the suggest_parent service
    console.log('[AnalyzeAPI] Getting parent suggestions...');
    let parentSuggestions: any = null;
    try {
      const suggestions = await ParentSuggestionService.suggestParents({
        title: actionFields.title,
        description: actionFields.description
      }, {
        limit: 5,
        confidenceThreshold: 30,
        includeCreateNew: true
      });
      
      parentSuggestions = suggestions;
      console.log('[AnalyzeAPI] Parent suggestions retrieved:', {
        count: suggestions.suggestions.length,
        topSuggestion: suggestions.suggestions[0]?.title,
        topConfidence: suggestions.suggestions[0]?.confidence
      });
    } catch (suggestionError) {
      console.error('[AnalyzeAPI] Failed to get parent suggestions:', suggestionError);
    }

    // Step 3: Analyze for duplicates
    console.log('[AnalyzeAPI] Analyzing for duplicates...');
    const similarActions = searchResults.results.map(action => ({
      id: action.id,
      title: action.title,
      description: action.description,
      score: Math.round(action.score * 100),
      matchType: action.matchType
    }));

    // Check for duplicates (80% threshold)
    const isDuplicate = similarActions.length > 0 && similarActions[0].score > 80;
    const duplicateAction = isDuplicate ? {
      id: similarActions[0].id,
      title: similarActions[0].title,
      similarity: similarActions[0].score / 100
    } : null;

    const recommendation = {
      isDuplicate,
      duplicateAction,
      parentSuggestions,
      reasoning: `Found ${similarActions.length} similar actions. ${isDuplicate ? 'Potential duplicate detected.' : 'No duplicates found.'} ${parentSuggestions ? `Generated ${parentSuggestions.suggestions.length} parent suggestions.` : 'Parent suggestions unavailable.'}`
    };

    console.log('[AnalyzeAPI] Analysis complete:', {
      isDuplicate: recommendation.isDuplicate,
      duplicateFound: recommendation.duplicateAction?.title,
      parentSuggestionsCount: recommendation.parentSuggestions?.suggestions?.length || 0
    });

    // Return the analysis results
    return NextResponse.json({
      success: true,
      data: {
        fields: actionFields,
        placement: {
          suggestions: recommendation.parentSuggestions?.suggestions || [],
          metadata: recommendation.parentSuggestions?.metadata || null,
          reasoning: recommendation.reasoning,
        },
        isDuplicate: recommendation.isDuplicate,
        duplicate: recommendation.duplicateAction,
      },
    });
  } catch (error) {
    console.error('[AnalyzeAPI] Endpoint failed:', error);
    
    if (error instanceof z.ZodError) {
      console.error('[AnalyzeAPI] Validation error:', error.errors);
      return NextResponse.json({
        success: false,
        error: 'Invalid input: ' + error.errors.map(e => e.message).join(', '),
      }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze action';
    console.error('[AnalyzeAPI] Final error response:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}