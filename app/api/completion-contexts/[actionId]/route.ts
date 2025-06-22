import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompletionContextService, UpdateCompletionContextParams } from "../../../../lib/services/completion-context";

const updateCompletionContextSchema = z.object({
  implementationStory: z.string().optional(),
  impactStory: z.string().optional(),
  learningStory: z.string().optional(),
  changelogVisibility: z.enum(["private", "team", "public"]).optional(),
  structuredData: z.record(z.any()).optional(),
}).refine(
  (data) => data.implementationStory !== undefined || 
           data.impactStory !== undefined || 
           data.learningStory !== undefined || 
           data.changelogVisibility !== undefined || 
           data.structuredData !== undefined,
  {
    message: "At least one field must be provided for update",
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const resolvedParams = await params;
    
    const context = await CompletionContextService.getCompletionContext(resolvedParams.actionId);
    
    if (!context) {
      return NextResponse.json(
        {
          success: false,
          error: "Completion context not found"
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Error getting completion context:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const body = await request.json();
    const updateParams = updateCompletionContextSchema.parse(body);
    const resolvedParams = await params;
    
    const result = await CompletionContextService.upsertCompletionContext({
      actionId: resolvedParams.actionId,
      ...updateParams
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating completion context:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const resolvedParams = await params;
    
    const result = await CompletionContextService.deleteCompletionContext(resolvedParams.actionId);
    
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Completion context not found"
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error deleting completion context:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}