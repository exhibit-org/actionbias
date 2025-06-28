import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    
    // Check columns in completion_contexts table
    const columns = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'completion_contexts'
      ORDER BY ordinal_position
    `);
    
    // Check if specific columns exist
    const columnNames = columns.rows.map((col: any) => col.column_name);
    const hasStructuredData = columnNames.includes('structured_data');
    const hasGitContext = columnNames.includes('git_context');
    const oldGitColumns = [
      'git_commit_hash',
      'git_commit_message',
      'git_branch',
      'git_commit_author',
      'git_commit_author_username',
      'git_commit_timestamp',
      'git_diff_stats',
      'git_related_commits'
    ];
    const existingOldColumns = oldGitColumns.filter(col => columnNames.includes(col));
    
    return NextResponse.json({
      columns: columns.rows,
      summary: {
        hasStructuredData,
        hasGitContext,
        oldGitColumnsPresent: existingOldColumns,
        totalColumns: columns.rows.length
      }
    });
  } catch (error) {
    console.error('Column check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check columns', details: error },
      { status: 500 }
    );
  }
}