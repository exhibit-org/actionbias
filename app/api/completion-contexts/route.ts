import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompletionContextService, CreateCompletionContextParams } from "../../../lib/services/completion-context";

const createCompletionContextSchema = z.object({
  actionId: z.string().uuid(),
  implementationStory: z.string().optional(),
  impactStory: z.string().optional(),
  learningStory: z.string().optional(),
  changelogVisibility: z.enum(["private", "team", "public"]).default("team"),
  structuredData: z.record(z.any()).optional(),
});

const listCompletionContextsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  visibility: z.enum(["private", "team", "public"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = createCompletionContextSchema.parse(body);
    
    const result = await CompletionContextService.createCompletionContext(params);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating completion context:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = listCompletionContextsSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      visibility: searchParams.get('visibility'),
    });
    
    const contexts = await CompletionContextService.listCompletionContexts(params);
    
    return NextResponse.json({
      success: true,
      data: contexts
    });
  } catch (error) {
    console.error('Error listing completion contexts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}