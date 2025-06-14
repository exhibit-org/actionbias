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
let initializationPromise: Promise<any> | null = null;

// Initialize PGlite if needed (called during setup)
export async function initializePGlite() {
  // Return existing instance if available
  if (pgliteDb) return pgliteDb;
  
  // Return existing initialization promise to prevent race conditions
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = (async () => {
    try {
      const { PGlite } = await import('@electric-sql/pglite');
      const { drizzle: drizzlePGlite } = await import('drizzle-orm/pglite');
      
      const dbPath = process.env.DATABASE_URL?.replace('pglite://', '') || '.pglite';
      const pglite = new PGlite(dbPath);
      rawPgliteInstance = pglite; // Store for cleanup
      pgliteDb = drizzlePGlite(pglite);
      
      return pgliteDb;
    } catch (error) {
      // Reset promise on error so retry is possible
      initializationPromise = null;
      throw new Error(`Failed to initialize PGlite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  })();
  
  return initializationPromise;
}

// Clean up PGlite instances (for tests and graceful shutdown)
export async function cleanupPGlite() {
  try {
    // Wait for any pending initialization
    if (initializationPromise) {
      await initializationPromise.catch(() => {}); // Ignore initialization errors during cleanup
    }
    
    if (rawPgliteInstance) {
      await rawPgliteInstance.close();
    }
  } catch (error) {
    // Silently handle cleanup errors in tests
    console.warn('Error during PGlite cleanup:', error);
  } finally {
    rawPgliteInstance = null;
    pgliteDb = null;
    initializationPromise = null;
  }
}

// Test utility to reset cache (only for tests)
export function resetCache() {
  client = null;
  db = null;
  pgliteDb = null;
  rawPgliteInstance = null;
  initializationPromise = null;
}

export { getDb };