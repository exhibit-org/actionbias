import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";
import { actionDataSchema } from "../../../../db/schema";

const deleteActionSchema = z.object({
  child_handling: z.enum(["delete_recursive", "reparent"]).default("reparent"),
  new_parent_id: z.string().uuid().optional(),
});

const updateActionSchema = actionDataSchema.partial().extend({
  done: z.boolean().optional(),
}).refine(
  (data) => data.title !== undefined || data.description !== undefined || data.vision !== undefined || data.done !== undefined,
  {
    message: "At least one field (title, description, vision, or done) must be provided",
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Get the detailed action data with relationships
    const actionDetails = await ActionsService.getActionDetailResource(resolvedParams.id);
    
    // Get parent context and vision summaries
    const parentContextSummary = await ActionsService.getParentContextSummary(resolvedParams.id);
    const parentVisionSummary = await ActionsService.getParentVisionSummary(resolvedParams.id);
    
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
    console.error('Error getting action details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const updateParams = updateActionSchema.parse(body);
    const resolvedParams = await params;
    
    const result = await ActionsService.updateAction({
      action_id: resolvedParams.id,
      ...updateParams
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const deleteParams = deleteActionSchema.parse(body);
    const resolvedParams = await params;
    
    const result = await ActionsService.deleteAction({
      action_id: resolvedParams.id,
      ...deleteParams
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error deleting action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}