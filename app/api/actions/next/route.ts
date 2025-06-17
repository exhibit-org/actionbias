import { NextRequest, NextResponse } from "next/server";
import { ActionsService } from "../../../../lib/services/actions";

export async function GET(request: NextRequest) {
  try {
    // Get the next action from the service
    const nextAction = await ActionsService.getNextAction();
    
    if (!nextAction) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }
    
    // Get the detailed action data with relationships
    const actionDetails = await ActionsService.getActionDetailResource(nextAction.id);
    
    // Get parent context and vision summaries
    const parentContextSummary = await ActionsService.getParentContextSummary(nextAction.id);
    const parentVisionSummary = await ActionsService.getParentVisionSummary(nextAction.id);
    
    // Enhance the action details with summaries
    const enhancedActionDetails = {
      ...actionDetails,
      parent_context_summary: parentContextSummary,
      parent_vision_summary: parentVisionSummary
    };
    
    return NextResponse.json({
      success: true,
      data: enhancedActionDetails
    });
  } catch (error) {
    console.error('Error getting next action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}