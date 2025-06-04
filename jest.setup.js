// Jest setup file for global test configuration
import { jest } from '@jest/globals'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/actionbias_test'
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'

// Global test timeout
jest.setTimeout(10000)

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}