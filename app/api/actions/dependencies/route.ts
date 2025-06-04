import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";

const addDependencySchema = z.object({
  action_id: z.string().uuid(),
  depends_on_id: z.string().uuid(),
});

const removeDependencySchema = z.object({
  action_id: z.string().uuid(),
  depends_on_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = addDependencySchema.parse(body);
    
    const result = await ActionsService.addDependency(params);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating dependency:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const params = removeDependencySchema.parse(body);
    
    const result = await ActionsService.removeDependency(params);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error removing dependency:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}