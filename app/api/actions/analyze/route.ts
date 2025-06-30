import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';
import { ActionsService } from '@/lib/services/actions';
import { ActionSearchService } from '@/lib/services/action-search';

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

    // Pre-load all the data that the MCP workflow would gather
    console.log('[AnalyzeAPI] Pre-loading context data for LLM analysis...');
    
    let recommendation;
    try {
      // Step 1: Search for similar actions (for duplicate detection)
      console.log('[AnalyzeAPI] Searching for similar actions...');
      const searchResults = await ActionSearchService.searchActions(actionFields.title, {
        limit: 10,
        searchMode: 'hybrid',
        includeCompleted: false,
        similarityThreshold: 0.3,
      });

      // Step 2: Get action tree (for parent recommendations)
      console.log('[AnalyzeAPI] Getting action tree...');
      let actionTree: { rootActions: any[] } = { rootActions: [] };
      try {
        actionTree = await ActionsService.getActionTreeResource();
      } catch (treeError) {
        console.error('[AnalyzeAPI] Failed to get action tree:', treeError);
        actionTree = { rootActions: [] };
      }

      // Step 3: Format the context data for the LLM
      const similarActions = searchResults.results.map(action => ({
        id: action.id,
        title: action.title,
        description: action.description,
        score: Math.round(action.score * 100),
        matchType: action.matchType
      }));

      // Create a comprehensive prompt with all the pre-loaded data
      const contextPrompt = `I need to analyze placement for this new action:

NEW ACTION:
Title: ${actionFields.title}
Description: ${actionFields.description || 'No description provided'}
Vision: ${actionFields.vision || 'No vision provided'}

SIMILAR ACTIONS FOUND (${similarActions.length} results):
${similarActions.map(action => 
  `- ID: ${action.id} | Title: "${action.title}" (${action.score}% match) - ${action.description || 'No description'}`
).join('\n') || 'No similar actions found'}

ACTION HIERARCHY CONTEXT:
${actionTree.rootActions.length > 0 ? 
  actionTree.rootActions.slice(0, 10).map(item => `- ID: ${item.id} | Title: "${item.title}" (${item.children?.length || 0} children)`).join('\n') :
  'Action hierarchy not available'}

ANALYSIS TASK:
1. Check for duplicates: Is any similar action above 80% match and essentially the same?
2. Recommend parent: Based on the hierarchy, what would be the best parent action?
3. Provide clear reasoning for your decisions

Return ONLY this JSON format:
{
  "isDuplicate": boolean,
  "duplicateAction": { "id": "uuid-from-similar-actions", "title": "...", "similarity": 0.95 } or null,
  "recommendedParent": { "id": "uuid-from-hierarchy", "title": "...", "reasoning": "..." } or null,
  "reasoning": "Your analysis and reasoning"
}

IMPORTANT: Use the actual UUID from the ID field (e.g., "c70f8794-ce64-44dc-9156-fb662f40b6b2"), NOT the title.`;

      console.log('[AnalyzeAPI] Sending context-rich prompt to LLM...');
      
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          isDuplicate: z.boolean(),
          duplicateAction: z.object({
            id: z.string().uuid(),
            title: z.string(),
            similarity: z.number()
          }).nullable(),
          recommendedParent: z.object({
            id: z.string().uuid(),
            title: z.string(),
            reasoning: z.string()
          }).nullable(),
          reasoning: z.string()
        }),
        prompt: contextPrompt,
      });

      recommendation = object;
      console.log('[AnalyzeAPI] LLM analysis complete:', {
        isDuplicate: recommendation.isDuplicate,
        duplicateFound: recommendation.duplicateAction?.title,
        parentRecommended: recommendation.recommendedParent?.title
      });

    } catch (workflowError) {
      console.error('[AnalyzeAPI] Context-based workflow failed:', workflowError);
      
      // Fallback to simple analysis if LLM fails
      const searchResults = await ActionSearchService.searchActions(actionFields.title, {
        limit: 5,
        searchMode: 'hybrid',
        includeCompleted: false,
        similarityThreshold: 0.8,
      });

      const isDuplicate = searchResults.results.length > 0 && searchResults.results[0].score > 0.8;
      const duplicateAction = isDuplicate ? {
        id: searchResults.results[0].id,
        title: searchResults.results[0].title,
        similarity: searchResults.results[0].score
      } : null;

      recommendation = {
        isDuplicate,
        duplicateAction,
        recommendedParent: null,
        reasoning: `Fallback analysis: Found ${searchResults.results.length} similar actions. ${isDuplicate ? 'Potential duplicate detected.' : 'No duplicates found.'}`
      };
    }

    // Return the analysis results
    return NextResponse.json({
      success: true,
      data: {
        fields: actionFields,
        placement: {
          parent: recommendation.recommendedParent,
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