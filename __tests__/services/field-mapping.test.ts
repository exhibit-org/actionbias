import { getDb, initializePGlite, cleanupPGlite } from '../../lib/db/adapter';
import { actions } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

describe('Database Field Mapping', () => {
  const baseTestId = Math.random().toString(36).substring(7);
  let testCounter = 0;

  beforeEach(async () => {
    // Set up PGlite for tests with unique paths per test
    testCounter++;
    process.env.DATABASE_URL = `pglite://.pglite-field-mapping-test-${baseTestId}-${testCounter}`;
    await cleanupPGlite(); // Clean up before init
    await initializePGlite();
  });

  afterEach(async () => {
    await cleanupPGlite();
  });
  test('should understand how Drizzle maps snake_case to camelCase', async () => {
    console.log('🔧 Starting field mapping test...');
    
    // First, let's see what happens when we query an existing action
    const db = getDb();
    
    // Try to find any existing action
    const existingActions = await db.select().from(actions).limit(1);
    
    if (existingActions.length > 0) {
      const action = existingActions[0];
      console.log('📊 Raw action object keys:', Object.keys(action));
      console.log('📊 Raw action object:', JSON.stringify(action, null, 2));
      
      // Check if parent summaries are available
      console.log('📊 parentContextSummary (camelCase):', action.parentContextSummary);
      console.log('📊 family_context_summary (snake_case):', (action as any).family_context_summary);
      
      console.log('📊 parentVisionSummary (camelCase):', action.parentVisionSummary);
      console.log('📊 family_vision_summary (snake_case):', (action as any).family_vision_summary);
    } else {
      console.log('📊 No existing actions found');
    }

    // Let's also check what the schema defines
    console.log('📊 Schema field names:');
    console.log('📊 actions.parentContextSummary:', actions.parentContextSummary.name);
    console.log('📊 actions.parentVisionSummary:', actions.parentVisionSummary.name);
  });

  test('should test direct SQL query vs Drizzle query', async () => {
    const db = getDb();
    
    // Try a raw SQL query to see the actual column names
    try {
      const rawResult = await db.execute(sql`
        SELECT id, title, family_context_summary, family_vision_summary 
        FROM actions 
        WHERE family_context_summary IS NOT NULL 
        LIMIT 1
      `);
      
      console.log('📊 Raw SQL result:', rawResult);
    } catch (error) {
      console.log('📊 Raw SQL error:', error);
    }

    // Try Drizzle query
    try {
      const drizzleResult = await db.select({
        id: actions.id,
        title: actions.title,
        parentContextSummary: actions.parentContextSummary,
        parentVisionSummary: actions.parentVisionSummary,
      }).from(actions).limit(1);
      
      console.log('📊 Drizzle explicit select result:', drizzleResult);
    } catch (error) {
      console.log('📊 Drizzle error:', error);
    }
  });
});