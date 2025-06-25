import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    
    // Count actions with and without embeddings
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE embedding_vector IS NOT NULL) as with_embeddings,
        COUNT(*) FILTER (WHERE embedding_vector IS NULL) as without_embeddings,
        COUNT(*) as total
      FROM actions
      WHERE done = false
    `);
    
    const stats = result.rows[0] || { with_embeddings: 0, without_embeddings: 0, total: 0 };
    
    // Get a few examples of actions without embeddings
    const examples = await db.execute(sql`
      SELECT id, title, created_at
      FROM actions
      WHERE embedding_vector IS NULL AND done = false
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          withEmbeddings: Number(stats.with_embeddings),
          withoutEmbeddings: Number(stats.without_embeddings),
          total: Number(stats.total),
          percentageWithEmbeddings: stats.total > 0 
            ? Math.round((Number(stats.with_embeddings) / Number(stats.total)) * 100) 
            : 0
        },
        examplesWithoutEmbeddings: examples.rows
      }
    });
  } catch (error) {
    console.error('Error checking embeddings status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}