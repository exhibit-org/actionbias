const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Only initialize database for tests that need it
const needsDatabase = (testPath) => {
  // Check if test file needs database
  return testPath.includes('/db/') ||
         testPath.includes('/api/') ||
         testPath.includes('/services/') ||
         testPath.includes('/mcp/') ||
         testPath.includes('unblocked') ||
         testPath.includes('completion') ||
         testPath.includes('actions') ||
         testPath.includes('vector') ||
         testPath.includes('path-builder');
};

// Check current test file
const currentTestFile = expect.getState().testPath;

if (currentTestFile && needsDatabase(currentTestFile)) {
  // Set PGlite URL for test database 
  process.env.POSTGRES_URL = 'pglite://.pglite-test';
  // Skip migrations for tests to avoid PGlite compatibility issues
  process.env.SKIP_MIGRATIONS = 'true';
  // Clear any existing DATABASE_URL to prevent conflicts
  delete process.env.DATABASE_URL;

  const { initializePGlite, cleanupPGlite } = require('./lib/db/adapter');

  beforeAll(async () => {
    await initializePGlite();
  });

  afterAll(async () => {
    await cleanupPGlite();
  });
} else {
  // For non-database tests, ensure no database URLs are set
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
}