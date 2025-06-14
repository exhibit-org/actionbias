// Mock postgres
const mockPostgresClient = {
  end: jest.fn(),
};
const mockPostgres = jest.fn(() => mockPostgresClient);

// Mock PGlite
const mockPGliteInstance = {
  close: jest.fn(),
};
const mockPGliteClass = jest.fn(() => mockPGliteInstance);

// Setup mocks using factory functions
jest.mock('postgres', () => jest.fn(() => mockPostgresClient));
jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: jest.fn(() => ({ query: 'mocked-drizzle-db' })),
}));
jest.mock('@electric-sql/pglite', () => ({
  PGlite: jest.fn(() => mockPGliteInstance),
}));
jest.mock('drizzle-orm/pglite', () => ({
  drizzle: jest.fn(() => ({ query: 'mocked-pglite-drizzle-db' })),
}));

// Import after mocks
import { getDb, initializePGlite, cleanupPGlite } from '../../../lib/db/adapter';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePGlite } from 'drizzle-orm/pglite';

// Get the mocked functions
const mockPostgresModule = postgres as jest.MockedFunction<typeof postgres>;
const mockDrizzleModule = drizzle as jest.MockedFunction<typeof drizzle>;
const mockPGliteModule = PGlite as jest.MockedClass<typeof PGlite>;
const mockDrizzlePGliteModule = drizzlePGlite as jest.MockedFunction<typeof drizzlePGlite>;

