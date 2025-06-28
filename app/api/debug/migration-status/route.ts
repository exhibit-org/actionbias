import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    
    // Check if drizzle migrations table exists
    const migrationTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = '__drizzle_migrations'
      )
    `);

    let migrations = [];
    if (migrationTableExists.rows[0]?.exists) {
      // Get all applied migrations
      migrations = await db.execute(sql`
        SELECT * FROM __drizzle_migrations 
        ORDER BY created_at DESC
      `);
    }

    // Check actual column status
    const columnStatus = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'completion_contexts'
      ORDER BY ordinal_position
    `);

    // Check if git_context column exists
    const gitContextExists = columnStatus.rows.some(
      (col: any) => col.column_name === 'git_context'
    );

    // Check which old columns still exist
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

    const existingOldColumns = columnStatus.rows
      .filter((col: any) => oldGitColumns.includes(col.column_name))
      .map((col: any) => col.column_name);

    return NextResponse.json({
      migrationTableExists: migrationTableExists.rows[0]?.exists || false,
      appliedMigrations: migrations.rows || [],
      completionContextColumns: columnStatus.rows,
      gitContextExists,
      oldGitColumnsStillPresent: existingOldColumns,
      summary: {
        totalMigrations: migrations.rows?.length || 0,
        gitContextMigrated: gitContextExists && existingOldColumns.length === 0,
        gitContextColumnExists: gitContextExists,
        oldColumnsRemaining: existingOldColumns.length
      }
    });
  } catch (error) {
    console.error('Migration status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error },
      { status: 500 }
    );
  }
}