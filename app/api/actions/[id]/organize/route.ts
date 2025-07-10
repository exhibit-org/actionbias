import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../../lib/services/actions";

const organizeActionSchema = z.object({
  scope: z.enum(["action_only", "include_siblings", "include_subtree"]).optional().default("action_only"),
  limit: z.number().min(1).max(10).optional().default(5),
  confidence_threshold: z.number().min(0).max(100).optional().default(40),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const organizeParams = organizeActionSchema.parse(body);
    const resolvedParams = await params;
    const actionId = resolvedParams.id;
    
    // Validate that the ID looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(actionId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action ID format: "${actionId}". Expected a UUID.`
        },
        { status: 400 }
      );
    }
    
    const result = await ActionsService.organizeAction({
      action_id: actionId,
      ...organizeParams
    });
    
    // Prepare response message
    let message = "Organization analysis complete";
    if (result.suggestions.length === 0) {
      message = "The action appears to be well-organized! No suggestions found.";
    } else {
      message = `Found ${result.suggestions.length} organization suggestion${result.suggestions.length > 1 ? 's' : ''}`;
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message
    });
  } catch (error) {
    console.error('Error analyzing organization:', error);
    
    // Handle specific error cases
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input: " + error.errors.map(e => e.message).join(", ")
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}