import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { getDb, initializePGlite, cleanupPGlite } from '../lib/db/adapter';
import { actions, edges } from '../db/schema';
import { sql } from 'drizzle-orm';

// Mock console.log to count queries
let queryCount = 0;
let queryLog: string[] = [];
const originalLog = console.log;

function startQueryCounting() {
  queryCount = 0;
  queryLog = [];
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Query:') || message.includes('select') || message.includes('SELECT')) {
      queryCount++;
      queryLog.push(message);
    }
    originalLog.apply(console, args);
  };
}

function stopQueryCounting() {
  console.log = originalLog;
  return { queryCount, queryLog };
}

// Original inefficient implementation
async function getWorkableActionsOriginal(limit: number = 50): Promise<any[]> {
  startQueryCounting();
  
  const openActions = await getDb()
    .select()
    .from(actions)
    .where(sql`${actions.done} = false`)
    .orderBy(sql`${actions.updatedAt} DESC`)
    .limit(limit * 3);

  const workableActions: any[] = [];

  for (const action of openActions) {
    // Check dependencies for each action (N queries)
    const dependencyEdges = await getDb()
      .select()
      .from(edges)
      .where(sql`${edges.dst} = ${action.id} AND ${edges.kind} = 'depends_on'`);
    
    let dependenciesMet = true;
    for (const edge of dependencyEdges) {
      if (edge.src) {
        const dep = await getDb()
          .select()
          .from(actions)
          .where(sql`${actions.id} = ${edge.src}`)
          .limit(1);
        
        if (dep[0] && !dep[0].done) {
          dependenciesMet = false;
          break;
        }
      }
    }
    
    if (!dependenciesMet) continue;
    
    // Check children for each action (N queries)
    const childEdges = await getDb()
      .select()
      .from(edges)
      .where(sql`${edges.src} = ${action.id} AND ${edges.kind} = 'family'`);
    
    if (childEdges.length === 0) {
      workableActions.push(action);
    } else {
      // Check if all children are done
      let allChildrenDone = true;
      for (const edge of childEdges) {
        if (edge.dst) {
          const child = await getDb()
            .select()
            .from(actions)
            .where(sql`${actions.id} = ${edge.dst}`)
            .limit(1);
          
          if (child[0] && !child[0].done) {
            allChildrenDone = false;
            break;
          }
        }
      }
      
      if (allChildrenDone) {
        workableActions.push(action);
      }
    }
    
    if (workableActions.length >= limit) break;
  }

  const stats = stopQueryCounting();
  console.log(`Original implementation: ${stats.queryCount} queries`);
  return workableActions;
}

// Optimized implementation
async function getWorkableActionsOptimized(): Promise<any[]> {
  startQueryCounting();
  
  // Load all data in just a few queries
  const [allActions, allEdges] = await Promise.all([
    getDb().select().from(actions),
    getDb().select().from(edges)
  ]);
  
  const incompleteActions = allActions.filter((a: any) => !a.done);
  const actionMap = new Map(allActions.map((a: any) => [a.id, a]));
  
  const dependencyEdges = allEdges.filter((e: any) => e.kind === 'depends_on');
  const familyEdges = allEdges.filter((e: any) => e.kind === 'family');
  
  // Build lookup maps
  const dependencyMap = new Map<string, string[]>();
  for (const edge of dependencyEdges) {
    if (edge.dst && edge.src) {
      if (!dependencyMap.has(edge.dst)) {
        dependencyMap.set(edge.dst, []);
      }
      dependencyMap.get(edge.dst)!.push(edge.src);
    }
  }
  
  const childrenMap = new Map<string, string[]>();
  for (const edge of familyEdges) {
    if (edge.src && edge.dst) {
      if (!childrenMap.has(edge.src)) {
        childrenMap.set(edge.src, []);
      }
      childrenMap.get(edge.src)!.push(edge.dst);
    }
  }
  
  // Process in memory
  const workableActions = [];
  for (const action of incompleteActions) {
    const dependencies = dependencyMap.get(action.id) || [];
    let dependenciesMet = true;
    
    for (const depId of dependencies) {
      const dep = actionMap.get(depId);
      if (dep && !dep.done) {
        dependenciesMet = false;
        break;
      }
    }
    
    if (!dependenciesMet) continue;
    
    const children = childrenMap.get(action.id) || [];
    let isWorkable = true;
    
    if (children.length > 0) {
      for (const childId of children) {
        const child = actionMap.get(childId);
        if (child && !child.done) {
          isWorkable = false;
          break;
        }
      }
    }
    
    if (isWorkable) {
      workableActions.push(action);
    }
  }
  
  const stats = stopQueryCounting();
  console.log(`Optimized implementation: ${stats.queryCount} queries`);
  return workableActions;
}

