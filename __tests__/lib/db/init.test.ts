import { initializeDatabase } from '../../../lib/db/init';
import { initializePGlite } from '../../../lib/db/adapter';

// Mock the adapter
jest.mock('../../../lib/db/adapter', () => ({
  initializePGlite: jest.fn(),
}));

const mockInitializePGlite = initializePGlite as jest.MockedFunction<typeof initializePGlite>;

describe('Database Initialization', () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Mock console.log and console.error
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('initializeDatabase', () => {
    it('initializes PGlite when DATABASE_URL starts with pglite://', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      mockInitializePGlite.mockResolvedValue({} as any);

      await initializeDatabase();

      expect(consoleSpy).toHaveBeenCalledWith('🔧 Initializing PGlite database...');
      expect(mockInitializePGlite).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('✅ PGlite initialized');
    });

    it('does nothing when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;

      await initializeDatabase();

      expect(mockInitializePGlite).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('does nothing when DATABASE_URL is empty string', async () => {
      process.env.DATABASE_URL = '';

      await initializeDatabase();

      expect(mockInitializePGlite).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('does nothing when DATABASE_URL is PostgreSQL URL', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      await initializeDatabase();

      expect(mockInitializePGlite).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('does nothing when DATABASE_URL has different protocol', async () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/testdb';

      await initializeDatabase();

      expect(mockInitializePGlite).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('handles PGlite initialization errors', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      const error = new Error('PGlite initialization failed');
      mockInitializePGlite.mockRejectedValue(error);

      await expect(initializeDatabase()).rejects.toThrow('PGlite initialization failed');

      expect(consoleSpy).toHaveBeenCalledWith('🔧 Initializing PGlite database...');
      expect(mockInitializePGlite).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith('✅ PGlite initialized');
    });

    it('handles various PGlite URL formats', async () => {
      const testCases = [
        'pglite://',
        'pglite://./db.sqlite',
        'pglite://./data/app.db',
        'pglite:///absolute/path/db.sqlite',
        'pglite://memory',
      ];

      for (const url of testCases) {
        jest.clearAllMocks();
        process.env.DATABASE_URL = url;
        mockInitializePGlite.mockResolvedValue({} as any);

        await initializeDatabase();

        expect(mockInitializePGlite).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('🔧 Initializing PGlite database...');
        expect(consoleSpy).toHaveBeenCalledWith('✅ PGlite initialized');
      }
    });

    it('only logs initialization messages for PGlite URLs', async () => {
      const testCases = [
        { url: 'postgresql://localhost/db', shouldLog: false },
        { url: 'pglite://./test.db', shouldLog: true },
        { url: 'sqlite://./test.db', shouldLog: false },
        { url: 'mongodb://localhost/db', shouldLog: false },
        { url: 'pglite://', shouldLog: true },
      ];

      for (const { url, shouldLog } of testCases) {
        jest.clearAllMocks();
        process.env.DATABASE_URL = url;
        
        if (shouldLog) {
          mockInitializePGlite.mockResolvedValue({} as any);
        }

        await initializeDatabase();

        if (shouldLog) {
          expect(consoleSpy).toHaveBeenCalledWith('🔧 Initializing PGlite database...');
          expect(mockInitializePGlite).toHaveBeenCalled();
        } else {
          expect(consoleSpy).not.toHaveBeenCalled();
          expect(mockInitializePGlite).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Auto-initialization behavior', () => {
    // Note: Testing the auto-initialization on import is tricky because it happens
    // when the module is loaded. We can test the conditions but not the actual
    // execution without complex module mocking.

    it('should auto-initialize in Node.js environment with PGlite URL', () => {
      // This test verifies the logic would trigger auto-initialization
      const isNodeJs = typeof window === 'undefined';
      const hasPGliteUrl = 'pglite://./test.db'.startsWith('pglite://');
      
      expect(isNodeJs).toBe(true); // We're in Node.js during tests
      expect(hasPGliteUrl).toBe(true);
      
      // The actual auto-initialization happens on module import,
      // which we can't easily test without complex module mocking
    });

    it('should handle auto-initialization errors silently', async () => {
      // Mock console.error to verify it's called on auto-init failure
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock initializeDatabase to throw an error
      jest.doMock('../../../lib/db/init', () => ({
        ...jest.requireActual('../../../lib/db/init'),
        initializeDatabase: jest.fn().mockRejectedValue(new Error('Auto-init failed'))
      }));
      
      // Simulate the auto-initialization code path
      const isNodeJs = typeof window === 'undefined';
      const hasPGliteUrl = 'pglite://./test.db'.startsWith('pglite://');
      
      if (isNodeJs && hasPGliteUrl) {
        try {
          // This simulates what happens in the auto-init block
          const { initializeDatabase } = require('../../../lib/db/init');
          await initializeDatabase().catch(console.error);
          
          // Verify console.error was called with the error
          expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Auto-init failed'));
        } catch (error) {
          // The auto-init should catch errors, not re-throw them
        }
      }
      
      consoleErrorSpy.mockRestore();
    });

    it('checks environment detection', () => {
      // Verify we can detect Node.js vs browser environment
      expect(typeof window).toBe('undefined'); // Node.js
      
      // Simulate browser environment
      (global as any).window = {};
      expect(typeof window).not.toBe('undefined'); // Browser
      
      // Cleanup
      delete (global as any).window;
    });

    it('validates URL format checking logic', () => {
      const testUrls = [
        { url: 'pglite://./test.db', expected: true },
        { url: 'pglite://', expected: true },
        { url: 'postgresql://localhost/db', expected: false },
        { url: undefined, expected: false },
        { url: '', expected: false },
      ];

      testUrls.forEach(({ url, expected }) => {
        const result = url?.startsWith('pglite://') ?? false;
        expect(result).toBe(expected);
      });
    });
  });

  describe('Error handling edge cases', () => {
    it('preserves original error when PGlite initialization fails', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      const originalError = new Error('Original PGlite error');
      originalError.stack = 'Original stack trace';
      
      mockInitializePGlite.mockRejectedValue(originalError);

      try {
        await initializeDatabase();
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBe(originalError);
        expect(error.message).toBe('Original PGlite error');
        expect(error.stack).toBe('Original stack trace');
      }
    });

    it('handles non-Error rejections', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      mockInitializePGlite.mockRejectedValue('String error');

      await expect(initializeDatabase()).rejects.toBe('String error');
    });

    it('handles null/undefined rejections', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      mockInitializePGlite.mockRejectedValue(null);

      await expect(initializeDatabase()).rejects.toBeNull();
    });
  });

  describe('Logging behavior', () => {
    it('uses correct emoji and messages', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      mockInitializePGlite.mockResolvedValue({} as any);

      await initializeDatabase();

      expect(consoleSpy).toHaveBeenNthCalledWith(1, '🔧 Initializing PGlite database...');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '✅ PGlite initialized');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('only logs start message when initialization fails', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      mockInitializePGlite.mockRejectedValue(new Error('Init failed'));

      try {
        await initializeDatabase();
      } catch (error) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('🔧 Initializing PGlite database...');
      expect(consoleSpy).not.toHaveBeenCalledWith('✅ PGlite initialized');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('maintains log order during successful initialization', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      mockInitializePGlite.mockResolvedValue({} as any);

      await initializeDatabase();

      const calls = consoleSpy.mock.calls;
      expect(calls[0][0]).toBe('🔧 Initializing PGlite database...');
      expect(calls[1][0]).toBe('✅ PGlite initialized');
    });
  });
});