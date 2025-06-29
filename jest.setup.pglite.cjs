const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set PGlite URL for test database - use memory to avoid file path issues
process.env.POSTGRES_URL = 'pglite://memory';
// Skip migrations for tests to avoid PGlite compatibility issues
process.env.SKIP_MIGRATIONS = 'true';
// Clear any existing DATABASE_URL to prevent conflicts
delete process.env.DATABASE_URL;

// Only initialize if actually needed - lazily load the adapter
let dbInitialized = false;

beforeAll(async () => {
  try {
    const { initializePGlite } = require('./lib/db/adapter');
    await initializePGlite();
    dbInitialized = true;
  } catch (error) {
    // Silently fail if database not needed for this test
    console.warn('Database initialization skipped for this test:', error.message);
  }
});

afterAll(async () => {
  if (dbInitialized) {
    try {
      const { cleanupPGlite } = require('./lib/db/adapter');
      await cleanupPGlite();
    } catch (error) {
      // Silently handle cleanup errors
      console.warn('Database cleanup warning:', error.message);
    }
  }
});
