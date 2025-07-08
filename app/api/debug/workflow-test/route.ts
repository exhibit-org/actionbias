import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ActionsService } from '@/lib/services/actions';
import { ActionSearchService } from '@/lib/services/action-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    console.log('[WorkflowTest] Testing workflow with text:', text);

    // Test each component individually
    const results = {
      text,
      timestamp: new Date().toISOString(),
      tests: {
        searchActions: null as any,
        getActionTree: null as any,
        simpleWorkflow: null as any,
        toolWorkflow: null as any,
      }
    };

    // Test 1: Direct search
    try {
      console.log('[WorkflowTest] Testing direct search...');
      const searchResults = await ActionSearchService.searchActions(text, {
        limit: 5,
        searchMode: 'hybrid',
        includeCompleted: false,
        similarityThreshold: 0.3,
      });
      results.tests.searchActions = {
        success: true,
        resultCount: searchResults.results.length,
        results: searchResults.results.slice(0, 3).map(r => ({
          id: r.id,
          title: r.title,
          score: r.score,
          matchType: r.matchType
        }))
      };
      console.log('[WorkflowTest] Search test passed:', results.tests.searchActions.resultCount, 'results');
    } catch (error) {
      results.tests.searchActions = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('[WorkflowTest] Search test failed:', error);
    }

    // Test 2: Direct tree access
    try {
      console.log('[WorkflowTest] Testing direct tree access...');
      const tree = await ActionsService.getActionTreeResource();
      results.tests.getActionTree = {
        success: true,
        treeSize: Array.isArray(tree) ? tree.length : 'not-array',
        firstItems: Array.isArray(tree) ? tree.slice(0, 2).map((item: any) => ({
          id: item.id,
          title: item.title,
          hasChildren: item.children ? item.children.length : 0
        })) : 'tree-not-array'
      };
      console.log('[WorkflowTest] Tree test passed:', results.tests.getActionTree.treeSize, 'items');
    } catch (error) {
      results.tests.getActionTree = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('[WorkflowTest] Tree test failed:', error);
    }

    // Test 3: Simple LLM without tools
    try {
      console.log('[WorkflowTest] Testing simple LLM workflow...');
      const simplePrompt = `Analyze this action: "${text}"

Return a JSON object with:
{
  "isDuplicate": false,
  "duplicateAction": null,
  "recommendedParent": null,
  "reasoning": "This is a simple test without tools"
}`;

      const { text: simpleResult } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: simplePrompt,
      });

      console.log('[WorkflowTest] Simple LLM raw response:', simpleResult);

      try {
        const parsed = JSON.parse(simpleResult);
        results.tests.simpleWorkflow = {
          success: true,
          parsed: parsed
        };
      } catch (parseError) {
        results.tests.simpleWorkflow = {
          success: false,
          error: 'JSON parse failed',
          rawResponse: simpleResult
        };
      }
    } catch (error) {
      results.tests.simpleWorkflow = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('[WorkflowTest] Simple workflow failed:', error);
    }

    // Test 4: LLM with tools (like the real workflow)
    try {
      console.log('[WorkflowTest] Testing LLM with tools...');
      const toolPrompt = `Analyze this action: "${text}"

Use the available tools to search for similar actions and analyze the hierarchy.
Return ONLY a JSON object in this format:
{
  "isDuplicate": boolean,
  "duplicateAction": { "id": "...", "title": "...", "similarity": 0.95 } or null,
  "recommendedParent": { "id": "...", "title": "...", "reasoning": "..." } or null,
  "reasoning": "Your analysis"
}`;

      const { text: toolResult } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: toolPrompt,
        tools: {
          searchActions: {
            description: 'Search for actions using semantic similarity',
            parameters: z.object({
              query: z.string(),
              limit: z.number().optional(),
            }),
            execute: async ({ query, limit = 5 }) => {
              console.log('[WorkflowTest] Tool searchActions called with:', { query, limit });
              try {
                const results = await ActionSearchService.searchActions(query, {
                  limit,
                  searchMode: 'hybrid',
                  includeCompleted: false,
                  similarityThreshold: 0.3,
                });
                console.log('[WorkflowTest] Tool searchActions returned:', results.results.length, 'results');
                return results;
              } catch (error) {
                console.error('[WorkflowTest] Tool searchActions failed:', error);
                return { results: [], totalMatches: 0, searchQuery: query, searchMode: 'hybrid', metadata: {} };
              }
            },
          },
          getActionTree: {
            description: 'Get the hierarchical tree of all actions',
            parameters: z.object({}),
            execute: async () => {
              console.log('[WorkflowTest] Tool getActionTree called');
              try {
                const tree = await ActionsService.getActionTreeResource();
                console.log('[WorkflowTest] Tool getActionTree returned tree with', Array.isArray(tree) ? tree.length : 'unknown', 'items');
                return tree;
              } catch (error) {
                console.error('[WorkflowTest] Tool getActionTree failed:', error);
                return [];
              }
            },
          },
        },
      });

      console.log('[WorkflowTest] Tool LLM raw response:', toolResult);

      try {
        const parsed = JSON.parse(toolResult);
        results.tests.toolWorkflow = {
          success: true,
          parsed: parsed
        };
      } catch (parseError) {
        results.tests.toolWorkflow = {
          success: false,
          error: 'JSON parse failed',
          rawResponse: toolResult
        };
      }
    } catch (error) {
      results.tests.toolWorkflow = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('[WorkflowTest] Tool workflow failed:', error);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[WorkflowTest] Endpoint failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}