import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../../lib/services/actions";

const completeActionSchema = z.object({
  implementation_story: z.string().min(1, "Implementation story is required"),
  impact_story: z.string().min(1, "Impact story is required"),
  learning_story: z.string().min(1, "Learning story is required"),
  changelog_visibility: z.enum(["private", "team", "public"]).default("team"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const completeParams = completeActionSchema.parse(body);
    const resolvedParams = await params;
    
    const result = await ActionsService.updateAction({
      action_id: resolvedParams.id,
      done: true,
      completion_context: completeParams
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Action completed successfully with completion context"
    });
  } catch (error) {
    console.error('Error completing action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}