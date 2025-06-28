import { drizzle } from 'drizzle-orm/vercel-postgres';
import { migrate } from 'drizzle-orm/vercel-postgres/migrator';
import { sql } from '@vercel/postgres';

let migrationPromise: Promise<void> | null = null;

/**
 * Ensures database migrations have run. This is called once on app startup
 * and caches the result to avoid running migrations multiple times.
 */
export async function ensureMigrations() {
  // Only run migrations in production with a proper database URL
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!dbUrl || dbUrl.startsWith('pglite://')) {
    // Skip migrations for local development or PGlite databases
    return;
  }
  
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        console.log('🔄 Checking database migrations...');
        const db = drizzle(sql);
        await migrate(db, { migrationsFolder: './db/migrations' });
        console.log('✅ Database migrations are up to date');
      } catch (error) {
        console.error('❌ Migration check failed:', error);
        // Don't throw in production - let the app continue
        // The error will be visible in logs
      }
    })();
  }
  
  return migrationPromise;
}