import { NextRequest, NextResponse } from "next/server";
import { ActionsService } from "../../../../../lib/services/actions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    const result = await ActionsService.updateAction({
      action_id: resolvedParams.id,
      done: false
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Action reopened successfully"
    });
  } catch (error) {
    console.error('Error uncompleting action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}