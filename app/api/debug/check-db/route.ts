import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Simple database connectivity test - just count total actions
    const result = await db
      .select({
        id: actions.id,
        data: actions.data,
        done: actions.done,
        createdAt: actions.createdAt
      })
      .from(actions)
      .limit(5);
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection working',
      totalActionsFound: result.length,
      sampleActions: result.map((action: typeof result[0]) => ({
        id: action.id,
        title: action.data?.title || 'No title',
        done: action.done,
        createdAt: action.createdAt
      }))
    });
    
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      error: `Failed query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    }, { status: 500 });
  }
}