import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db/adapter";
import { completionContexts, actions } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const actionId = params.id;
    const db = getDb();
    
    // Query for the specific action's changelog data
    const result = await db
      .select({
        // Completion context fields
        id: completionContexts.id,
        actionId: completionContexts.actionId,
        implementationStory: completionContexts.implementationStory,
        impactStory: completionContexts.impactStory,
        learningStory: completionContexts.learningStory,
        headline: completionContexts.headline,
        deck: completionContexts.deck,
        pullQuotes: completionContexts.pullQuotes,
        changelogVisibility: completionContexts.changelogVisibility,
        completionTimestamp: completionContexts.completionTimestamp,
        createdAt: completionContexts.createdAt,
        updatedAt: completionContexts.updatedAt,
        
        // Action fields
        actionTitle: actions.title,
        actionDescription: actions.description,
        actionVision: actions.vision,
        actionDone: actions.done,
        actionCreatedAt: actions.createdAt,
      })
      .from(completionContexts)
      .innerJoin(actions, eq(completionContexts.actionId, actions.id))
      .where(eq(actions.id, actionId))
      .limit(1);
    
    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Changelog item not found"
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error fetching changelog item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}