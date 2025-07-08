const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Skip migrations for tests to avoid PGlite compatibility issues
process.env.SKIP_MIGRATIONS = 'true';

// Use memory database for tests to avoid file system issues
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'pglite://memory';
}
