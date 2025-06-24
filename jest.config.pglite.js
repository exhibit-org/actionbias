const baseConfig = require('./jest.config.js')

// Special configuration for PGlite tests to avoid segfaults
module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.pglite.js'],
  testMatch: [
    '**/__tests__/**/pglite*.test.{js,ts}',
    '**/__tests__/db/*.test.{js,ts}',
    '**/__tests__/services/*.test.{js,ts}',
  ],
  maxWorkers: 1, // Run PGlite tests sequentially to avoid segfaults
  testTimeout: 5000, // Shorter timeout for PGlite tests
  bail: true, // Stop on first failure to avoid cascading segfaults
}