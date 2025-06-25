import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { actions } from '@/db/schema';
import { eq, isNotNull, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('id');
    
    if (actionId) {
      // Get specific action
      const result = await getDb()
        .select({
          id: actions.id,
          title: actions.title,
          familyContextSummary: actions.familyContextSummary,
          familyVisionSummary: actions.familyVisionSummary,
          createdAt: actions.createdAt,
          updatedAt: actions.updatedAt,
        })
        .from(actions)
        .where(eq(actions.id, actionId))
        .limit(1);
      
      if (result.length === 0) {
        return NextResponse.json({ error: 'Action not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        action: result[0],
        hasFamilyContext: !!result[0].familyContextSummary,
        hasFamilyVision: !!result[0].familyVisionSummary,
      });
    } else {
      // Get recent actions with family summaries
      const result = await getDb()
        .select({
          id: actions.id,
          title: actions.title,
          familyContextSummary: actions.familyContextSummary,
          familyVisionSummary: actions.familyVisionSummary,
          createdAt: actions.createdAt,
        })
        .from(actions)
        .where(isNotNull(actions.familyContextSummary))
        .orderBy(desc(actions.createdAt))
        .limit(10);
      
      return NextResponse.json({
        actionsWithFamilySummaries: result,
        count: result.length,
      });
    }
  } catch (error) {
    console.error('Error checking family summaries:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}