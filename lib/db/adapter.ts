import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "drizzle-orm";
import { sql as vercelSql } from "@vercel/postgres";

// Lazy-load database connection to avoid startup failures
let db: ReturnType<typeof drizzle> | null = null;
let pgliteDb: any = null;

function getDb() {
  // Check both DATABASE_URL and POSTGRES_URL for compatibility
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set');
  }
  
  // Handle PGlite URLs
  if (databaseUrl.startsWith('pglite://')) {
    if (!pgliteDb) {
      throw new Error('PGlite database not initialized. Run setup first.');
    }
    return pgliteDb;
  }
  
  // Handle regular PostgreSQL URLs with Vercel Postgres
  if (!db) {
    db = drizzle(vercelSql);
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
      const { migrate } = await import('drizzle-orm/pglite/migrator');
      const fs = await import('fs');
      const path = await import('path');
      
      const dbPath = process.env.DATABASE_URL?.replace('pglite://', '') || '.pglite';
      const pglite = new PGlite(dbPath);
      rawPgliteInstance = pglite; // Store for cleanup
      pgliteDb = drizzlePGlite(pglite);
      
      // Run migrations for PGlite databases only if SKIP_MIGRATIONS is not set
      if (!process.env.SKIP_MIGRATIONS) {
        const migrationsFolder = path.resolve('./db/migrations');
        if (fs.existsSync(migrationsFolder)) {
          // For PGlite, we need to handle vector extension manually since it's not supported
          // Read and filter migrations to skip vector extension
          const migrationFiles = fs.readdirSync(migrationsFolder)
            .filter(file => file.endsWith('.sql'))
            .sort();
          
          for (const file of migrationFiles) {
            const migrationPath = path.join(migrationsFolder, file);
            let migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            // Skip vector extension and related operations for PGlite
            if (migrationSQL.includes('CREATE EXTENSION IF NOT EXISTS vector') || 
                migrationSQL.includes('vector(1536)') ||
                migrationSQL.includes('ivfflat')) {
              // Replace vector operations with regular text for PGlite compatibility
              migrationSQL = migrationSQL
                .replace(/-- Enable pgvector extension for vector embeddings\nCREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint/g, '')
                .replace(/vector\(1536\)/g, 'text')
                .replace(/-- Create IVFFLAT index for fast similarity search on embedding vectors[\s\S]*?WITH \(lists = 100\);/g, '');
            }
            
            // Replace UUID with text for PGlite compatibility (uuid generation will be handled in application code)
            migrationSQL = migrationSQL
              .replace(/uuid/g, 'text')
              .replace(/DEFAULT gen_random_text\(\)/g, '');
            
            // Execute the filtered migration
            if (migrationSQL.trim()) {
              const statements = migrationSQL.split('--> statement-breakpoint');
              for (const statement of statements) {
                const cleanStatement = statement.trim();
                if (cleanStatement) {
                  try {
                    await pgliteDb.execute(sql.raw(cleanStatement));
                  } catch (error) {
                    const errorMessage = String(error);
                    // Skip errors for duplicate objects (tables/indexes already exist)
                    if (errorMessage.includes('already exists')) {
                      continue;
                    }
                    
                    // For ALTER TABLE ADD COLUMN, skip if column already exists
                    if (cleanStatement.includes('ALTER TABLE') && cleanStatement.includes('ADD COLUMN')) {
                      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate column')) {
                        console.warn(`Warning: Migration ${file} tried to add an existing column. Skipping.`);
                        continue;
                      }
                    }
                    
                    // For ALTER TABLE RENAME COLUMN, check if the column doesn't exist
                    if (cleanStatement.includes('ALTER TABLE') && cleanStatement.includes('RENAME COLUMN')) {
                      // Check if error is about column not existing
                      if (errorMessage.includes('does not exist') || errorMessage.includes('column') && errorMessage.includes('not found')) {
                        // This might mean the migration has already been applied or the schema is different
                        // Log it but continue
                        console.warn(`Warning: Migration ${file} tried to rename a non-existent column. This might be expected if the migration was already applied.`);
                        continue;
                      }
                    }
                    
                    // For other errors, provide more context
                    throw new Error(`Migration ${file} failed: ${errorMessage}\nStatement: ${cleanStatement}`);
                  }
                }
              }
            }
          }
        }
      }
      
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
  db = null;
  pgliteDb = null;
  rawPgliteInstance = null;
  initializationPromise = null;
}

export { getDb };