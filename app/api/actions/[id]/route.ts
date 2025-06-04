import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";

const deleteActionSchema = z.object({
  child_handling: z.enum(["delete_recursive", "orphan", "reparent"]).default("orphan"),
  new_parent_id: z.string().uuid().optional(),
});

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