import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Run the exact same query as getActionsWithoutParentSummaries
    const results = await db.execute(sql`
      SELECT 
        id,
        COALESCE(title, data->>'title') as title,
        COALESCE(description, data->>'description') as description,
        COALESCE(vision, data->>'vision') as vision,
        parent_context_summary,
        parent_vision_summary
      FROM ${actions}
      WHERE (parent_context_summary IS NULL OR parent_vision_summary IS NULL)
        AND COALESCE(title, data->>'title') IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    // Handle different database result formats
    let rows: any[] = [];
    
    if (Array.isArray(results)) {
      rows = results;
    } else if (results.rows && Array.isArray(results.rows)) {
      rows = results.rows;
    } else if (results && typeof results[Symbol.iterator] === 'function') {
      rows = [...results];
    } else if (results && results.length !== undefined) {
      rows = Array.prototype.slice.call(results);
    }
    
    return NextResponse.json({
      query: "SELECT id, title, parent_context_summary, parent_vision_summary FROM actions WHERE (parent_context_summary IS NULL OR parent_vision_summary IS NULL) AND title IS NOT NULL",
      totalFound: rows.length,
      results: rows,
      targetActionFound: rows.some(r => r.id === 'fc37de88-37ae-41d2-84f7-5bb230fac631'),
      targetAction: rows.find(r => r.id === 'fc37de88-37ae-41d2-84f7-5bb230fac631') || null
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}