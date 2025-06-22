/**
 * /actions/suggest-parents endpoint
 * 
 * Accept {title, description}, embed, K-NN search, return list with similarity scores & paths.
 * Stable JSON schema; monitored latency < 100 ms P95.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VectorPlacementService } from '../../../../lib/services/vector-placement';

// Request schema
const SuggestParentsRequestSchema = z.object({
  title: z.string().min(1).describe("The title for the new action"),
  description: z.string().optional().describe("Detailed description of what the action involves"),
  vision: z.string().optional().describe("The desired outcome when the action is complete"),
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
      limit = 15,
      threshold = 0.5,
      excludeIds = []
    } = validatedInput;

    // Use VectorPlacementService to find parent suggestions
    const result = await VectorPlacementService.findVectorParentSuggestions(
      { title, description, vision },
      {
        limit,
        similarityThreshold: threshold,
        excludeIds,
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
          queryEmbeddingLength: result.queryEmbedding.length
        }
      }
    };

    // Add performance logging for monitoring
    console.log(`[/actions/suggest-parents] Request completed in ${totalRequestTimeMs.toFixed(2)}ms`, {
      title: title.substring(0, 50),
      candidatesFound: result.candidates.length,
      threshold,
      limit,
      embeddingTimeMs: result.embeddingTimeMs,
      searchTimeMs: result.searchTimeMs,
      totalProcessingTimeMs: result.totalProcessingTimeMs
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
    description: 'Find potential parent actions using vector similarity search',
    schema: {
      request: {
        title: 'string (required) - The title for the new action',
        description: 'string (optional) - Detailed description of what the action involves',
        vision: 'string (optional) - The desired outcome when the action is complete',
        limit: 'number (optional, default: 15) - Maximum number of parent suggestions',
        threshold: 'number (optional, default: 0.5) - Minimum similarity threshold',
        excludeIds: 'string[] (optional) - Action IDs to exclude from suggestions'
      },
      response: {
        success: 'boolean - Whether the request was successful',
        data: {
          candidates: 'array - Parent candidate suggestions with similarity scores',
          metadata: 'object - Processing performance metrics'
        },
        error: 'string (optional) - Error message if request failed'
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