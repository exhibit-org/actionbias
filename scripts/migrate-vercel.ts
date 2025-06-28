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
    await migrate(db, { migrationsFolder: './db/migrations' });
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();