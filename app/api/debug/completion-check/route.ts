import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/adapter';
import { completionContexts, actions } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId') || 'fc37de88-37ae-41d2-84f7-5bb230fac631';
    
    const db = getDb();
    
    // Check if action is marked as done
    const actionResult = await db
      .select({
        id: actions.id,
        title: actions.title,
        done: actions.done
      })
      .from(actions)
      .where(eq(actions.id, actionId))
      .limit(1);
    
    // Check if completion context exists
    const contextResult = await db
      .select({
        id: completionContexts.id,
        actionId: completionContexts.actionId,
        implementationStory: completionContexts.implementationStory,
        impactStory: completionContexts.impactStory,
        learningStory: completionContexts.learningStory,
        changelogVisibility: completionContexts.changelogVisibility,
        completionTimestamp: completionContexts.completionTimestamp
      })
      .from(completionContexts)
      .where(eq(completionContexts.actionId, actionId))
      .limit(1);
    
    // Format results
    let action: any = null;
    let context: any = null;
    
    if (Array.isArray(actionResult)) {
      action = actionResult[0];
    } else if (actionResult.rows) {
      action = actionResult.rows[0];
    }
    
    if (Array.isArray(contextResult)) {
      context = contextResult[0];
    } else if (contextResult.rows) {
      context = contextResult.rows[0];
    }
    
    return NextResponse.json({
      actionId,
      action,
      completionContext: context,
      actionIsDone: action?.done || false,
      hasCompletionContext: !!context,
      explanation: "Checking if action is marked done and has completion context record"
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}