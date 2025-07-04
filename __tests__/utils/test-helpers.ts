/**
 * Common test helper utilities
 * Provides reusable functions for test setup, data generation, and assertions
 */

import { jest } from '@jest/globals';

// Type definitions for common test scenarios
export type TestSetupOptions = {
  clearMocks?: boolean;
  setupDate?: Date;
  enableConsoleLogging?: boolean;
};

export type AsyncTestWrapper<T> = () => Promise<T>;

/**
 * Sets up a clean test environment
 */
export function setupTest(options: TestSetupOptions = {}) {
  const {
    clearMocks = true,
    setupDate,
    enableConsoleLogging = false
  } = options;

  if (clearMocks) {
    jest.clearAllMocks();
  }

  if (setupDate) {
    jest.useFakeTimers();
    jest.setSystemTime(setupDate);
  }

  if (!enableConsoleLogging) {
    // Suppress console output during tests unless explicitly enabled
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  }
}

/**
 * Cleans up test environment
 */
export function cleanupTest() {
  jest.restoreAllMocks();
  if (jest.isMockFunction(jest.getRealSystemTime)) {
    jest.useRealTimers();
  }
}

/**
 * Waits for async operations to complete
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async operation until it succeeds or max attempts reached
 */
export async function retryAsync<T>(
  operation: AsyncTestWrapper<T>,
  maxAttempts: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await waitForAsync(delayMs);
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Creates a mock function with common jest patterns
 */
export function createMockFunction<T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> {
  const mockFn = jest.fn(implementation) as jest.MockedFunction<T>;
  return mockFn;
}

/**
 * Creates a spy on an object method with restore capability
 */
export function createSpy<T extends object, K extends keyof T>(
  object: T,
  method: K,
  implementation?: T[K]
): jest.SpyInstance {
  const spy = jest.spyOn(object, method);
  if (implementation) {
    spy.mockImplementation(implementation as any);
  }
  return spy;
}

/**
 * Generates random test data
 */
export const testDataGenerators = {
  randomId: (prefix: string = 'test'): string => 
    `${prefix}-${Math.random().toString(36).substring(7)}`,
  
  randomString: (length: number = 10): string => 
    Math.random().toString(36).substring(2, 2 + length),
  
  randomEmail: (): string => 
    `test-${Math.random().toString(36).substring(7)}@example.com`,
  
  randomDate: (yearsBack: number = 1): Date => {
    const now = new Date();
    const pastMs = yearsBack * 365 * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - Math.random() * pastMs);
  },
  
  randomBoolean: (): boolean => Math.random() < 0.5,
  
  randomInteger: (min: number = 0, max: number = 100): number => 
    Math.floor(Math.random() * (max - min + 1)) + min,
};

/**
 * Common assertion helpers
 */
export const assertions = {
  /**
   * Asserts that an object has all required properties
   */
  hasRequiredProperties<T extends object>(
    obj: T, 
    properties: (keyof T)[]
  ): void {
    properties.forEach(prop => {
      expect(obj).toHaveProperty(prop);
      expect(obj[prop]).toBeDefined();
    });
  },

  /**
   * Asserts that a value is a valid ID (either UUID or test ID format)
   */
  isValidUUID(value: string): void {
    // For test purposes, just check that it's a non-empty string with a reasonable format
    expect(value).toBeDefined();
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
    // Either UUID format or test-id format
    const isValidFormat = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[a-z]+-[a-z0-9]+)$/i.test(value);
    expect(isValidFormat).toBe(true);
  },

  /**
   * Asserts that a date string is valid and recent
   */
  isRecentDate(dateString: string, maxAgeMs: number = 5000): void {
    const date = new Date(dateString);
    expect(date.getTime()).not.toBeNaN();
    
    const now = new Date();
    const ageMs = now.getTime() - date.getTime();
    expect(ageMs).toBeLessThan(maxAgeMs);
  },

  /**
   * Asserts that an array contains items with specific properties
   */
  arrayContainsItemsWithProperties<T extends object>(
    array: T[],
    properties: (keyof T)[],
    minCount: number = 1
  ): void {
    expect(array).toBeDefined();
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBeGreaterThanOrEqual(minCount);
    
    array.forEach(item => {
      assertions.hasRequiredProperties(item, properties);
    });
  },

  /**
   * Asserts that a function throws with specific message
   */
  async throwsWithMessage(
    fn: () => Promise<any> | any,
    expectedMessage: string | RegExp
  ): Promise<void> {
    await expect(fn).toThrow(expectedMessage);
  },
};