describe('Database Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    process.env = { ...originalEnv };
    
    // Reset mock implementations to default
    mockPGliteModule.mockImplementation(() => mockPGliteInstance);
    mockDrizzlePGliteModule.mockImplementation(() => ({ query: 'mocked-pglite-drizzle-db' }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getDb', () => {
    it('throws error when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      
      expect(() => getDb()).toThrow('DATABASE_URL environment variable is not set');
    });

    it('throws error when DATABASE_URL is empty string', () => {
      process.env.DATABASE_URL = '';
      
      expect(() => getDb()).toThrow('DATABASE_URL environment variable is not set');
    });

    it('creates PostgreSQL connection when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      
      const db = getDb();
      
      expect(mockPostgresModule).toHaveBeenCalledWith('postgresql://user:pass@localhost:5432/testdb');
      expect(mockDrizzleModule).toHaveBeenCalledWith(mockPostgresClient);
      expect(db).toEqual({ query: 'mocked-drizzle-db' });
    });

    it('reuses existing PostgreSQL connection on subsequent calls', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      
      const db1 = getDb();
      const db2 = getDb();
      
      expect(mockPostgresModule).toHaveBeenCalledTimes(1);
      expect(mockDrizzleModule).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });

    it('throws error for PGlite URL when not initialized', () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      
      expect(() => getDb()).toThrow('PGlite database not initialized. Run setup first.');
    });

    it('returns PGlite database when initialized', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      
      // Initialize PGlite first
      await initializePGlite();
      
      const db = getDb();
      
      expect(db).toEqual({ query: 'mocked-pglite-drizzle-db' });
    });
  });

  describe('initializePGlite', () => {
    it('initializes PGlite with default path when no specific path given', async () => {
      process.env.DATABASE_URL = 'pglite://';
      
      const db = await initializePGlite();
      
      expect(mockPGliteModule).toHaveBeenCalledWith('.pglite');
      expect(mockDrizzlePGliteModule).toHaveBeenCalledWith(mockPGliteInstance);
      expect(db).toEqual({ query: 'mocked-pglite-drizzle-db' });
    });

    it('initializes PGlite with custom path', async () => {
      process.env.DATABASE_URL = 'pglite://./custom/path.db';
      
      const db = await initializePGlite();
      
      expect(mockPGliteModule).toHaveBeenCalledWith('./custom/path.db');
      expect(mockDrizzlePGliteModule).toHaveBeenCalledWith(mockPGliteInstance);
      expect(db).toEqual({ query: 'mocked-pglite-drizzle-db' });
    });

    it('initializes PGlite with fallback path when DATABASE_URL not set', async () => {
      delete process.env.DATABASE_URL;
      
      const db = await initializePGlite();
      
      expect(mockPGliteModule).toHaveBeenCalledWith('.pglite');
      expect(db).toEqual({ query: 'mocked-pglite-drizzle-db' });
    });

    it('returns existing PGlite instance on subsequent calls', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      
      const db1 = await initializePGlite();
      const db2 = await initializePGlite();
      
      expect(mockPGliteModule).toHaveBeenCalledTimes(1);
      expect(mockDrizzlePGliteModule).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });

    it('handles PGlite import errors', async () => {
      // Mock import failure
      jest.doMock('@electric-sql/pglite', () => {
        throw new Error('Module not found');
      });
      
      await expect(initializePGlite()).rejects.toThrow('Failed to initialize PGlite: Module not found');
    });

    it('handles drizzle-orm/pglite import errors', async () => {
      // Mock drizzle import failure
      jest.doMock('drizzle-orm/pglite', () => {
        throw new Error('Drizzle PGlite module not found');
      });
      
      await expect(initializePGlite()).rejects.toThrow('Failed to initialize PGlite: Drizzle PGlite module not found');
    });

    it('handles PGlite constructor errors', async () => {
      // Mock PGlite constructor throwing
      jest.doMock('@electric-sql/pglite', () => ({
        PGlite: jest.fn(() => {
          throw new Error('Failed to create PGlite instance');
        }),
      }));
      
      await expect(initializePGlite()).rejects.toThrow('Failed to initialize PGlite: Failed to create PGlite instance');
    });

    it('handles non-Error exceptions', async () => {
      // Mock PGlite constructor throwing non-Error
      jest.doMock('@electric-sql/pglite', () => ({
        PGlite: jest.fn(() => {
          throw 'String error';
        }),
      }));
      
      await expect(initializePGlite()).rejects.toThrow('Failed to initialize PGlite: Unknown error');
    });
  });

  describe('cleanupPGlite', () => {
    it('closes PGlite instance when it exists', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      
      // Initialize first
      await initializePGlite();
      
      // Then cleanup
      await cleanupPGlite();
      
      expect(mockPGliteInstance.close).toHaveBeenCalled();
    });

    it('does nothing when no PGlite instance exists', async () => {
      // Should not throw
      await cleanupPGlite();
      
      expect(mockPGliteInstance.close).not.toHaveBeenCalled();
    });

    it('handles cleanup errors gracefully', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      
      // Initialize first
      await initializePGlite();
      
      // Mock close to throw error
      mockPGliteInstance.close.mockRejectedValue(new Error('Close failed'));
      
      // Should not throw, but log warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await cleanupPGlite();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error during PGlite cleanup:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('resets PGlite state after cleanup', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      
      // Initialize
      await initializePGlite();
      
      // Cleanup
      await cleanupPGlite();
      
      // Should throw when trying to get db after cleanup
      expect(() => getDb()).toThrow('PGlite database not initialized. Run setup first.');
    });

    it('allows re-initialization after cleanup', async () => {
      process.env.DATABASE_URL = 'pglite://./test.db';
      
      // Initialize
      await initializePGlite();
      
      // Cleanup
      await cleanupPGlite();
      
      // Re-initialize
      const db = await initializePGlite();
      
      expect(db).toEqual({ query: 'mocked-pglite-drizzle-db' });
      expect(mockPGliteModule).toHaveBeenCalledTimes(2);
    });
  });

  describe('Database URL parsing edge cases', () => {
    it('handles PostgreSQL URLs with special characters', () => {
      process.env.DATABASE_URL = 'postgresql://user%40domain:p%40ssw0rd@localhost:5432/test-db';
      
      const db = getDb();
      
      expect(mockPostgresModule).toHaveBeenCalledWith('postgresql://user%40domain:p%40ssw0rd@localhost:5432/test-db');
      expect(db).toEqual({ query: 'mocked-drizzle-db' });
    });

    it('handles PGlite URLs with complex paths', async () => {
      process.env.DATABASE_URL = 'pglite://./data/databases/test-app.db';
      
      await initializePGlite();
      
      expect(mockPGliteModule).toHaveBeenCalledWith('./data/databases/test-app.db');
    });

    it('handles PGlite URLs with just protocol', async () => {
      process.env.DATABASE_URL = 'pglite://';
      
      await initializePGlite();
      
      expect(mockPGliteModule).toHaveBeenCalledWith('.pglite');
    });
  });
});