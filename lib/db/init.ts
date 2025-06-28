import { initializePGlite } from './adapter';

// Initialize database on server startup if using PGlite
export async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (databaseUrl?.startsWith('pglite://')) {
    console.log('🔧 Initializing PGlite database...');
    await initializePGlite();
    console.log('✅ PGlite initialized');
  }
}

// Auto-initialize on import in Node.js environments
if (typeof window === 'undefined') {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl?.startsWith('pglite://')) {
    initializeDatabase().catch(console.error);
  }
}