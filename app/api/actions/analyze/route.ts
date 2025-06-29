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

    // Now execute the create-action workflow with tool usage
    console.log('[AnalyzeAPI] Starting workflow analysis for placement and duplicates');
    
    let recommendation;
    try {
      const workflowPrompt = `I need to create a new action with these details:
Title: ${actionFields.title}
Description: ${actionFields.description || 'No description provided'}
Vision: ${actionFields.vision || 'No vision provided'}

Please help me find the best placement for this action by:

1. First, search for similar existing actions to avoid duplicates using the searchActions tool
2. Analyze the action hierarchy using getActionTree to find the most logical parent
3. Return your recommendation in this EXACT JSON format:

{
  "isDuplicate": boolean,
  "duplicateAction": { "id": "...", "title": "...", "similarity": 0.95 } or null,
  "recommendedParent": { "id": "...", "title": "...", "reasoning": "..." } or null,
  "reasoning": "Overall explanation of your recommendation"
}

IMPORTANT: You must use the available tools and return ONLY valid JSON. Do not include any explanatory text before or after the JSON.`;

      const { text: workflowResult } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: workflowPrompt,
        tools: {
          searchActions: {
            description: 'Search for actions using semantic similarity',
            parameters: z.object({
              query: z.string(),
              limit: z.number().optional(),
              searchMode: z.enum(['vector', 'keyword', 'hybrid']).optional(),
              includeCompleted: z.boolean().optional(),
            }),
            execute: async ({ query, limit = 10, searchMode = 'hybrid', includeCompleted = false }) => {
              console.log('[AnalyzeAPI] Tool: searchActions called with:', { query, limit, searchMode, includeCompleted });
              try {
                const results = await ActionSearchService.searchActions(query, {
                  limit,
                  searchMode,
                  includeCompleted,
                  similarityThreshold: 0.3,
                });
                console.log('[AnalyzeAPI] Tool: searchActions returned', results.results.length, 'results');
                return results;
              } catch (error) {
                console.error('[AnalyzeAPI] Tool: searchActions failed:', error);
                return { results: [], totalMatches: 0, searchQuery: query, searchMode, metadata: {} };
              }
            },
          },
          getActionTree: {
            description: 'Get the hierarchical tree of all actions',
            parameters: z.object({}),
            execute: async () => {
              console.log('[AnalyzeAPI] Tool: getActionTree called');
              try {
                const tree = await ActionsService.getActionTreeResource();
                console.log('[AnalyzeAPI] Tool: getActionTree returned tree with', Array.isArray(tree) ? tree.length : 'unknown', 'items');
                return tree;
              } catch (error) {
                console.error('[AnalyzeAPI] Tool: getActionTree failed:', error);
                return [];
              }
            },
          },
          getActionDetails: {
            description: 'Get details about a specific action',
            parameters: z.object({
              actionId: z.string().uuid(),
            }),
            execute: async ({ actionId }) => {
              console.log('[AnalyzeAPI] Tool: getActionDetails called with:', actionId);
              try {
                const action = await ActionsService.getActionDetailResource(actionId);
                console.log('[AnalyzeAPI] Tool: getActionDetails returned action:', action?.title || 'unknown');
                return action;
              } catch (error) {
                console.error('[AnalyzeAPI] Tool: getActionDetails failed:', error);
                return null;
              }
            },
          },
        },
      });

      console.log('[AnalyzeAPI] Workflow LLM response:', workflowResult.substring(0, 200));

      try {
        recommendation = JSON.parse(workflowResult);
        console.log('[AnalyzeAPI] Successfully parsed workflow recommendation:', recommendation);
      } catch (parseError) {
        console.error('[AnalyzeAPI] Failed to parse workflow result as JSON:', parseError);
        console.log('[AnalyzeAPI] Raw workflow result:', workflowResult);
        
        // Fallback recommendation
        recommendation = {
          isDuplicate: false,
          duplicateAction: null,
          recommendedParent: null,
          reasoning: 'Could not parse LLM workflow result',
        };
      }
    } catch (workflowError) {
      console.error('[AnalyzeAPI] Workflow analysis failed completely:', workflowError);
      recommendation = {
        isDuplicate: false,
        duplicateAction: null,
        recommendedParent: null,
        reasoning: 'Workflow analysis failed: ' + (workflowError instanceof Error ? workflowError.message : 'Unknown error'),
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