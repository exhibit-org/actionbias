import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Lazy-load database connection to avoid startup failures
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let pgliteDb: any = null;

function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Handle PGlite URLs
  if (databaseUrl.startsWith('pglite://')) {
    if (!pgliteDb) {
      throw new Error('PGlite database not initialized. Run setup first.');
    }
    return pgliteDb;
  }
  
  // Handle regular PostgreSQL URLs
  if (!db) {
    client = postgres(databaseUrl);
    db = drizzle(client);
  }
  
  return db;
}

// Store reference to the raw PGlite instance for cleanup
let rawPgliteInstance: any = null;

// Initialize PGlite if needed (called during setup)
export async function initializePGlite() {
  if (pgliteDb) return pgliteDb;
  
  try {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle: drizzlePGlite } = await import('drizzle-orm/pglite');
    
    const dbPath = process.env.DATABASE_URL?.replace('pglite://', '') || '.pglite';
    const pglite = new PGlite(dbPath);
    rawPgliteInstance = pglite; // Store for cleanup
    pgliteDb = drizzlePGlite(pglite);
    
    return pgliteDb;
  } catch (error) {
    throw new Error(`Failed to initialize PGlite: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Clean up PGlite instances (for tests and graceful shutdown)
export async function cleanupPGlite() {
  if (rawPgliteInstance) {
    await rawPgliteInstance.close();
    rawPgliteInstance = null;
  }
  pgliteDb = null;
}

export { getDb };