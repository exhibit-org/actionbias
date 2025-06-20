import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 800; // 800 seconds for Pro/Enterprise accounts

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verify admin secret (different from cron secret for safety)
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting data extraction migration...');
    
    const db = getDb();
    
    // Extract title, description, vision from JSON blob to proper columns
    const updateResult = await db.execute(sql`
      UPDATE ${actions}
      SET 
        title = COALESCE(title, data->>'title'),
        description = COALESCE(description, data->>'description'),
        vision = COALESCE(vision, data->>'vision'),
        updated_at = NOW()
      WHERE 
        (title IS NULL AND data->>'title' IS NOT NULL) OR
        (description IS NULL AND data->>'description' IS NOT NULL) OR
        (vision IS NULL AND data->>'vision' IS NOT NULL)
    `);
    
    // Get statistics
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(title) as actions_with_title,
        COUNT(description) as actions_with_description,
        COUNT(vision) as actions_with_vision,
        COUNT(CASE WHEN data->>'title' IS NOT NULL THEN 1 END) as json_titles,
        COUNT(CASE WHEN data->>'description' IS NOT NULL THEN 1 END) as json_descriptions,
        COUNT(CASE WHEN data->>'vision' IS NOT NULL THEN 1 END) as json_visions
      FROM ${actions}
    `);
    
    // Handle different database result formats
    const statsRows = statsResult.rows || statsResult;
    const stats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] : {};
    
    console.log('Data extraction migration completed. Stats:', stats);
    
    return NextResponse.json({
      success: true,
      message: 'Data extraction completed successfully',
      stats: {
        totalActions: parseInt(stats.total_actions) || 0,
        actionsWithTitle: parseInt(stats.actions_with_title) || 0,
        actionsWithDescription: parseInt(stats.actions_with_description) || 0,
        actionsWithVision: parseInt(stats.actions_with_vision) || 0,
        originalJsonTitles: parseInt(stats.json_titles) || 0,
        originalJsonDescriptions: parseInt(stats.json_descriptions) || 0,
        originalJsonVisions: parseInt(stats.json_visions) || 0
      }
    });

  } catch (error) {
    console.error('Data extraction migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}