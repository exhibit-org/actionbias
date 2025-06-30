import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('[CheckInvalidUUIDs] Checking for invalid UUID data...');
    
    // Check for actions with invalid UUIDs in id field (cast to text for regex)
    const invalidIds = await sql`
      SELECT id::text, title 
      FROM actions 
      WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      LIMIT 10;
    `;
    
    // Check for actions with invalid parent_id values in edges table
    const invalidParentIds = await sql`
      SELECT e.src::text, e.dst::text, a.title
      FROM edges e
      JOIN actions a ON a.id = e.src
      WHERE e.kind = 'parent'
      AND (
        e.dst::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        OR e.src::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
      LIMIT 10;
    `;
    
    // Check for orphaned edges (referencing non-existent actions)
    const orphanedEdges = await sql`
      SELECT e.src, e.dst, e.kind
      FROM edges e
      LEFT JOIN actions a1 ON a1.id = e.src
      LEFT JOIN actions a2 ON a2.id = e.dst
      WHERE a1.id IS NULL OR a2.id IS NULL
      LIMIT 10;
    `;
    
    // Check completion_contexts for invalid action_id references
    const invalidCompletionRefs = await sql`
      SELECT cc.action_id, cc.headline
      FROM completion_contexts cc
      LEFT JOIN actions a ON a.id = cc.action_id
      WHERE a.id IS NULL
      LIMIT 10;
    `;
    
    return NextResponse.json({
      success: true,
      invalidIds: invalidIds.rows,
      invalidParentIds: invalidParentIds.rows,
      orphanedEdges: orphanedEdges.rows,
      invalidCompletionRefs: invalidCompletionRefs.rows,
      summary: {
        invalidIdsCount: invalidIds.rows.length,
        invalidParentIdsCount: invalidParentIds.rows.length,
        orphanedEdgesCount: orphanedEdges.rows.length,
        invalidCompletionRefsCount: invalidCompletionRefs.rows.length
      }
    });
    
  } catch (error) {
    console.error('[CheckInvalidUUIDs] Failed to check UUIDs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}