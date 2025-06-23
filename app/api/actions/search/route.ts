/**
 * /actions/search endpoint
 * 
 * Provides powerful search capabilities for actions using vector embeddings (semantic search)
 * and keyword matching. Supports hybrid search that combines both approaches for optimal results.
 * Stable JSON schema; optimized for sub-100ms P95 latency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ActionSearchService, SearchResponse } from '../../../../lib/services/action-search';

// Request schema
const SearchRequestSchema = z.object({
  query: z.string().min(1).describe("Search query - can be keywords, phrases, or natural language description"),
  limit: z.number().min(1).max(50).default(10).optional().describe("Maximum number of results to return (default: 10)"),
  search_mode: z.enum(["vector", "keyword", "hybrid"]).default("hybrid").optional().describe("Search mode: 'vector' for semantic similarity, 'keyword' for exact/fuzzy text matching, 'hybrid' for both (default: hybrid)"),
  similarity_threshold: z.number().min(0).max(1).default(0.3).optional().describe("Minimum similarity threshold for vector search (0-1, default: 0.3). Lower values = more results"),
  include_completed: z.boolean().default(false).optional().describe("Include completed actions in results (default: false)"),
  exclude_ids: z.array(z.string().uuid()).optional().describe("Action IDs to exclude from search results"),
});

// Response schema for documentation
export interface ActionSearchApiResponse {
  success: boolean;
  data?: SearchResponse;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ActionSearchApiResponse>> {
  const startTime = performance.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedInput = SearchRequestSchema.parse(body);

    const {
      query,
      limit = 10,
      search_mode = "hybrid",
      similarity_threshold = 0.3,
      include_completed = false,
      exclude_ids = []
    } = validatedInput;

    console.log(`[/actions/search] Starting ${search_mode} search for: "${query}"`);

    // Perform search using ActionSearchService
    const searchResult = await ActionSearchService.searchActions(query, {
      limit,
      similarityThreshold: similarity_threshold,
      includeCompleted: include_completed,
      searchMode: search_mode,
      excludeIds: exclude_ids
    });

    const totalRequestTimeMs = performance.now() - startTime;

    // Build response
    const response: ActionSearchApiResponse = {
      success: true,
      data: searchResult
    };

    // Add performance logging for monitoring
    console.log(`[/actions/search] Request completed in ${totalRequestTimeMs.toFixed(2)}ms`, {
      query: query.substring(0, 50),
      searchMode: search_mode,
      resultsFound: searchResult.totalMatches,
      vectorMatches: searchResult.metadata.vectorMatches,
      keywordMatches: searchResult.metadata.keywordMatches,
      hybridMatches: searchResult.metadata.hybridMatches,
      processingTimeMs: searchResult.metadata.processingTimeMs,
      embeddingTimeMs: searchResult.metadata.embeddingTimeMs,
      searchTimeMs: searchResult.metadata.searchTimeMs
    });

    return NextResponse.json(response);

  } catch (error) {
    const totalRequestTimeMs = performance.now() - startTime;
    
    if (error instanceof z.ZodError) {
      console.error(`[/actions/search] Validation error (${totalRequestTimeMs.toFixed(2)}ms):`, error.errors);
      return NextResponse.json({
        success: false,
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      }, { status: 400 });
    }

    console.error(`[/actions/search] Internal error (${totalRequestTimeMs.toFixed(2)}ms):`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// GET method for health check and API documentation
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/actions/search',
    method: 'POST',
    description: 'Search for actions using vector embeddings (semantic search) and keyword matching. Supports hybrid search combining both approaches.',
    schema: {
      request: {
        query: 'string (required) - Search query (keywords, phrases, or natural language)',
        limit: 'number (optional, default: 10) - Maximum number of results to return',
        search_mode: 'string (optional, default: "hybrid") - Search mode: "vector", "keyword", or "hybrid"',
        similarity_threshold: 'number (optional, default: 0.3) - Minimum similarity threshold for vector search (0-1)',
        include_completed: 'boolean (optional, default: false) - Include completed actions in results',
        exclude_ids: 'string[] (optional) - Action IDs to exclude from search results'
      },
      response: {
        success: 'boolean - Whether the request was successful',
        data: {
          results: 'array - Search results with relevance scores and metadata',
          totalMatches: 'number - Total number of matches found',
          searchQuery: 'string - Original search query',
          searchMode: 'string - Search mode used',
          metadata: 'object - Performance metrics and search statistics'
        },
        error: 'string (optional) - Error message if request failed'
      }
    },
    examples: {
      semantic_search: {
        query: 'improve user experience',
        search_mode: 'vector',
        similarity_threshold: 0.5
      },
      keyword_search: {
        query: 'trigger semantic refresh',
        search_mode: 'keyword'
      },
      hybrid_search: {
        query: 'authentication login',
        search_mode: 'hybrid',
        limit: 15,
        include_completed: false
      },
      phrase_search: {
        query: 'database migration',
        search_mode: 'hybrid',
        similarity_threshold: 0.4
      }
    },
    features: {
      vector_search: 'Semantic similarity using OpenAI text-embedding-3-small',
      keyword_search: 'Fuzzy text matching with PostgreSQL ILIKE',
      hybrid_search: 'Combines vector and keyword approaches with intelligent ranking',
      performance: 'Optimized for sub-100ms response times',
      filtering: 'Support for excluding completed actions and specific IDs',
      hierarchy: 'Results include action hierarchy paths and depth information'
    },
    performance: {
      target: 'P95 latency < 100ms',
      components: {
        embedding: 'OpenAI text-embedding-3-small API call (~30-50ms)',
        vector_search: 'PostgreSQL pgvector similarity search with IVFFLAT index (~10-20ms)',
        keyword_search: 'PostgreSQL ILIKE pattern matching (~5-15ms)',
        post_processing: 'Hierarchy path building and result ranking (~5-10ms)'
      }
    }
  });
}