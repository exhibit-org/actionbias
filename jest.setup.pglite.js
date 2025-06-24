// Special setup for PGlite tests to avoid segfaults
import { jest } from '@jest/globals'

// Set a shorter timeout for PGlite tests
jest.setTimeout(5000)

// Ensure PGlite tests run with proper environment
process.env.NODE_ENV = 'test'
process.env.SKIP_MIGRATIONS = 'true'

// Override DATABASE_URL for PGlite tests
if (process.env.JEST_WORKER_ID) {
  // Use worker ID to create unique database paths
  process.env.DATABASE_URL = `pglite://./.pglite-test-${process.env.JEST_WORKER_ID}`
}

// Disable console during PGlite tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(), // Even suppress errors in PGlite tests
}

// Add cleanup hook
afterAll(async () => {
  // Clean up PGlite instances
  try {
    const { cleanupPGlite } = await import('./lib/db/adapter')
    await cleanupPGlite()
  } catch (error) {
    // Ignore cleanup errors
  }
})