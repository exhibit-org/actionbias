import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db/adapter";
import { actions } from "../../../../db/schema";
import { eq, or, and, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Starting fix for family placeholder text");
    const db = getDb();

    // Find all actions with placeholder text
    const placeholderActions = await db
      .select({
        id: actions.id,
        title: actions.title,
        familyContextSummary: actions.familyContextSummary,
        familyVisionSummary: actions.familyVisionSummary,
      })
      .from(actions)
      .where(
        or(
          eq(actions.familyContextSummary, 'This action has no family context.'),
          eq(actions.familyVisionSummary, 'This action has no family vision context.')
        )
      );

    console.log(`[CRON] Found ${placeholderActions.length} actions with placeholder text`);

    // Update them to NULL so they'll be regenerated
    let updatedCount = 0;
    for (const action of placeholderActions) {
      const updates: any = {};
      
      if (action.familyContextSummary === 'This action has no family context.') {
        updates.familyContextSummary = null;
      }
      
      if (action.familyVisionSummary === 'This action has no family vision context.') {
        updates.familyVisionSummary = null;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(actions)
          .set(updates)
          .where(eq(actions.id, action.id));
        
        updatedCount++;
        console.log(`[CRON] Reset placeholders for action ${action.id}: ${action.title}`);
      }
    }

    console.log(`[CRON] Successfully reset ${updatedCount} actions with placeholder text`);

    return NextResponse.json({
      success: true,
      message: `Reset placeholder text for ${updatedCount} actions`,
      totalFound: placeholderActions.length,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("[CRON] Error fixing family placeholders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}