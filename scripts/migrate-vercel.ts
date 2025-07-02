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
  
  try {
    const db = drizzle(sql);
    
    // Check current migration status
    console.log('🔍 Checking current migration status...');
    try {
      const existingMigrations = await sql`
        SELECT * FROM __drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 5;
      `;
      console.log('📋 Recent migrations in database:');
      existingMigrations.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.hash} - ${new Date(row.created_at).toISOString()}`);
      });
    } catch (e) {
      console.log('📋 No __drizzle_migrations table found (first migration)');
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
    
    console.log('🔄 Running Drizzle migrations...');
    await migrate(db, { migrationsFolder: './db/migrations' });
    
    // Check migration status after
    console.log('🔍 Checking migration status after migration...');
    const migrationsAfter = await sql`
      SELECT * FROM __drizzle_migrations 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
    console.log('📋 Migrations after running migrate:');
    migrationsAfter.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.hash} - ${new Date(row.created_at).toISOString()}`);
    });
    
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