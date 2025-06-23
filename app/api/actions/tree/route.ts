import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";

const treeQuerySchema = z.object({
  includeCompleted: z.string().optional().transform(val => {
    if (val === null || val === undefined) return false;
    return val === 'true';
  }),
}).transform(data => ({
  includeCompleted: data.includeCompleted ?? false
}));

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large trees

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = treeQuerySchema.parse({
      includeCompleted: searchParams.get('includeCompleted'),
    });
    
    // Add timeout protection like the MCP resource
    const timeoutMs = 45000; // 45 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tree API timed out after 45 seconds')), timeoutMs);
    });
    
    // Get the tree data using the same method as the MCP resource
    const treeData = await Promise.race([
      ActionsService.getActionTreeResource(params.includeCompleted),
      timeoutPromise
    ]);
    
    return NextResponse.json({
      success: true,
      data: treeData,
      meta: {
        includeCompleted: params.includeCompleted,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error fetching action tree:', error);
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