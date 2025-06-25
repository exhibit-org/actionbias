import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { actions, completionContexts } from '@/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { EditorialAIService } from '@/lib/services/editorial-ai';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  // Check for cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    
    // Find completion contexts that are missing editorial content
    // Only process public and team visibility items
    const contextsToProcess = await db
      .select({
        context: completionContexts,
        action: actions,
      })
      .from(completionContexts)
      .innerJoin(actions, eq(actions.id, completionContexts.actionId))
      .where(
        and(
          // Missing editorial content
          or(
            isNull(completionContexts.headline),
            isNull(completionContexts.deck),
            isNull(completionContexts.pullQuotes)
          ),
          // Only public or team visibility
          or(
            eq(completionContexts.changelogVisibility, 'public'),
            eq(completionContexts.changelogVisibility, 'team')
          )
        )
      )
      .limit(10); // Process 10 at a time to avoid timeout

    console.log(`Found ${contextsToProcess.length} completion contexts to process`);

    let processed = 0;
    let errors = 0;

    for (const { context, action } of contextsToProcess) {
      try {
        // Skip if all editorial fields already exist
        if (context.headline && context.deck && context.pullQuotes) {
          continue;
        }

        // Generate editorial content
        const editorial = await EditorialAIService.generateEditorialContent({
          actionTitle: action.title || 'Untitled Action',
          actionDescription: action.description || undefined,
          actionVision: action.vision || undefined,
          implementationStory: context.implementationStory || '',
          impactStory: context.impactStory || '',
          learningStory: context.learningStory || '',
        });

        // Update only missing fields
        const updates: any = {};
        if (!context.headline && editorial.headline) {
          updates.headline = editorial.headline;
        }
        if (!context.deck && editorial.deck) {
          updates.deck = editorial.deck;
        }
        if (!context.pullQuotes && editorial.pullQuotes && editorial.pullQuotes.length > 0) {
          updates.pullQuotes = editorial.pullQuotes;
        }

        // Only update if we have new content
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          
          await db
            .update(completionContexts)
            .set(updates)
            .where(eq(completionContexts.id, context.id));

          console.log(`Updated editorial content for action ${action.id}`);
          processed++;
        }
      } catch (error) {
        console.error(`Failed to process action ${action.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      message: `Processed ${processed} completion contexts, ${errors} errors`,
    });
  } catch (error) {
    console.error('Editorial content generation cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate editorial content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}