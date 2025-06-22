import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "../../../lib/db/adapter";
import { completionContexts, actions } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";

const feedQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  visibility: z.enum(["private", "team", "public"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = feedQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      visibility: searchParams.get('visibility') || undefined,
    });
    
    const db = getDb();
    
    // Build query to join completion contexts with action data
    let query = db
      .select({
        // Completion context fields
        id: completionContexts.id,
        actionId: completionContexts.actionId,
        implementationStory: completionContexts.implementationStory,
        impactStory: completionContexts.impactStory,
        learningStory: completionContexts.learningStory,
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
      .where(eq(actions.done, true)); // Only show completed actions
    
    // Add visibility filter if specified
    if (params.visibility) {
      query = query.where(eq(completionContexts.changelogVisibility, params.visibility)) as any;
    }
    
    // Order by completion timestamp (most recent first) and apply pagination
    const feedItems = await query
      .orderBy(desc(completionContexts.completionTimestamp))
      .limit(params.limit)
      .offset(params.offset);
    
    return NextResponse.json({
      success: true,
      data: feedItems,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        hasMore: feedItems.length === params.limit, // Approximate check
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}