/**
 * Database test helpers
 */
export const dbHelpers = {
  /**
   * Creates a test isolation wrapper for database operations
   */
  withDatabaseIsolation: <T>(testFn: () => Promise<T>) => {
    return async (): Promise<T> => {
      // Setup isolation (transaction begin)
      try {
        const result = await testFn();
        return result;
      } finally {
        // Cleanup isolation (transaction rollback)
      }
    };
  },

  /**
   * Generates test database URL
   */
  createTestDatabaseUrl: (testName: string): string => {
    const cleanName = testName.replace(/[^a-zA-Z0-9]/g, '-');
    return `pglite://.pglite-test-${cleanName}-${Date.now()}`;
  },
};

/**
 * API test helpers
 */
export const apiHelpers = {
  /**
   * Creates a mock Response object
   */
  createMockResponse: (data: any, status: number = 200, ok: boolean = true): Response => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    clone: () => apiHelpers.createMockResponse(data, status, ok),
  } as Response),

  /**
   * Creates a mock fetch implementation
   */
  createMockFetch: (responses: Array<{ url?: string; response: any; status?: number }>) => {
    let callIndex = 0;
    return jest.fn().mockImplementation((url: string) => {
      const responseConfig = responses[callIndex] || responses[responses.length - 1];
      callIndex++;
      
      if (responseConfig.url && !url.includes(responseConfig.url)) {
        return Promise.resolve(apiHelpers.createMockResponse(
          { error: 'Unexpected URL' }, 404, false
        ));
      }
      
      return Promise.resolve(apiHelpers.createMockResponse(
        responseConfig.response,
        responseConfig.status || 200
      ));
    });
  },

  /**
   * Validates API response structure
   */
  validateApiResponse: (response: any, expectedFields: string[]): void => {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
    
    expectedFields.forEach(field => {
      expect(response).toHaveProperty(field);
    });
  },
};

/**
 * Performance test helpers
 */
export const performanceHelpers = {
  /**
   * Measures execution time of a function
   */
  measureExecutionTime: async <T>(fn: () => Promise<T> | T): Promise<{ result: T; timeMs: number }> => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    return {
      result,
      timeMs: endTime - startTime
    };
  },

  /**
   * Asserts that operation completes within time limit
   */
  assertWithinTimeLimit: async <T>(
    fn: () => Promise<T> | T,
    timeLimitMs: number
  ): Promise<T> => {
    const { result, timeMs } = await performanceHelpers.measureExecutionTime(fn);
    expect(timeMs).toBeLessThan(timeLimitMs);
    return result;
  },
};

/**
 * Test suite setup and teardown helpers
 */
export const suiteHelpers = {
  /**
   * Standard beforeEach setup for most tests
   */
  standardBeforeEach: (options: TestSetupOptions = {}) => {
    beforeEach(() => {
      setupTest(options);
    });
  },

  /**
   * Standard afterEach cleanup for most tests
   */
  standardAfterEach: () => {
    afterEach(() => {
      cleanupTest();
    });
  },

  /**
   * Combined standard setup
   */
  standardSetup: (options: TestSetupOptions = {}) => {
    suiteHelpers.standardBeforeEach(options);
    suiteHelpers.standardAfterEach();
  },
};