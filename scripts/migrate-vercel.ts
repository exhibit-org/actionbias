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
        console.log(`  ${i + 1}. ${row.hash} - ${new Date(row.created_at).toISOString()}`);
      });
      
      // Check specifically for work_log migration
      const workLogMigration = await sql`
        SELECT * FROM drizzle.__drizzle_migrations 
        WHERE hash LIKE '%0018%' OR hash LIKE '%work_log%';
      `;
      console.log(`📋 work_log migration status: ${workLogMigration.rows.length > 0 ? 'RECORDED' : 'NOT FOUND'}`);
      if (workLogMigration.rows.length > 0) {
        console.log(`  Details: ${workLogMigration.rows[0].hash} - ${new Date(workLogMigration.rows[0].created_at).toISOString()}`);
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

    console.log('🔄 Running Drizzle migrations...');
    try {
      console.log('📝 About to call migrate() function...');
      const result = await migrate(db, { migrationsFolder: './db/migrations' });
      console.log('📝 migrate() function completed, result:', result);
    } catch (error) {
      console.log('❌ migrate() function threw an error:', error);
      throw error;
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