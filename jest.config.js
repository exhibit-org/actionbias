const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/jest.setup.web.cjs'],
  globalTeardown: '<rootDir>/scripts/cleanup-test-dbs.mjs',
  testEnvironment: 'jest-environment-jsdom',
  maxWorkers: 2, // Limit workers to prevent crashes
  workerIdleMemoryLimit: '1GB', // Set memory limit for workers
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
  ],
  collectCoverageFrom: [
    'app/api/**/*.{js,ts}',
    'app/next/**/*.{js,ts,tsx}',
    'lib/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
