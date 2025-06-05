#!/usr/bin/env node

import { PGlite } from '@electric-sql/pglite';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = '.env.local';

console.log('🗄️  Setting up PGlite (in-process PostgreSQL)...');

// Check if DATABASE_URL already exists and points to PGlite
if (existsSync(ENV_FILE)) {
  const envContent = readFileSync(ENV_FILE, 'utf8');
  if (envContent.includes('DATABASE_URL=') && envContent.includes('pglite://')) {
    console.log('✅ PGlite DATABASE_URL already configured');
    process.exit(0);
  }
}

async function setupPGlite() {
  console.log('🚀 Initializing PGlite database...');
  
  // Create .pglite directory for persistent storage
  const pgliteDir = join(process.cwd(), '.pglite');
  if (!existsSync(pgliteDir)) {
    mkdirSync(pgliteDir, { recursive: true });
    console.log('📁 Created .pglite directory');
  }
  
  // Initialize PGlite with persistent storage
  const db = new PGlite(pgliteDir);
  
  console.log('🔧 Creating database schema...');
  
  // Create the tables directly (since we can't use Drizzle migrations with PGlite easily)
  await db.exec(`
    -- Create actions table
    CREATE TABLE IF NOT EXISTS actions (
      id UUID PRIMARY KEY,
      data JSONB NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      version INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create edges table  
    CREATE TABLE IF NOT EXISTS edges (
      id SERIAL PRIMARY KEY,
      src UUID NOT NULL,
      dst UUID NOT NULL,
      kind TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (src) REFERENCES actions(id) ON DELETE CASCADE,
      FOREIGN KEY (dst) REFERENCES actions(id) ON DELETE CASCADE
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src);
    CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst);
    CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);
    CREATE INDEX IF NOT EXISTS idx_actions_done ON actions(done);
  `);
  
  console.log('✅ Database schema created');
  
  // Close the initialization connection
  await db.close();
  
  // Create or update .env.local with PGlite connection
  const envContent = `# PGlite in-process PostgreSQL database
# This runs PostgreSQL entirely in-process (no Docker required)
DATABASE_URL=pglite://.pglite

# Optional: Redis for SSE transport
# REDIS_URL=redis://localhost:6379
`;

  writeFileSync(ENV_FILE, envContent);
  console.log('✅ Created .env.local with PGlite configuration');
  
  return 'pglite://.pglite';
}

try {
  await setupPGlite();
  console.log('');
  console.log('🎉 PGlite setup complete!');
  console.log('📝 Using in-process PostgreSQL - no external dependencies');
  console.log('💾 Data stored in .pglite/ directory');
  console.log('');
  console.log('Next steps:');
  console.log('1. pnpm dev (migrations not needed - schema already created)');
  console.log('');
  console.log('🔄 To reset database: rm -rf .pglite && pnpm db:setup');
} catch (error) {
  console.error('❌ PGlite setup failed:', error.message);
  console.log('');
  console.log('Fallback options:');
  console.log('1. pnpm db:setup-interactive (manual setup)');
  console.log('2. Set DATABASE_URL manually in .env.local');
  process.exit(1);
}