import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDb } from '../../lib/db/adapter';
import { actions, edges } from '../../db/schema';
import { eq } from 'drizzle-orm';

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

async function getWorkableActions(): Promise<any[]> {
  // Inline the logic from our API to test it
  const allActions = await getDb().select().from(actions);
  const allEdges = await getDb().select().from(edges);
  
  const incompleteActions = allActions.filter((a: any) => !a.done);
  const actionMap = new Map(allActions.map((a: any) => [a.id, a]));
  
  const dependencyEdges = allEdges.filter((e: any) => e.kind === 'depends_on');
  const familyEdges = allEdges.filter((e: any) => e.kind === 'family');
  
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
  
  return workableActions;
}

describe('Workable Actions Logic', () => {
  beforeEach(async () => {
    // Clean up test data
    await getDb().delete(edges);
    await getDb().delete(actions);
  });
  
  afterEach(async () => {
    // Clean up test data
    await getDb().delete(edges);
    await getDb().delete(actions);
  });

  it('should find simple action with no dependencies or children as workable', async () => {
    await createTestAction('action-1', 'Simple Action');
    
    const workable = await getWorkableActions();
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('action-1');
  });

  it('should find action with completed dependencies as workable', async () => {
    await createTestAction('dep-1', 'Dependency 1', true); // completed
    await createTestAction('dep-2', 'Dependency 2', true); // completed
    await createTestAction('action-1', 'Action with deps');
    
    await createDependency('dep-1', 'action-1');
    await createDependency('dep-2', 'action-1');
    
    const workable = await getWorkableActions();
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('action-1');
  });

  it('should NOT find action with incomplete dependencies as workable', async () => {
    await createTestAction('dep-1', 'Dependency 1', true); // completed
    await createTestAction('dep-2', 'Dependency 2', false); // NOT completed
    await createTestAction('action-1', 'Action with deps');
    
    await createDependency('dep-1', 'action-1');
    await createDependency('dep-2', 'action-1');
    
    const workable = await getWorkableActions();
    expect(workable).toHaveLength(0);
  });

  it('should find action with all children completed as workable', async () => {
    await createTestAction('parent', 'Parent Action');
    await createTestAction('child-1', 'Child 1', true); // completed
    await createTestAction('child-2', 'Child 2', true); // completed
    
    await createFamilyRelation('parent', 'child-1');
    await createFamilyRelation('parent', 'child-2');
    
    const workable = await getWorkableActions();
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('parent');
  });

  it('should NOT find action with incomplete children as workable', async () => {
    await createTestAction('parent', 'Parent Action');
    await createTestAction('child-1', 'Child 1', true); // completed
    await createTestAction('child-2', 'Child 2', false); // NOT completed
    
    await createFamilyRelation('parent', 'child-1');
    await createFamilyRelation('parent', 'child-2');
    
    const workable = await getWorkableActions();
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('child-2'); // Only the incomplete child is workable
  });

  it('should handle complex scenario with dependencies and children', async () => {
    // Create a complex tree:
    // parent (depends on dep-1)
    //   ├── child-1 (done)
    //   └── child-2
    //         └── grandchild (not done)
    
    await createTestAction('dep-1', 'Dependency', true); // completed
    await createTestAction('parent', 'Parent');
    await createTestAction('child-1', 'Child 1', true); // completed
    await createTestAction('child-2', 'Child 2');
    await createTestAction('grandchild', 'Grandchild');
    
    await createDependency('dep-1', 'parent');
    await createFamilyRelation('parent', 'child-1');
    await createFamilyRelation('parent', 'child-2');
    await createFamilyRelation('child-2', 'grandchild');
    
    const workable = await getWorkableActions();
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('grandchild'); // Only the leaf node is workable
  });

  it('should handle circular dependencies gracefully', async () => {
    // Create circular dependency: A -> B -> C -> A
    await createTestAction('action-a', 'Action A');
    await createTestAction('action-b', 'Action B');
    await createTestAction('action-c', 'Action C');
    
    await createDependency('action-b', 'action-a');
    await createDependency('action-c', 'action-b');
    await createDependency('action-a', 'action-c');
    
    const workable = await getWorkableActions();
    expect(workable).toHaveLength(0); // Nothing is workable due to circular dependency
  });

  it('should handle large number of actions efficiently', async () => {
    const startTime = Date.now();
    
    // Create 100 actions
    for (let i = 0; i < 100; i++) {
      await createTestAction(`action-${i}`, `Action ${i}`);
    }
    
    // Create some dependencies
    for (let i = 10; i < 20; i++) {
      await createDependency(`action-${i-10}`, `action-${i}`);
    }
    
    // Create some family relations
    for (let i = 30; i < 40; i++) {
      await createFamilyRelation(`action-${i}`, `action-${i+10}`);
    }
    
    const workable = await getWorkableActions();
    const duration = Date.now() - startTime;
    
    console.log(`Processing 100 actions took ${duration}ms`);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    expect(workable.length).toBeGreaterThan(0);
  });
});