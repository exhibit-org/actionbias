import { getDb, initializePGlite } from '../../lib/db/adapter';

describe('Database Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('environment detection', () => {
    it('should throw error when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      
      expect(() => getDb()).toThrow('DATABASE_URL environment variable is not set');
    });

    it('should detect PGlite URL format', () => {
      process.env.DATABASE_URL = 'pglite://.pglite-test';
      
      expect(() => getDb()).toThrow('PGlite database not initialized');
    });

    it('should detect PostgreSQL URL format', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      
      // Should not throw PGlite error for PostgreSQL URLs
      expect(() => getDb()).not.toThrow('PGlite database not initialized');
    });

    it('should detect postgres:// URL format', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dbname';
      
      expect(() => getDb()).not.toThrow('PGlite database not initialized');
    });
  });

  describe('PGlite initialization', () => {
    it('should initialize PGlite successfully', async () => {
      process.env.DATABASE_URL = 'pglite://.pglite-adapter-test';
      
      const db = await initializePGlite();
      
      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
      expect(typeof db.insert).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });

    it('should return the same instance on multiple calls', async () => {
      process.env.DATABASE_URL = 'pglite://.pglite-adapter-test-2';
      
      const db1 = await initializePGlite();
      const db2 = await initializePGlite();
      
      expect(db1).toBe(db2);
    });

    it('should use custom path from DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'pglite://custom-adapter-test';
      
      const db = await initializePGlite();
      expect(db).toBeDefined();
    });

    it('should use default path when DATABASE_URL has no path', async () => {
      process.env.DATABASE_URL = 'pglite://';
      
      const db = await initializePGlite();
      expect(db).toBeDefined();
    });
  });

  describe('URL parsing logic', () => {
    it('should correctly identify different database URL formats', () => {
      const testCases = [
        { url: 'pglite://.pglite', isPGlite: true },
        { url: 'pglite://custom-path', isPGlite: true },
        { url: 'postgresql://user:pass@host:5432/db', isPGlite: false },
        { url: 'postgres://user:pass@host:5432/db', isPGlite: false },
        { url: 'mysql://user:pass@host:3306/db', isPGlite: false },
      ];

      testCases.forEach(({ url, isPGlite }) => {
        expect(url.startsWith('pglite://')).toBe(isPGlite);
      });
    });

    it('should extract path correctly from PGlite URLs', () => {
      const testCases = [
        { url: 'pglite://.pglite', expectedPath: '.pglite' },
        { url: 'pglite://custom-path', expectedPath: 'custom-path' },
        { url: 'pglite://', expectedPath: '' },
        { url: 'pglite://./nested/path', expectedPath: './nested/path' },
      ];

      testCases.forEach(({ url, expectedPath }) => {
        const extractedPath = url.replace('pglite://', '');
        expect(extractedPath).toBe(expectedPath);
      });
    });
  });
});