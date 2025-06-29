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
            // Skip migrations that aren't needed for core functionality in tests
            if (file === '0000_worried_invisible_woman.sql' ||
                file.includes('waitlist') || 
                file === '0009_lush_wolverine.sql' ||
                file === '0010_add_editorial_fields.sql' ||
                file === '0011_add_parent_child_dependencies.sql' ||
                file.includes('editorial') ||
                file.includes('dependencies')) {
              console.warn(`Skipping migration ${file} in PGlite environment`);
              continue;
            }
            const migrationPath = path.join(migrationsFolder, file);
            let migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            // Skip migrations that contain PostgreSQL-specific syntax not supported by PGlite
            if (migrationSQL.includes('DO $$') || migrationSQL.includes('information_schema')) {
              console.warn(`Skipping migration ${file} - contains PostgreSQL-specific syntax not supported by PGlite`);
              continue;
            }
            
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
              .replace(/uuid\b/g, 'text')
              .replace(/DEFAULT gen_random_uuid\(\)/g, '')
              .replace(/DEFAULT gen_random_text\(\)/g, '')
              .replace(/DEFAULT now\(\)/g, 'DEFAULT CURRENT_TIMESTAMP')
              .replace(/jsonb/g, 'text')
              // Fix complex primary key constraints for PGlite - remove entirely for compatibility
              .replace(/,\s*CONSTRAINT\s+"[\w_]+"\s+PRIMARY KEY\s*\([^)]+\)/gi, '')
              .replace(/CONSTRAINT\s+"[\w_]+"\s+PRIMARY KEY\s*\([^)]+\),?/gi, '');
            
            // Execute the filtered migration
            if (migrationSQL.trim()) {
              const statements = migrationSQL.split('--> statement-breakpoint');
              for (const statement of statements) {
                let cleanStatement = statement.trim();
                // Remove comments from statement
                cleanStatement = cleanStatement.replace(/^--.*$/gm, '').trim();
                
                // Split on semicolons as well for multi-statement blocks
                const subStatements = cleanStatement.split(';').map(s => s.trim()).filter(s => s);
                
                for (const subStatement of subStatements) {
                  if (subStatement) {
                    try {
                      await pgliteDb.execute(sql.raw(subStatement));
                    } catch (error) {
                      const errorMessage = String(error);
                      console.warn(`Migration ${file} error for statement "${subStatement.substring(0, 50)}...": ${errorMessage}`);
                      
                      // Skip errors for duplicate objects (tables/indexes already exist)
                      if (errorMessage.includes('already exists')) {
                        continue;
                      }
                      
                      // For ALTER TABLE ADD COLUMN, skip if column already exists or table doesn't exist
                      if (subStatement.includes('ALTER TABLE') && subStatement.includes('ADD COLUMN')) {
                        if (errorMessage.includes('already exists') || 
                            errorMessage.includes('duplicate column') ||
                            errorMessage.includes('does not exist') ||
                            errorMessage.includes('no such table')) {
                          console.warn(`Warning: Migration ${file} ADD COLUMN statement failed (table/column may not exist or already exist). Skipping: ${errorMessage}`);
                          continue;
                        }
                      }
                      
                      // For ALTER TABLE RENAME COLUMN, check if the column doesn't exist
                      if (subStatement.includes('ALTER TABLE') && subStatement.includes('RENAME COLUMN')) {
                        // Log the error for debugging
                        console.warn(`Migration ${file} RENAME COLUMN error: ${errorMessage}`);
                        // Check if error is about column not existing - PGlite uses various error messages
                        if (errorMessage.includes('does not exist') || 
                            errorMessage.includes('not found') || 
                            errorMessage.includes('no such column') ||
                            errorMessage.includes('undefined column')) {
                          // This might mean the migration has already been applied or the schema is different
                          // Log it but continue
                          console.warn(`Warning: Migration ${file} tried to rename a non-existent column. This might be expected if the migration was already applied.`);
                          continue;
                        }
                      }
                      
                      // For other errors, provide more context
                      throw new Error(`Migration ${file} failed: ${errorMessage}\nStatement: ${subStatement}`);
                    }
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