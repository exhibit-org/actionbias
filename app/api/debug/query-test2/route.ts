import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { actions } from '../../../../db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // First, let's see ALL columns for our target action
    const targetActionResult = await db.execute(sql`
      SELECT 
        id,
        title,
        data,
        family_context_summary,
        family_vision_summary,
        COALESCE(title, data->>'title') as coalesced_title
      FROM ${actions}
      WHERE id = 'fc37de88-37ae-41d2-84f7-5bb230fac631'
    `);
    
    // Also test the query conditions separately
    const nullConditionResult = await db.execute(sql`
      SELECT 
        id,
        title,
        family_context_summary,
        family_vision_summary,
        (family_context_summary IS NULL) as context_is_null,
        (family_vision_summary IS NULL) as vision_is_null,
        (family_context_summary IS NULL OR family_vision_summary IS NULL) as null_condition,
        COALESCE(title, data->>'title') as coalesced_title,
        (COALESCE(title, data->>'title') IS NOT NULL) as title_condition
      FROM ${actions}
      WHERE id = 'fc37de88-37ae-41d2-84f7-5bb230fac631'
    `);
    
    // Format results
    let targetAction: any = null;
    let conditionTest: any = null;
    
    if (Array.isArray(targetActionResult)) {
      targetAction = targetActionResult[0];
    } else if (targetActionResult.rows) {
      targetAction = targetActionResult.rows[0];
    }
    
    if (Array.isArray(nullConditionResult)) {
      conditionTest = nullConditionResult[0];
    } else if (nullConditionResult.rows) {
      conditionTest = nullConditionResult.rows[0];
    }
    
    return NextResponse.json({
      targetAction,
      conditionTest,
      explanation: {
        shouldMatch: "Action should match if: (family_context_summary IS NULL OR family_vision_summary IS NULL) AND COALESCE(title, data->>'title') IS NOT NULL"
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}