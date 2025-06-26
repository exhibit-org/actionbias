import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { completionContexts } from '@/db/schema';
import { eq, or, and, isNotNull } from 'drizzle-orm';

export const maxDuration = 300; // 5 minutes max

export async function GET() {
  try {
    const db = getDb();
    
    // Find completion contexts with malformed editorial content
    const malformedContexts = await db
      .select()
      .from(completionContexts)
      .where(
        or(
          eq(completionContexts.headline, ':'),
          eq(completionContexts.deck, ':'),
          and(
            isNotNull(completionContexts.headline),
            eq(completionContexts.headline, '')
          ),
          and(
            isNotNull(completionContexts.deck),
            eq(completionContexts.deck, '')
          )
        )
      )
      .limit(100); // Process 100 at a time

    console.log(`Found ${malformedContexts.length} completion contexts with malformed editorial content`);

    let fixed = 0;
    let errors = 0;

    for (const context of malformedContexts) {
      try {
        const updates: any = {
          updatedAt: new Date(),
        };

        // Clear malformed values
        if (context.headline === ':' || context.headline === '') {
          updates.headline = null;
        }
        if (context.deck === ':' || context.deck === '') {
          updates.deck = null;
        }

        await db
          .update(completionContexts)
          .set(updates)
          .where(eq(completionContexts.id, context.id));

        console.log(`Fixed malformed editorial content for completion context ${context.id}`);
        fixed++;
      } catch (error) {
        console.error(`Failed to fix completion context ${context.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      errors,
      message: `Fixed ${fixed} malformed completion contexts, ${errors} errors`,
      remaining: malformedContexts.length === 100 ? 'possibly more' : 0
    });
  } catch (error) {
    console.error('Fix editorial content failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix editorial content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}