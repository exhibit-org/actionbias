import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../../lib/services/actions";

// Request schema based on API design specification
const suggestChildrenSchema = z.object({
  max_suggestions: z.number().min(1).max(10).default(5).optional(),
  include_reasoning: z.boolean().default(true).optional(),
  complexity_level: z.enum(['simple', 'detailed', 'comprehensive']).default('detailed').optional(),
  custom_context: z.string().optional(),
});

// Response types matching the API specification
interface ChildActionSuggestion {
  index: number;
  title: string;
  description: string;
  reasoning?: string;
  confidence: number;
}

interface DependencyRelationship {
  dependent_index: number;
  depends_on_index: number;
  reasoning?: string;
  dependency_type: 'sequential' | 'prerequisite' | 'informational';
}

interface SuggestChildrenResponse {
  success: boolean;
  data?: {
    action: {
      id: string;
      title: string;
      description?: string;
      vision?: string;
    };
    suggestions: ChildActionSuggestion[];
    dependencies: DependencyRelationship[];
    metadata: {
      processingTimeMs: number;
      aiModel: 'gpt-4o-mini';
      analysisDepth: string;
    };
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SuggestChildrenResponse>> {
  const startTime = performance.now();

  try {
    // Parse and validate request parameters
    const resolvedParams = await params;
    const actionId = resolvedParams.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(actionId)) {
      return NextResponse.json({
        success: false,
        error: `Invalid action ID format: "${actionId}". Expected a UUID.`
      }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedInput = suggestChildrenSchema.parse(body);

    console.log(`[/api/actions/${actionId}/suggest-children] Processing request with params:`, {
      actionId,
      max_suggestions: validatedInput.max_suggestions,
      include_reasoning: validatedInput.include_reasoning,
      complexity_level: validatedInput.complexity_level
    });

    // Check if action exists and is valid for breakdown
    let actionResult;
    try {
      actionResult = await ActionsService.getActionWithContext(actionId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: `Action with ID '${actionId}' not found`
        }, { status: 404 });
      }
      throw error;
    }

    // Check if action is already completed
    if (actionResult.done) {
      return NextResponse.json({
        success: false,
        error: "Action is already completed and cannot be broken down"
      }, { status: 422 });
    }

    // Call ActionsService to generate breakdown suggestions
    const result = await ActionsService.decomposeAction({
      action_id: actionId,
      max_suggestions: validatedInput.max_suggestions,
      include_reasoning: validatedInput.include_reasoning,
      custom_context: validatedInput.custom_context
    });

    // Map the service response to API response format
    const suggestions: ChildActionSuggestion[] = result.suggestions.map(suggestion => ({
      index: suggestion.index,
      title: suggestion.title,
      description: suggestion.description || '',
      reasoning: validatedInput.include_reasoning ? suggestion.reasoning : undefined,
      confidence: suggestion.confidence
    }));

    const dependencies: DependencyRelationship[] = result.dependencies.map(dependency => ({
      dependent_index: dependency.dependent_index,
      depends_on_index: dependency.depends_on_index,
      reasoning: validatedInput.include_reasoning ? dependency.reasoning : undefined,
      dependency_type: 'prerequisite' as const // Default type, could be enhanced in the future
    }));

    const processingTimeMs = performance.now() - startTime;

    const response: SuggestChildrenResponse = {
      success: true,
      data: {
        action: {
          id: result.action.id,
          title: result.action.title || result.action.data?.title || 'Untitled Action',
          description: result.action.description || result.action.data?.description,
          vision: result.action.vision || result.action.data?.vision
        },
        suggestions,
        dependencies,
        metadata: {
          processingTimeMs,
          aiModel: 'gpt-4o-mini',
          analysisDepth: validatedInput.complexity_level || 'detailed'
        }
      }
    };

    // Add performance logging
    console.log(`[/api/actions/${actionId}/suggest-children] Request completed`, {
      actionId,
      processingTimeMs,
      suggestionsGenerated: suggestions.length,
      dependenciesFound: dependencies.length,
      complexity: validatedInput.complexity_level,
      success: true
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTimeMs = performance.now() - startTime;
    
    console.error(`[/api/actions/[id]/suggest-children] Error processing request:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs
    });

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      }, { status: 400 });
    }

    // Handle specific known errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 404 });
      }

      if (error.message.includes('AI service') || error.message.includes('OpenAI')) {
        return NextResponse.json({
          success: false,
          error: 'AI service temporarily unavailable. Please try again later.'
        }, { status: 503 });
      }
    }

    // Generic server error
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while generating suggestions'
    }, { status: 500 });
  }
}

// GET method for API documentation and health check
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  
  return NextResponse.json({
    endpoint: `/api/actions/${resolvedParams.id}/suggest-children`,
    method: 'POST',
    description: 'Generate AI-powered child action suggestions with dependency relationships for the specified action',
    schema: {
      request: {
        max_suggestions: 'number (optional, 1-10, default: 5) - Maximum number of child action suggestions',
        include_reasoning: 'boolean (optional, default: true) - Include AI reasoning for suggestions',
        complexity_level: 'string (optional, default: "detailed") - Analysis depth: "simple", "detailed", or "comprehensive"'
      },
      response: {
        success: 'boolean - Whether the request was successful',
        data: {
          action: 'object - Original action details (id, title, description, vision)',
          suggestions: 'array - Child action suggestions with titles, descriptions, and confidence scores',
          dependencies: 'array - Dependency relationships between suggested actions',
          metadata: 'object - Processing time, AI model, and analysis depth information'
        },
        error: 'string (optional) - Error message if request failed'
      }
    },
    examples: {
      request: {
        max_suggestions: 5,
        include_reasoning: true,
        complexity_level: 'detailed'
      },
      response: {
        success: true,
        data: {
          action: {
            id: 'uuid',
            title: 'Build API endpoints and UI integration',
            description: 'Create the API endpoints and integrate functionality'
          },
          suggestions: [
            {
              index: 0,
              title: 'Design API Endpoint Structure',
              description: 'Outline the structure and functionality of the API endpoint',
              reasoning: 'A well-defined API structure is essential for implementation',
              confidence: 0.9
            }
          ],
          dependencies: [
            {
              dependent_index: 1,
              depends_on_index: 0,
              reasoning: 'Implementation requires design to be completed first',
              dependency_type: 'prerequisite'
            }
          ],
          metadata: {
            processingTimeMs: 2150,
            aiModel: 'gpt-4o-mini',
            analysisDepth: 'detailed'
          }
        }
      }
    },
    requirements: {
      actionId: 'Must be a valid UUID',
      actionStatus: 'Action must not be completed',
      authentication: 'Follows existing auth patterns',
      rateLimit: '10 requests per minute per user'
    }
  });
}