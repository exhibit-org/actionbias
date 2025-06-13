import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";

const deleteActionSchema = z.object({
  child_handling: z.enum(["delete_recursive", "reparent"]).default("reparent"),
  new_parent_id: z.string().uuid().optional(),
});

const updateActionSchema = z.object({
  title: z.string().min(1).optional(),
  vision: z.string().optional(),
  done: z.boolean().optional(),
}).refine(
  (data) => data.title !== undefined || data.vision !== undefined || data.done !== undefined,
  {
    message: "At least one field (title, vision, or done) must be provided",
  }
);

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