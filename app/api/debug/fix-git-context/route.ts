import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('[FixGitContext] Starting git_context column fix...');
    
    // Add the missing git_context column if it doesn't exist
    const result = await sql`
      ALTER TABLE completion_contexts 
      ADD COLUMN IF NOT EXISTS git_context jsonb;
    `;
    
    console.log('[FixGitContext] Column addition result:', result);
    
    // Verify the column exists by checking table structure
    const tableInfo = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'completion_contexts' 
      AND column_name = 'git_context';
    `;
    
    console.log('[FixGitContext] Column verification:', tableInfo.rows);
    
    return NextResponse.json({
      success: true,
      message: 'git_context column added successfully',
      columnExists: tableInfo.rows.length > 0,
      tableInfo: tableInfo.rows
    });
    
  } catch (error) {
    console.error('[FixGitContext] Failed to add git_context column:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}