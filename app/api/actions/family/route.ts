import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../lib/services/actions";

const addFamilyActionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  vision: z.string().optional(),
  parent_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = addFamilyActionSchema.parse(body);
    
    const result = await ActionsService.addFamilyAction(params);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating family action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}