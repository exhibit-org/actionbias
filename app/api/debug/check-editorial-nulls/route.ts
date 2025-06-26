import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { actions, completionContexts } from '@/db/schema';
import { eq, and, isNull, or, isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    
    // Count total completion contexts
    const totalQuery = await db
      .select({ count: completionContexts.id })
      .from(completionContexts);
    const total = totalQuery.length;

    // Count contexts with NULL headlines
    const nullHeadlineQuery = await db
      .select({ count: completionContexts.id })
      .from(completionContexts)
      .where(isNull(completionContexts.headline));
    const nullHeadlines = nullHeadlineQuery.length;

    // Count contexts with NULL decks
    const nullDeckQuery = await db
      .select({ count: completionContexts.id })
      .from(completionContexts)
      .where(isNull(completionContexts.deck));
    const nullDecks = nullDeckQuery.length;

    // Count contexts with both NULL
    const bothNullQuery = await db
      .select({ count: completionContexts.id })
      .from(completionContexts)
      .where(
        and(
          isNull(completionContexts.headline),
          isNull(completionContexts.deck)
        )
      );
    const bothNull = bothNullQuery.length;

    // Get a sample of NULL entries to inspect
    const sampleNulls = await db
      .select({
        context: completionContexts,
        action: actions,
      })
      .from(completionContexts)
      .innerJoin(actions, eq(actions.id, completionContexts.actionId))
      .where(
        or(
          isNull(completionContexts.headline),
          isNull(completionContexts.deck)
        )
      )
      .limit(3);

    // Check if these have the required stories
    const samples = sampleNulls.map(({ context, action }: any) => ({
      id: context.id,
      actionTitle: action.title,
      hasImplementationStory: !!context.implementationStory,
      hasImpactStory: !!context.impactStory,
      hasLearningStory: !!context.learningStory,
      visibility: context.changelogVisibility,
      headline: context.headline,
      deck: context.deck,
    }));

    return NextResponse.json({
      total,
      nullHeadlines,
      nullDecks,
      bothNull,
      percentageWithNullHeadline: ((nullHeadlines / total) * 100).toFixed(1) + '%',
      percentageWithNullDeck: ((nullDecks / total) * 100).toFixed(1) + '%',
      samples,
      message: 'Analysis of NULL editorial content',
    });
  } catch (error) {
    console.error('Check editorial nulls failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check editorial nulls',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}