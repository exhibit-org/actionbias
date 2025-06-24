import { NextRequest, NextResponse } from "next/server";
import { ActionsService } from "../../../../../lib/services/actions";

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
    
    const description = await ActionsService.getFamilyContextSummary(actionId);

    return NextResponse.json({
      success: true,
      data: { description }
    });
  } catch (error) {
    console.error('Error generating family-context summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
