import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db/adapter';
import { actions, edges } from '@/db/schema';
import { desc, sql, isNull } from 'drizzle-orm';

const findSimilarSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  vision: z.string().optional(),
  limit: z.number().min(1).max(10).default(5),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, vision, limit } = findSimilarSchema.parse(body);

    // For now, use a simple approach: find root-level actions (potential families)
    // that have similar keywords in their titles
    const db = getDb();
    
    // Get all root-level actions (those that have children but no parent)
    // First, get actions that are parents (have children)
    const parentActions = await db.execute(sql`
      SELECT DISTINCT 
        a.id,
        COALESCE(a.title, a.data->>'title', 'Untitled') as title,
        COALESCE(a.description, a.data->>'description', '') as description,
        COALESCE(a.vision, a.data->>'vision', '') as vision
      FROM actions a
      WHERE EXISTS (
        SELECT 1 FROM edges e WHERE e.src = a.id AND e.kind = 'child'
      )
      AND NOT EXISTS (
        SELECT 1 FROM edges e2 WHERE e2.dst = a.id AND e2.kind = 'child'
      )
      LIMIT 100
    `);
    
    // If no root actions found, just get any actions that could be parents
    const rootActions = parentActions.rows.length > 0 ? parentActions.rows : 
      await db.execute(sql`
        SELECT 
          a.id,
          COALESCE(a.title, a.data->>'title', 'Untitled') as title,
          COALESCE(a.description, a.data->>'description', '') as description,
          COALESCE(a.vision, a.data->>'vision', '') as vision
        FROM actions a
        WHERE a.done = false
        ORDER BY a.created_at DESC
        LIMIT 100
      `).then((r: any) => r.rows);

    // Simple similarity: find actions with overlapping words
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scoredActions = rootActions.map((action: any) => {
      const actionTitle = String(action.title).toLowerCase();
      const actionDesc = String(action.description).toLowerCase();
      
      // Count matching words
      let score = 0;
      titleWords.forEach((word: string) => {
        if (actionTitle.includes(word)) score += 2; // Title matches are worth more
        if (actionDesc.includes(word)) score += 1;
      });
      
      // Boost score for shorter titles (more likely to be good parents)
      if (String(action.title).length < 50) score += 0.5;
      
      return {
        ...action,
        score,
        similarity: Math.min(score / (titleWords.length * 2), 1) // Normalize to 0-1
      };
    })
    .filter((a: any) => a.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        candidates: scoredActions.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          similarity: a.similarity,
        }))
      }
    });
  } catch (error) {
    console.error('Error finding similar actions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}