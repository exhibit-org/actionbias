import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { actions, completionContexts, edges } from '@/db/schema';
import { eq, and, lt, isNotNull, or, inArray } from 'drizzle-orm';
import { EditorialAIService } from '@/lib/services/editorial-ai';
import { EnhancedContextService } from '@/lib/services/enhanced-context';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const before = url.searchParams.get('before');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const db = getDb();
    
    // Default to regenerating content created before the enhancement (today)
    const beforeDate = before ? new Date(before) : new Date('2025-06-26T20:00:00Z');
    
    console.log(`Regenerating editorial content for entries created before ${beforeDate.toISOString()}`);
    
    // Find completion contexts to regenerate
    const contextsToRegenerate = await db
      .select({
        context: completionContexts,
        action: actions,
      })
      .from(completionContexts)
      .innerJoin(actions, eq(actions.id, completionContexts.actionId))
      .where(
        and(
          // Has existing editorial content
          or(
            isNotNull(completionContexts.headline),
            isNotNull(completionContexts.deck),
            isNotNull(completionContexts.pullQuotes)
          ),
          // Created before the specified date
          lt(completionContexts.createdAt, beforeDate)
        )
      )
      .limit(limit);

    console.log(`Found ${contextsToRegenerate.length} completion contexts to regenerate`);

    let processed = 0;
    let errors = 0;

    for (const { context, action } of contextsToRegenerate) {
      try {
        // Get enhanced dependency and sibling context
        const enhancedContext = await EnhancedContextService.getEnhancedEditorialContext(action.id);

        // Generate editorial content with enhanced context
        const editorial = await EditorialAIService.generateEditorialContent({
          actionTitle: action.title || 'Untitled Action',
          actionDescription: action.description || undefined,
          actionVision: action.vision || undefined,
          implementationStory: context.implementationStory || '',
          impactStory: context.impactStory || '',
          learningStory: context.learningStory || '',
          // Add summaries
          nodeSummary: action.nodeSummary || undefined,
          subtreeSummary: action.subtreeSummary || undefined,
          familyContextSummary: action.familyContextSummary || undefined,
          familyVisionSummary: action.familyVisionSummary || undefined,
          // Add enhanced dependency and sibling context
          dependencyCompletions: enhancedContext.dependencyCompletions,
          siblingContext: enhancedContext.siblingContext
        });

        // Update with regenerated content
        const updates: any = {
          updatedAt: new Date(),
        };
        
        if (editorial.headline) {
          updates.headline = editorial.headline;
        }
        if (editorial.deck) {
          updates.deck = editorial.deck;
        }
        if (editorial.pullQuotes && editorial.pullQuotes.length > 0) {
          updates.pullQuotes = editorial.pullQuotes;
        }

        // Only update if we have new content
        if (Object.keys(updates).length > 1) { // More than just updatedAt
          await db
            .update(completionContexts)
            .set(updates)
            .where(eq(completionContexts.id, context.id));

          console.log(`Regenerated editorial content for action ${action.id} (${action.title})`);
          processed++;
        }
      } catch (error) {
        console.error(`Failed to regenerate for action ${action.id}:`, error);
        errors++;
      }
    }

    // Check if there might be more to process
    const hasMore = contextsToRegenerate.length === limit;
    
    // Build the next URL if there are more items
    let nextUrl = null;
    if (hasMore && processed > 0) {
      const nextParams = new URLSearchParams();
      nextParams.set('before', beforeDate.toISOString());
      nextParams.set('limit', limit.toString());
      nextUrl = `/api/debug/regenerate-editorial?${nextParams.toString()}`;
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      beforeDate: beforeDate.toISOString(),
      message: `Regenerated ${processed} completion contexts (${errors} errors)`,
      hasMore,
      nextUrl,
      note: hasMore 
        ? 'Click nextUrl to continue processing' 
        : 'All editorial content has been regenerated!'
    });
  } catch (error) {
    console.error('Editorial content regeneration failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to regenerate editorial content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}