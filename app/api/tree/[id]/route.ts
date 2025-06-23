import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";

const scopedTreeQuerySchema = z.object({
  includeCompleted: z.coerce.boolean().default(false),
});

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large trees

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let rootActionId: string | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = scopedTreeQuerySchema.parse({
      includeCompleted: searchParams.get('includeCompleted'),
    });
    
    const resolvedParams = await params;
    rootActionId = resolvedParams.id;
    
    if (!rootActionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Root action ID is required",
          data: { rootActions: [], rootAction: null, scope: null }
        },
        { status: 400 }
      );
    }
    
    // Validate that the ID looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rootActionId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action ID format: "${rootActionId}". Expected a UUID.`,
          data: { rootActions: [], rootAction: rootActionId, scope: rootActionId }
        },
        { status: 400 }
      );
    }
    
    // Add timeout protection like the MCP resource
    const timeoutMs = 45000; // 45 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scoped tree API timed out after 45 seconds')), timeoutMs);
    });
    
    // Get the scoped tree data using the new service method
    const treeData = await Promise.race([
      ActionsService.getActionTreeResourceScoped(rootActionId, queryParams.includeCompleted),
      timeoutPromise
    ]);
    
    return NextResponse.json({
      success: true,
      data: treeData,
      meta: {
        rootActionId,
        includeCompleted: queryParams.includeCompleted,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error fetching scoped action tree:', error);
    
    // Check if it's a "not found" error
    const isNotFound = error instanceof Error && error.message.includes('not found');
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: { 
          rootActions: [], 
          rootAction: rootActionId, 
          scope: rootActionId 
        }
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}