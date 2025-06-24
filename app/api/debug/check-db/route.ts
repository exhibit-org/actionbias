import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId') || 'fc37de88-37ae-41d2-84f7-5bb230fac631';
    
    const db = getDb();
    
    // Get the raw database values without any fallbacks
    const result = await db
      .select({
        id: actions.id,
        title: actions.title,
        family_context_summary: actions.familyContextSummary,
        family_vision_summary: actions.familyVisionSummary
      })
      .from(actions)
      .where(eq(actions.id, actionId))
      .limit(1);
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }
    
    const action = result[0];
    
    return NextResponse.json({
      actionId: action.id,
      title: action.title,
      parent_context_summary_raw: action.parent_context_summary,
      parent_vision_summary_raw: action.parent_vision_summary,
      parent_context_is_null: action.parent_context_summary === null,
      parent_vision_is_null: action.parent_vision_summary === null
    });
    
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}