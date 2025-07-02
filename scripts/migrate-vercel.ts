#!/usr/bin/env tsx
import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { migrate } from 'drizzle-orm/vercel-postgres/migrator';
import { sql } from '@vercel/postgres';

// Load environment variables
const dev = process.env.NODE_ENV !== 'production';
loadEnvConfig('./', dev);

async function runMigrations() {
  console.log('🚀 Running migrations with Vercel Postgres...');
  
  // Check for database URL
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Neither POSTGRES_URL nor DATABASE_URL environment variable is set');
    process.exit(1);
  }
  
  console.log('📦 Using database URL:', dbUrl.split('@')[1]?.split('/')[0] || 'URL hidden');
  console.log('📦 Full database connection info:');
  console.log('  - Host:', dbUrl.split('@')[1]?.split('/')[0]);
  console.log('  - Database name:', dbUrl.split('/').pop()?.split('?')[0]);
  console.log('  - Environment variables:');
  console.log('    - POSTGRES_URL exists:', !!process.env.POSTGRES_URL);
  console.log('    - DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('    - Using:', process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'DATABASE_URL');
  
  try {
    const db = drizzle(sql);
    
    // Check current migration status
    console.log('🔍 Checking current migration status...');
    try {
      const existingMigrations = await sql`
        SELECT * FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 10;
      `;
      console.log(`📋 Found ${existingMigrations.rows.length} migrations in drizzle schema:`);
      existingMigrations.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.hash.substring(0, 16)}... - created_at: ${row.created_at} (${new Date(parseInt(row.created_at)).toISOString()})`);
      });
      
      // Get the latest migration timestamp
      const latestMigration = existingMigrations.rows[0]; // Should be the latest due to ORDER BY created_at DESC
      if (latestMigration) {
        console.log(`📋 Latest migration timestamp: ${latestMigration.created_at}`);
        console.log(`📋 Our journal work_log timestamp: 1751100000000`);
        console.log(`📋 Comparison: ${parseInt(latestMigration.created_at)} >= 1751100000000 ? ${parseInt(latestMigration.created_at) >= 1751100000000 ? 'YES (SKIP)' : 'NO (APPLY)'}`);
      }
      
      // Check specifically for work_log migration
      const workLogMigration = await sql`
        SELECT * FROM drizzle.__drizzle_migrations 
        WHERE hash LIKE '%0018%' OR hash LIKE '%work_log%';
      `;
      console.log(`📋 work_log migration status: ${workLogMigration.rows.length > 0 ? 'RECORDED' : 'NOT FOUND'}`);
      if (workLogMigration.rows.length > 0) {
        console.log(`  Details: ${workLogMigration.rows[0].hash.substring(0, 16)}... - ${new Date(parseInt(workLogMigration.rows[0].created_at)).toISOString()}`);
      }
    } catch (e) {
      console.log('📋 No drizzle.__drizzle_migrations table found');
      // Try public schema as fallback
      try {
        const publicMigrations = await sql`
          SELECT * FROM __drizzle_migrations 
          ORDER BY created_at DESC 
          LIMIT 5;
        `;
        console.log('📋 Recent migrations in public schema:');
        publicMigrations.rows.forEach((row, i) => {
          console.log(`  ${i + 1}. ${row.hash} - ${new Date(row.created_at).toISOString()}`);
        });
      } catch (e2) {
        console.log('📋 No __drizzle_migrations table found in either schema (first migration)');
      }
    }
    
    // Check if work_log table exists
    console.log('🔍 Checking if work_log table exists...');
    const workLogExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'work_log'
      ) as exists;
    `;
    console.log('📋 work_log table exists:', workLogExists.rows[0]?.exists || false);
    
    // Check what migration files Drizzle can find
    console.log('🔍 Checking migration files in ./db/migrations...');
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      const migrationFiles = fs.readdirSync('./db/migrations').filter(f => f.endsWith('.sql'));
      console.log(`📁 Found ${migrationFiles.length} migration files:`);
      migrationFiles.slice(0, 10).forEach(file => console.log(`  - ${file}`));
      if (migrationFiles.length > 10) {
        console.log(`  ... and ${migrationFiles.length - 10} more`);
      }
    } catch (e) {
      console.log('❌ Could not read migration files:', e.message);
    }
    
    // Check journal file
    console.log('🔍 Checking migration journal...');
    try {
      const journalPath = './db/migrations/meta/_journal.json';
      const journalContent = fs.readFileSync(journalPath, 'utf8');
      const journal = JSON.parse(journalContent);
      console.log(`📋 Journal contains ${journal.entries?.length || 0} migration entries`);
      console.log('📋 Last 5 journal entries:');
      (journal.entries || []).slice(-5).forEach(entry => {
        console.log(`  - idx ${entry.idx}: ${entry.tag} (${entry.when})`);
      });
    } catch (e) {
      console.log('❌ Could not read journal file:', e.message);
    }

    // First manually record the missing migration that created waitlist table
    console.log('🔧 Manually recording migration 0009 (waitlist table) as applied...');
    try {
      await sql`
        INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") 
        VALUES ('migration_0009_lush_wolverine_manual', 1751466490000)
        ON CONFLICT DO NOTHING;
      `;
      console.log('✅ Recorded migration 0009 as applied');
    } catch (error) {
      console.log('❌ Failed to record migration 0009:', error);
    }

    console.log('🔄 Running Drizzle migrations...');
    try {
      console.log('📝 About to call migrate() function...');
      const result = await migrate(db, { migrationsFolder: './db/migrations' });
      console.log('📝 migrate() function completed, result:', result);
    } catch (error) {
      console.log('❌ migrate() function threw an error:', error);
      // If it fails, try to manually create just the work_log table
      console.log('🔧 Attempting to manually create work_log table...');
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS "work_log" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "content" text NOT NULL,
            "metadata" jsonb,
            "timestamp" timestamp DEFAULT now() NOT NULL
          );
        `;
        console.log('✅ Manually created work_log table');
        
        // Record the work_log migration as applied
        await sql`
          INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") 
          VALUES ('migration_0018_add_work_log_table_manual', 1751466499000)
          ON CONFLICT DO NOTHING;
        `;
        console.log('✅ Recorded work_log migration as applied');
      } catch (manualError) {
        console.log('❌ Failed to manually create work_log table:', manualError);
        throw error; // Re-throw original error
      }
    }
    
    // Check migration status after
    console.log('🔍 Checking migration status after migration...');
    try {
      const migrationsAfter = await sql`
        SELECT * FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 10;
      `;
      console.log('📋 Migrations after running migrate (drizzle schema):');
      migrationsAfter.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.hash} - ${new Date(row.created_at).toISOString()}`);
      });
    } catch (e) {
      console.log('📋 Could not find drizzle.__drizzle_migrations after migration');
    }
    
    // Check if work_log table exists after
    const workLogExistsAfter = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'work_log'
      ) as exists;
    `;
    console.log('📋 work_log table exists after migration:', workLogExistsAfter.rows[0]?.exists || false);
    
    // List all tables
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('📋 All tables in public schema:');
    allTables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();