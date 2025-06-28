import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ActionsService } from '@/lib/services/actions';
import { ActionSearchService } from '@/lib/services/action-search';

const analyzeActionSchema = z.object({
  text: z.string().min(1).max(500),
  createAction: z.boolean().optional().default(false), // Only create if explicitly requested
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, createAction } = analyzeActionSchema.parse(body);

    // First, parse the text into structured fields
    const parsePrompt = `Parse this action request into structured fields. Be specific and action-oriented:

"${text}"

Return a JSON object with:
- title: Short, starts with a verb, clearly states the action
- description: Expand on the title with context, requirements, and approach
- vision: Describe what success looks like when this is done`;

    const { text: parsedText } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: parsePrompt,
    });

    let actionFields;
    try {
      actionFields = JSON.parse(parsedText);
    } catch (e) {
      // Fallback if JSON parsing fails
      actionFields = {
        title: text.slice(0, 100),
        description: text,
        vision: `Successfully complete: ${text}`,
      };
    }

    // Now execute the create-action workflow
    const workflowPrompt = `I need to create a new action with these details:
Title: ${actionFields.title}
Description: ${actionFields.description || 'No description provided'}
Vision: ${actionFields.vision || 'No vision provided'}

Please help me find the best placement for this action by:

1. First, search for similar existing actions to avoid duplicates
2. Analyze the action hierarchy to find the most logical parent
3. Return your recommendation in this JSON format:
{
  "isDuplicate": boolean,
  "duplicateAction": { "id": "...", "title": "...", "similarity": 0.95 } or null,
  "recommendedParent": { "id": "...", "title": "...", "reasoning": "..." } or null,
  "reasoning": "Overall explanation of your recommendation"
}`;

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
            const results = await ActionSearchService.searchActions(query, {
              limit,
              searchMode,
              includeCompleted,
              similarityThreshold: 0.3,
            });
            return results;
          },
        },
        getActionTree: {
          description: 'Get the hierarchical tree of all actions',
          parameters: z.object({}),
          execute: async () => {
            const tree = await ActionsService.getActionTreeResource();
            return tree;
          },
        },
        getActionDetails: {
          description: 'Get details about a specific action',
          parameters: z.object({
            actionId: z.string().uuid(),
          }),
          execute: async ({ actionId }) => {
            const action = await ActionsService.getActionDetailResource(actionId);
            return action;
          },
        },
      },
    });

    let recommendation;
    try {
      recommendation = JSON.parse(workflowResult);
    } catch (e) {
      console.error('Failed to parse workflow result:', e);
      recommendation = {
        isDuplicate: false,
        duplicateAction: null,
        recommendedParent: null,
        reasoning: 'Could not analyze action placement',
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
    console.error('Error creating action with AI:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create action',
    }, { status: 500 });
  }
}