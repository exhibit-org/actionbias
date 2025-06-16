#!/usr/bin/env node

import { migrate } from 'drizzle-kit/api';

async function forceMigrate() {
  console.log('🚀 Starting forced migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('📦 Running migrations...');
    await migrate(undefined, {
      migrationsFolder: './db/migrations',
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

forceMigrate();