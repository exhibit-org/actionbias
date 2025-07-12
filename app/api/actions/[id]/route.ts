import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";
import { actionDataSchema } from "../../../../db/schema";

const deleteActionSchema = z.object({
  child_handling: z.enum(["delete_recursive", "reparent"]).default("reparent"),
  new_parent_id: z.string().uuid().optional(),
});

// Schema allows updating title, description, vision, and family
// Use /complete or /uncomplete endpoints to change completion status
const updateActionSchema = actionDataSchema.partial().extend({
  new_family_id: z.string().uuid().optional().nullable(),
}).refine(
  (data) => data.title !== undefined || data.description !== undefined || data.vision !== undefined || data.new_family_id !== undefined,
  {
    message: "At least one field (title, description, vision, or new_family_id) must be provided",
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    
    // Get the detailed action data with relationships
    const actionDetails = await ActionsService.getActionDetailResource(actionId);
    
    // Return action details directly - let the UI handle placeholder text
    const enhancedActionDetails = actionDetails;
    
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
    
    let result;
    
    // Handle family updates separately
    if ('new_family_id' in updateParams) {
      result = await ActionsService.updateFamily({
        action_id: actionId,
        new_family_id: updateParams.new_family_id || undefined,
      });
      
      // Remove new_family_id from updateParams for regular update
      const { new_family_id, ...otherParams } = updateParams;
      
      // If there are other fields to update, do them separately
      if (Object.keys(otherParams).length > 0) {
        await ActionsService.updateAction({
          action_id: actionId,
          ...otherParams
        });
      }
    } else {
      result = await ActionsService.updateAction({
        action_id: actionId,
        ...updateParams
      });
    }
    
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
    
    const result = await ActionsService.deleteAction({
      action_id: actionId,
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