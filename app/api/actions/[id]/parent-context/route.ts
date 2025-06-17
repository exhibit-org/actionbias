import { NextRequest, NextResponse } from "next/server";
import { ActionsService } from "../../../../../lib/services/actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const description = await ActionsService.getParentContextSummary(resolvedParams.id);

    return NextResponse.json({
      success: true,
      data: { description }
    });
  } catch (error) {
    console.error('Error generating parent-context summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
