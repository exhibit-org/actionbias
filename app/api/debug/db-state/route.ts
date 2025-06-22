import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');
    
    if (!actionId) {
      return NextResponse.json({ error: 'actionId parameter required' }, { status: 400 });
    }
    
    const db = getDb();
    
    // Get the raw database values
    const result = await db
      .select({
        id: actions.id,
        title: actions.title,
        parent_context_summary: actions.parentContextSummary,
        parent_vision_summary: actions.parentVisionSummary,
        created_at: actions.createdAt,
        updated_at: actions.updatedAt
      })
      .from(actions)
      .where(eq(actions.id, actionId))
      .limit(1);
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }
    
    const action = result[0];
    
    return NextResponse.json({
      success: true,
      actionId: action.id,
      title: action.title,
      created_at: action.created_at,
      updated_at: action.updated_at,
      parent_context_summary_length: action.parent_context_summary?.length || 0,
      parent_vision_summary_length: action.parent_vision_summary?.length || 0,
      parent_context_summary_preview: action.parent_context_summary?.substring(0, 200) || null,
      parent_vision_summary_preview: action.parent_vision_summary?.substring(0, 200) || null,
      has_parent_context: !!action.parent_context_summary,
      has_parent_vision: !!action.parent_vision_summary
    });
    
  } catch (error) {
    console.error('Error checking database state:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}