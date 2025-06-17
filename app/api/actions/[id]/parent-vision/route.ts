import { NextRequest, NextResponse } from "next/server";
import { ActionsService } from "../../../../../lib/services/actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const vision = await ActionsService.getParentVisionSummary(resolvedParams.id);

    return NextResponse.json({
      success: true,
      data: { vision }
    });
  } catch (error) {
    console.error('Error generating parent-vision summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
