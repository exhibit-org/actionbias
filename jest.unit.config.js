const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Unit test configuration - uses mocks, no real database
const unitTestConfig = {
  displayName: 'Unit Tests',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js', 
    '<rootDir>/jest.setup.web.cjs',
    '<rootDir>/jest.setup.msw.cjs'
  ],
  testEnvironment: 'jest-environment-jsdom',
  maxWorkers: 4, // Can use more workers since no real database
  testMatch: [
    '<rootDir>/__tests__/lib/**/*.test.{js,ts,tsx}',
    '<rootDir>/__tests__/validation/**/*.test.{js,ts,tsx}',
    '<rootDir>/__tests__/components/**/*.test.{js,ts,tsx}',
    '<rootDir>/__tests__/utils/**/*.test.{js,ts,tsx}',
    '<rootDir>/__tests__/examples/**/*.test.{js,ts,tsx}',
    // Exclude integration tests
    '!<rootDir>/__tests__/integration/**/*',
    '!<rootDir>/__tests__/services/**/*',
    '!<rootDir>/__tests__/api/**/*',
    '!<rootDir>/__tests__/db/**/*'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^next/server$': '<rootDir>/__tests__/__mocks__/next/server.ts',
    '^lib/(.*)$': '<rootDir>/lib/$1',
    '^../../lib/(.*)$': '<rootDir>/lib/$1',
    '^../lib/(.*)$': '<rootDir>/lib/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/utils/index.ts',
    '<rootDir>/__tests__/utils/metadata-test-utils.ts',
    '<rootDir>/__tests__/utils/drizzle-mocks.ts', // Don't test the mock utilities themselves
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    '!lib/db/**', // Database code covered by integration tests
    '!lib/services/**', // Service code covered by integration tests
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(unitTestConfig);