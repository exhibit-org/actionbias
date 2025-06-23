import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../../lib/services/actions";

const treeQuerySchema = z.object({
  includeCompleted: z.coerce.boolean().default(false),
});

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large trees

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const rootActionId = resolvedParams.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rootActionId)) {
      return NextResponse.json({
        success: false,
        error: `Invalid action ID format: "${rootActionId}". Expected a UUID.`
      }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const params_query = treeQuerySchema.parse({
      includeCompleted: searchParams.get('includeCompleted'),
    });
    
    // Add timeout protection
    const timeoutMs = 45000; // 45 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scoped tree API timed out after 45 seconds')), timeoutMs);
    });
    
    // Get the scoped tree data
    const treeData = await Promise.race([
      ActionsService.getActionTreeResourceScoped(rootActionId, params_query.includeCompleted),
      timeoutPromise
    ]);
    
    return NextResponse.json({
      success: true,
      data: treeData,
      meta: {
        rootActionId,
        includeCompleted: params_query.includeCompleted,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error fetching scoped action tree:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: { rootActions: [] }
      },
      { status: 500 }
    );
  }
}