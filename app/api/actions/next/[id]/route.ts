import { NextRequest, NextResponse } from "next/server";
import { ActionsService } from "../../../../../lib/services/actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const scopeId = resolvedParams.id;
    
    // Validate that the ID looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(scopeId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action ID format: "${scopeId}". Expected a UUID.`
        },
        { status: 400 }
      );
    }

    const nextAction = await ActionsService.getNextActionScoped(scopeId);

    if (!nextAction) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    const actionDetails = await ActionsService.getActionDetailResource(nextAction.id);

    const enhancedActionDetails = {
      ...actionDetails,
      parent_context_summary: actionDetails.parent_context_summary || 'This action has no parent context.',
      parent_vision_summary: actionDetails.parent_vision_summary || 'This action has no parent vision context.'
    };

    return NextResponse.json({
      success: true,
      data: enhancedActionDetails
    });
  } catch (error) {
    console.error('Error getting scoped next action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
