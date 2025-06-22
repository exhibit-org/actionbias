import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    console.log('Starting raw response debug...');
    
    // Get raw result without any processing
    const result = await db.execute(sql`
      SELECT 
        id,
        title,
        parent_context_summary,
        parent_vision_summary
      FROM ${actions}
      WHERE id = 'fc37de88-37ae-41d2-84f7-5bb230fac631'
    `);
    
    console.log('Raw database result type:', typeof result);
    console.log('Raw database result:', JSON.stringify(result, null, 2));
    
    return NextResponse.json({
      rawResult: result,
      resultType: typeof result,
      isArray: Array.isArray(result),
      hasRows: result && 'rows' in result,
      resultKeys: result ? Object.keys(result) : null,
      explanation: "This shows the completely unprocessed database result"
    });
    
  } catch (error) {
    console.error('Raw response debug error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}