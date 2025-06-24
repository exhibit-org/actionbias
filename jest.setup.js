// Jest setup file for global test configuration
import { jest } from '@jest/globals'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
// Don't set DATABASE_URL globally - let tests set it as needed
if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
  // Only set a default if no DATABASE_URL is provided at all
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/actionbias_test'
}
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'

// Global test timeout
jest.setTimeout(10000)

// Setup testing-library for React tests
import '@testing-library/jest-dom'

// Mock console methods to reduce noise in test output
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error for debugging
}

// Add global cleanup for database tests
let dbCleanupFunctions = [];

global.addDbCleanup = (fn) => {
  dbCleanupFunctions.push(fn);
};

global.runDbCleanup = async () => {
  for (const cleanup of dbCleanupFunctions) {
    try {
      await cleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  dbCleanupFunctions = [];
};

// Global teardown
afterEach(async () => {
  await global.runDbCleanup();
  
  // Clean up PGlite if it was used in the test
  if (process.env.DATABASE_URL?.startsWith('pglite://')) {
    try {
      const { cleanupPGlite, resetCache } = await import('./lib/db/adapter');
      await cleanupPGlite();
      resetCache();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  // Force garbage collection if available (helps with memory-related segfaults)
  if (global.gc) {
    global.gc();
  }
});