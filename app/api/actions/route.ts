import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService, CreateActionParams, CreateActionResult, ListActionsParams } from "../../../lib/services/actions";
import { actionDataSchema } from "../../../db/schema";

const createActionSchema = actionDataSchema.extend({
  parent_id: z.string().uuid().optional(),
  depends_on_ids: z.array(z.string().uuid()).optional(),
  override_duplicate_check: z.boolean().optional(),
});

const listActionsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  done: z.coerce.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = createActionSchema.parse(body);
    
    const result = await ActionsService.createAction(params);
    
    // Check if duplicate warning was returned
    if (result.duplicate_warning) {
      return NextResponse.json({
        success: false,
        duplicate_warning: result.duplicate_warning,
        data: null
      }, { status: 409 }); // 409 Conflict
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating action:', error);
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
    const params = listActionsSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      done: searchParams.get('done'),
    });
    
    const actions = await ActionsService.listActions(params);
    
    return NextResponse.json({
      success: true,
      data: actions
    });
  } catch (error) {
    console.error('Error listing actions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}