// Helper to create test data
async function createTestAction(id: string, title: string, done: boolean = false) {
  await getDb().insert(actions).values({
    id,
    data: { title },
    done,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

async function createDependency(fromId: string, toId: string) {
  await getDb().insert(edges).values({
    id: `dep-${fromId}-${toId}`,
    src: fromId,
    dst: toId,
    kind: 'depends_on'
  });
}

async function createFamilyRelation(parentId: string, childId: string) {
  await getDb().insert(edges).values({
    id: `fam-${parentId}-${childId}`,
    src: parentId,
    dst: childId,
    kind: 'family'
  });
}

describe('Workable Actions Performance', () => {
  beforeAll(async () => {
    // Initialize PGlite for tests
    await cleanupPGlite();
    await initializePGlite();
  });
  
  afterAll(async () => {
    await cleanupPGlite();
  });
  
  beforeEach(async () => {
    // Clean tables by truncating (safer than delete)
    await getDb().execute(sql`TRUNCATE TABLE ${edges} CASCADE`);
    await getDb().execute(sql`TRUNCATE TABLE ${actions} CASCADE`);
  });
  
  afterEach(async () => {
    // Clean up after each test
    await getDb().execute(sql`TRUNCATE TABLE ${edges} CASCADE`);
    await getDb().execute(sql`TRUNCATE TABLE ${actions} CASCADE`);
  });

  it('should handle small dataset efficiently', async () => {
    // Create 10 actions with some dependencies
    for (let i = 0; i < 10; i++) {
      await createTestAction(`action-${i}`, `Action ${i}`, i < 3);
    }
    
    // Create some dependencies
    await createDependency('action-0', 'action-3');
    await createDependency('action-1', 'action-4');
    await createDependency('action-2', 'action-5');
    
    console.log('\n=== Small Dataset (10 actions) ===');
    const original = await getWorkableActionsOriginal(10);
    const optimized = await getWorkableActionsOptimized();
    
    expect(original.length).toBe(optimized.length);
  });

  it('should handle medium dataset with complex relationships', async () => {
    // Create 50 actions
    for (let i = 0; i < 50; i++) {
      await createTestAction(`action-${i}`, `Action ${i}`, i < 10);
    }
    
    // Create dependency chains
    for (let i = 10; i < 30; i++) {
      await createDependency(`action-${i-10}`, `action-${i}`);
    }
    
    // Create family hierarchies
    for (let i = 30; i < 40; i++) {
      await createFamilyRelation(`action-${i}`, `action-${i+10}`);
    }
    
    console.log('\n=== Medium Dataset (50 actions) ===');
    const originalStart = Date.now();
    const original = await getWorkableActionsOriginal(20);
    const originalTime = Date.now() - originalStart;
    
    const optimizedStart = Date.now();
    const optimized = await getWorkableActionsOptimized();
    const optimizedTime = Date.now() - optimizedStart;
    
    console.log(`Original time: ${originalTime}ms`);
    console.log(`Optimized time: ${optimizedTime}ms`);
    console.log(`Speedup: ${(originalTime / optimizedTime).toFixed(2)}x`);
    
    expect(original.length).toBeLessThanOrEqual(20); // Respects limit
  });

  it('should handle large dataset similar to production', async () => {
    console.log('\n=== Large Dataset (200 actions) ===');
    
    // Create 200 actions (similar to production)
    for (let i = 0; i < 200; i++) {
      await createTestAction(`action-${i}`, `Action ${i}`, i < 50);
    }
    
    // Create complex dependency network
    for (let i = 50; i < 150; i++) {
      // Each action depends on 1-3 previous actions
      const numDeps = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numDeps; j++) {
        const depId = Math.floor(Math.random() * i);
        await createDependency(`action-${depId}`, `action-${i}`);
      }
    }
    
    // Create deep family hierarchies
    for (let i = 0; i < 20; i++) {
      // Create 3-level deep hierarchies
      const parent = `action-${150 + i}`;
      for (let j = 0; j < 3; j++) {
        const child = `action-${170 + i * 3 + j}`;
        await createFamilyRelation(parent, child);
      }
    }
    
    // Test optimized version only (original would take too long)
    const optimizedStart = Date.now();
    const optimized = await getWorkableActionsOptimized();
    const optimizedTime = Date.now() - optimizedStart;
    
    console.log(`Found ${optimized.length} workable actions`);
    console.log(`Optimized time: ${optimizedTime}ms`);
    
    expect(optimizedTime).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should handle pathological case with all actions dependent', async () => {
    console.log('\n=== Pathological Case (100 actions, all dependent) ===');
    
    // Create a long dependency chain
    for (let i = 0; i < 100; i++) {
      await createTestAction(`action-${i}`, `Action ${i}`, false);
      if (i > 0) {
        await createDependency(`action-${i-1}`, `action-${i}`);
      }
    }
    
    const optimizedStart = Date.now();
    const optimized = await getWorkableActionsOptimized();
    const optimizedTime = Date.now() - optimizedStart;
    
    console.log(`Found ${optimized.length} workable actions`);
    console.log(`Time: ${optimizedTime}ms`);
    
    expect(optimized.length).toBe(1); // Only first action is workable
  });

  it('should count exact queries for different implementations', async () => {
    // Create test data
    for (let i = 0; i < 20; i++) {
      await createTestAction(`action-${i}`, `Action ${i}`, i < 5);
    }
    
    // Original implementation with detailed query logging
    console.log('\n=== Query Count Analysis ===');
    startQueryCounting();
    
    // Manually count expected queries for original
    const openActions = await getDb()
      .select()
      .from(actions)
      .where(sql`${actions.done} = false`)
      .limit(60);
    
    console.log(`Initial query found ${openActions.length} incomplete actions`);
    
    // For each action, we expect:
    // 1 query for dependencies
    // N queries for each dependency to check if done
    // 1 query for children  
    // M queries for each child to check if done
    
    const stats = stopQueryCounting();
    console.log(`Base query: ${stats.queryCount} queries`);
    
    // Now test optimized
    startQueryCounting();
    await getWorkableActionsOptimized();
    const optimizedStats = stopQueryCounting();
    
    console.log(`\nOptimized approach uses exactly ${optimizedStats.queryCount} queries`);
    expect(optimizedStats.queryCount).toBe(2); // Only 2 queries total!
  });
});