import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Test the exact query from getActionsWithoutParentSummaries
    const results = await db.execute(sql`
      SELECT 
        id,
        COALESCE(title, data->>'title') as title,
        COALESCE(description, data->>'description') as description,
        COALESCE(vision, data->>'vision') as vision,
        parent_context_summary,
        parent_vision_summary,
        created_at
      FROM ${actions}
      WHERE (parent_context_summary IS NULL OR parent_vision_summary IS NULL)
        AND COALESCE(title, data->>'title') IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
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
      success: true,
      resultType: typeof results,
      resultKeys: Object.keys(results || {}),
      rowCount: rows.length,
      rows: rows.map(row => ({
        id: row.id,
        title: row.title,
        has_parent_context: !!row.parent_context_summary,
        has_parent_vision: !!row.parent_vision_summary,
        created_at: row.created_at
      }))
    });
    
  } catch (error) {
    console.error('Error testing SQL query:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}