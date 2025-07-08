describe('PGlite Connection and Operations', () => {
  let testDb: any;
  let rawPglite: any;
  const originalEnv = process.env;

  beforeAll(async () => {
    // Clean up any existing test database first
    const fs = require('fs');
    const dbPath = '.pglite-connection-test';
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
    }
    
    // Ensure SKIP_MIGRATIONS is set before initializing
    process.env.SKIP_MIGRATIONS = 'true';
    process.env.DATABASE_URL = 'pglite://.pglite-connection-test';
    
    // Get the raw PGlite instance for direct SQL operations
    const { PGlite } = await import('@electric-sql/pglite');
    rawPglite = new PGlite('.pglite-connection-test');
    
    // Dynamically import and reset cache to ensure env vars are set
    const { initializePGlite, resetCache } = await import('../../lib/db/adapter');
    resetCache(); // Clear any cached instances
    
    // Also get the Drizzle wrapper for comparison
    testDb = await initializePGlite();
  });

  afterAll(async () => {
    // Clean up PGlite instances to prevent Jest from hanging
    if (rawPglite) {
      await rawPglite.close();
    }
    
    // Clean up the test database directory
    const fs = require('fs');
    const path = require('path');
    const dbPath = '.pglite-connection-test';
    
    try {
      if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { recursive: true, force: true });
        console.log(`Cleaned up test database directory: ${dbPath}`);
      }
    } catch (error) {
      console.warn(`Failed to clean up test database directory: ${error}`);
    }
    
    // Reset environment
    process.env = originalEnv;
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await rawPglite.exec('DROP TABLE IF EXISTS test_edges CASCADE');
      await rawPglite.exec('DROP TABLE IF EXISTS test_actions CASCADE');
    } catch (error) {
      // Tables might not exist yet, which is fine
    }
  });

  describe('database initialization', () => {
    it('should successfully initialize PGlite', () => {
      expect(testDb).toBeDefined();
      expect(typeof testDb.select).toBe('function');
      expect(rawPglite).toBeDefined();
      expect(typeof rawPglite.exec).toBe('function');
    });

    it('should support PostgreSQL syntax', async () => {
      const result = await rawPglite.query('SELECT version()');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].version).toContain('PostgreSQL');
    });
  });

  describe('schema creation', () => {
    it('should create tables with correct structure', async () => {
      // Create actions table
      await rawPglite.exec(`
        CREATE TABLE test_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          data JSONB NOT NULL,
          done BOOLEAN NOT NULL DEFAULT false,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create edges table
      await rawPglite.exec(`
        CREATE TABLE test_edges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          src UUID NOT NULL,
          dst UUID NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('family', 'depends_on')),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(src, dst, kind)
        )
      `);

      // Verify tables exist
      const tablesResult = await rawPglite.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'test_%'
        ORDER BY table_name
      `);

      const tableNames = tablesResult.rows.map((row: any) => row.table_name);
      expect(tableNames).toContain('test_actions');
      expect(tableNames).toContain('test_edges');
    });

    it('should verify column structure for actions table', async () => {
      await rawPglite.exec(`
        CREATE TABLE test_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          data JSONB NOT NULL,
          done BOOLEAN NOT NULL DEFAULT false,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const columnsResult = await rawPglite.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'test_actions'
        ORDER BY ordinal_position
      `);

      const columns = columnsResult.rows.map((row: any) => row.column_name);
      expect(columns).toEqual(['id', 'data', 'done', 'version', 'created_at', 'updated_at']);
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      // Set up test table
      await rawPglite.exec(`
        CREATE TABLE test_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          data JSONB NOT NULL,
          done BOOLEAN NOT NULL DEFAULT false,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    it('should insert and retrieve data', async () => {
      const actionData = { title: 'Test Action', description: 'Test Description' };
      
      const insertResult = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id, data, done, version
      `, [JSON.stringify(actionData)]);

      expect(insertResult.rows).toHaveLength(1);
      const action = insertResult.rows[0];
      expect(action.data).toEqual(actionData);
      expect(action.done).toBe(false);
      expect(action.version).toBe(1);
      expect(action.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should update existing records', async () => {
      // Insert initial record
      const insertResult = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'Original Title' })]);

      const actionId = insertResult.rows[0].id;

      // Update the record
      await rawPglite.query(`
        UPDATE test_actions SET 
          data = $2, 
          done = $3, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [actionId, JSON.stringify({ title: 'Updated Title' }), true]);

      // Verify update
      const selectResult = await rawPglite.query(`
        SELECT data, done FROM test_actions WHERE id = $1
      `, [actionId]);

      expect(selectResult.rows[0].data.title).toBe('Updated Title');
      expect(selectResult.rows[0].done).toBe(true);
    });

    it('should delete records', async () => {
      // Insert record
      const insertResult = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'To Delete' })]);

      const actionId = insertResult.rows[0].id;

      // Verify it exists
      let selectResult = await rawPglite.query(`
        SELECT COUNT(*) as count FROM test_actions WHERE id = $1
      `, [actionId]);
      expect(parseInt(selectResult.rows[0].count)).toBe(1);

      // Delete it
      await rawPglite.query('DELETE FROM test_actions WHERE id = $1', [actionId]);

      // Verify it's gone
      selectResult = await rawPglite.query(`
        SELECT COUNT(*) as count FROM test_actions WHERE id = $1
      `, [actionId]);
      expect(parseInt(selectResult.rows[0].count)).toBe(0);
    });
  });

  describe('relationships and constraints', () => {
    beforeEach(async () => {
      await rawPglite.exec(`
        CREATE TABLE test_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          data JSONB NOT NULL,
          done BOOLEAN NOT NULL DEFAULT false,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await rawPglite.exec(`
        CREATE TABLE test_edges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          src UUID NOT NULL,
          dst UUID NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('family', 'depends_on')),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(src, dst, kind)
        )
      `);
    });

    it('should create and query relationships', async () => {
      // Create two actions
      const action1Result = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'Parent Action' })]);

      const action2Result = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'Child Action' })]);

      const parentId = action1Result.rows[0].id;
      const childId = action2Result.rows[0].id;

      // Create relationship
      await rawPglite.query(`
        INSERT INTO test_edges (src, dst, kind) VALUES ($1, $2, $3)
      `, [parentId, childId, 'family']);

      // Query relationship
      const edgeResult = await rawPglite.query(`
        SELECT src, dst, kind FROM test_edges WHERE src = $1 AND dst = $2
      `, [parentId, childId]);

      expect(edgeResult.rows).toHaveLength(1);
      expect(edgeResult.rows[0].kind).toBe('family');
      expect(edgeResult.rows[0].src).toBe(parentId);
      expect(edgeResult.rows[0].dst).toBe(childId);
    });

    it('should enforce unique constraint on edges', async () => {
      const action1Result = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'Action 1' })]);

      const action2Result = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'Action 2' })]);

      const id1 = action1Result.rows[0].id;
      const id2 = action2Result.rows[0].id;

      // First insert should succeed
      await rawPglite.query(`
        INSERT INTO test_edges (src, dst, kind) VALUES ($1, $2, $3)
      `, [id1, id2, 'family']);

      // Duplicate insert should fail
      await expect(
        rawPglite.query(`
          INSERT INTO test_edges (src, dst, kind) VALUES ($1, $2, $3)
        `, [id1, id2, 'family'])
      ).rejects.toThrow();
    });

    it('should enforce check constraint on edge kinds', async () => {
      const action1Result = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'Action 1' })]);

      const action2Result = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'Action 2' })]);

      const id1 = action1Result.rows[0].id;
      const id2 = action2Result.rows[0].id;

      // Valid edge kinds should work
      await rawPglite.query(`
        INSERT INTO test_edges (src, dst, kind) VALUES ($1, $2, $3)
      `, [id1, id2, 'family']);

      await rawPglite.query(`
        INSERT INTO test_edges (src, dst, kind) VALUES ($1, $2, $3)
      `, [id1, id2, 'depends_on']);

      // Invalid edge kind should fail
      await expect(
        rawPglite.query(`
          INSERT INTO test_edges (src, dst, kind) VALUES ($1, $2, $3)
        `, [id1, id2, 'invalid_kind'])
      ).rejects.toThrow();
    });
  });

  describe('advanced PostgreSQL features', () => {
    beforeEach(async () => {
      await rawPglite.exec(`
        CREATE TABLE test_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          data JSONB NOT NULL,
          done BOOLEAN NOT NULL DEFAULT false,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    it('should support JSONB queries', async () => {
      await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1)
      `, [JSON.stringify({ title: 'High Priority Task', priority: 'high', tags: ['urgent', 'important'] })]);

      await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1)
      `, [JSON.stringify({ title: 'Low Priority Task', priority: 'low', tags: ['routine'] })]);

      // Query by JSONB field
      const highPriorityResult = await rawPglite.query(`
        SELECT data FROM test_actions WHERE data->>'priority' = $1
      `, ['high']);

      expect(highPriorityResult.rows).toHaveLength(1);
      expect(highPriorityResult.rows[0].data.title).toBe('High Priority Task');

      // Query JSONB array
      const urgentResult = await rawPglite.query(`
        SELECT data FROM test_actions WHERE data->'tags' ? $1
      `, ['urgent']);

      expect(urgentResult.rows).toHaveLength(1);
      expect(urgentResult.rows[0].data.tags).toContain('urgent');
    });

    it('should support transactions', async () => {
      await rawPglite.exec('BEGIN');

      try {
        await rawPglite.query(`
          INSERT INTO test_actions (data) VALUES ($1)
        `, [JSON.stringify({ title: 'Transaction Test 1' })]);

        await rawPglite.query(`
          INSERT INTO test_actions (data) VALUES ($1)
        `, [JSON.stringify({ title: 'Transaction Test 2' })]);

        const countResult = await rawPglite.query('SELECT COUNT(*) as count FROM test_actions');
        expect(parseInt(countResult.rows[0].count)).toBe(2);

        await rawPglite.exec('COMMIT');

        // Verify data persisted after commit
        const finalCountResult = await rawPglite.query('SELECT COUNT(*) as count FROM test_actions');
        expect(parseInt(finalCountResult.rows[0].count)).toBe(2);
      } catch (error) {
        await rawPglite.exec('ROLLBACK');
        throw error;
      }
    });

    it('should support UUID generation', async () => {
      const result = await rawPglite.query(`
        INSERT INTO test_actions (data) VALUES ($1) RETURNING id
      `, [JSON.stringify({ title: 'UUID Test' })]);

      const uuid = result.rows[0].id;
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('drizzle integration', () => {
    it('should work with Drizzle ORM queries', async () => {
      // Drizzle instance should be functional for basic operations
      expect(testDb).toBeDefined();
      expect(typeof testDb.select).toBe('function');
      expect(typeof testDb.insert).toBe('function');
      expect(typeof testDb.update).toBe('function');
      expect(typeof testDb.delete).toBe('function');
    });
  });
});