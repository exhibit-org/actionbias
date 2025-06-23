/**
 * /actions/suggest-parents endpoint
 * 
 * Accept {title, description}, embed, K-NN search, return list with similarity scores & paths.
 * Stable JSON schema; monitored latency < 100 ms P95.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VectorPlacementService } from '../../../../lib/services/vector-placement';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

// Request schema
const SuggestParentsRequestSchema = z.object({
  title: z.string().default("").describe("The title for the new action (optional if action_id is provided)"),
  description: z.string().optional().describe("Detailed description of what the action involves"),
  vision: z.string().optional().describe("The desired outcome when the action is complete"),
  action_id: z.string().uuid().optional().describe("Optional action ID to exclude from suggestions, or provide to fetch action data automatically"),
  limit: z.number().min(1).max(50).default(15).optional().describe("Maximum number of parent suggestions (default: 15)"),
  threshold: z.number().min(0).max(1).default(0.5).optional().describe("Minimum similarity threshold (default: 0.5)"),
  excludeIds: z.array(z.string().uuid()).optional().describe("Action IDs to exclude from suggestions")
});

// Response schema for documentation
export interface SuggestParentsResponse {
  success: boolean;
  data?: {
    candidates: Array<{
      id: string;
      title: string;
      description?: string;
      similarity: number;
      hierarchyPath: string[];
      depth: number;
    }>;
    metadata: {
      totalCandidates: number;
      processingTimeMs: number;
      embeddingTimeMs: number;
      searchTimeMs: number;
      queryEmbeddingLength: number;
      autoFetched?: boolean;
      sourceActionId?: string;
      fetchedTitle?: string;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SuggestParentsResponse>> {
  const startTime = performance.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedInput = SuggestParentsRequestSchema.parse(body);

    const {
      title,
      description,
      vision,
      action_id,
      limit = 15,
      threshold = 0.5,
      excludeIds = []
    } = validatedInput;

    // Prepare action data and exclude IDs
    let actionData = { title, description, vision };
    let finalExcludeIds = [...(excludeIds || [])];
    
    // If action_id is provided, either fetch the action data or use it for exclusion
    if (action_id) {
      finalExcludeIds.push(action_id);
      
      // If no title provided (empty string), fetch action data from database
      if (!title || title.trim() === "") {
        try {
          const actionResult = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
          if (actionResult.length === 0) {
            return NextResponse.json({
              success: false,
              error: `Action with ID ${action_id} not found`
            }, { status: 404 });
          }
          
          const action = actionResult[0];
          actionData = {
            title: action.data?.title || action.title || 'untitled',
            description: description || action.data?.description || action.description,
            vision: vision || action.data?.vision || action.vision
          };
        } catch (fetchError) {
          return NextResponse.json({
            success: false,
            error: `Error fetching action data: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`
          }, { status: 500 });
        }
      }
    }
    
    // Validate that we have a title either provided or fetched
    if (!actionData.title || actionData.title.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "Either 'title' parameter or 'action_id' (to fetch title automatically) must be provided"
      }, { status: 400 });
    }

    // Use VectorPlacementService to find parent suggestions
    const result = await VectorPlacementService.findVectorParentSuggestions(
      actionData,
      {
        limit,
        similarityThreshold: threshold,
        excludeIds: finalExcludeIds,
        includeHierarchyPaths: true
      }
    );

    const totalRequestTimeMs = performance.now() - startTime;

    // Build response
    const response: SuggestParentsResponse = {
      success: true,
      data: {
        candidates: result.candidates,
        metadata: {
          totalCandidates: result.candidates.length,
          processingTimeMs: result.totalProcessingTimeMs,
          embeddingTimeMs: result.embeddingTimeMs,
          searchTimeMs: result.searchTimeMs,
          queryEmbeddingLength: result.queryEmbedding.length,
          ...(action_id && (!title || title.trim() === "") && {
            autoFetched: true,
            sourceActionId: action_id,
            fetchedTitle: actionData.title
          })
        }
      }
    };

    // Add performance logging for monitoring
    console.log(`[/actions/suggest-parents] Request completed in ${totalRequestTimeMs.toFixed(2)}ms`, {
      title: actionData.title.substring(0, 50),
      candidatesFound: result.candidates.length,
      threshold,
      limit,
      embeddingTimeMs: result.embeddingTimeMs,
      searchTimeMs: result.searchTimeMs,
      totalProcessingTimeMs: result.totalProcessingTimeMs,
      autoFetched: action_id && (!title || title.trim() === "")
    });

    return NextResponse.json(response);

  } catch (error) {
    const totalRequestTimeMs = performance.now() - startTime;
    
    if (error instanceof z.ZodError) {
      console.error(`[/actions/suggest-parents] Validation error (${totalRequestTimeMs.toFixed(2)}ms):`, error.errors);
      return NextResponse.json({
        success: false,
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      }, { status: 400 });
    }

    console.error(`[/actions/suggest-parents] Internal error (${totalRequestTimeMs.toFixed(2)}ms):`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// GET method for health check and API documentation
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/actions/suggest-parents',
    method: 'POST',
    description: 'Find potential parent actions using vector similarity search. Can accept either action details or just an action_id to fetch data automatically.',
    schema: {
      request: {
        title: 'string (optional if action_id provided) - The title for the new action',
        description: 'string (optional) - Detailed description of what the action involves',
        vision: 'string (optional) - The desired outcome when the action is complete',
        action_id: 'string (optional) - Action ID to exclude from suggestions, or provide to fetch action data automatically',
        limit: 'number (optional, default: 15) - Maximum number of parent suggestions',
        threshold: 'number (optional, default: 0.5) - Minimum similarity threshold',
        excludeIds: 'string[] (optional) - Action IDs to exclude from suggestions'
      },
      response: {
        success: 'boolean - Whether the request was successful',
        data: {
          candidates: 'array - Parent candidate suggestions with similarity scores',
          metadata: 'object - Processing performance metrics (includes autoFetched info when applicable)'
        },
        error: 'string (optional) - Error message if request failed'
      }
    },
    usage: {
      traditional: {
        title: 'Implement user authentication',
        description: 'Add login/logout functionality',
        threshold: 0.7
      },
      autoFetch: {
        action_id: 'ca4d843e-332d-4975-bf84-568f5ff3d2e0'
      }
    },
    performance: {
      target: 'P95 latency < 100ms',
      components: {
        embedding: 'OpenAI text-embedding-3-small API call',
        search: 'PostgreSQL pgvector similarity search with IVFFLAT index'
      }
    }
  });
}