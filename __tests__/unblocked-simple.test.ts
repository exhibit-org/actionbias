import { describe, it, expect } from '@jest/globals';

// Simple mock implementation to test the algorithm
interface Action {
  id: string;
  title: string;
  done: boolean;
}

interface Edge {
  src: string;
  dst: string;
  kind: 'family' | 'depends_on';
}

function getWorkableActions(
  actions: Action[],
  edges: Edge[]
): Action[] {
  const incompleteActions = actions.filter(a => !a.done);
  const actionMap = new Map(actions.map(a => [a.id, a]));
  
  const dependencyEdges = edges.filter(e => e.kind === 'depends_on');
  const familyEdges = edges.filter(e => e.kind === 'family');
  
  // Build dependency map: action -> [dependencies]
  const dependencyMap = new Map<string, string[]>();
  for (const edge of dependencyEdges) {
    if (!dependencyMap.has(edge.dst)) {
      dependencyMap.set(edge.dst, []);
    }
    dependencyMap.get(edge.dst)!.push(edge.src);
  }
  
  // Build children map: parent -> [children]
  const childrenMap = new Map<string, string[]>();
  for (const edge of familyEdges) {
    if (!childrenMap.has(edge.src)) {
      childrenMap.set(edge.src, []);
    }
    childrenMap.get(edge.src)!.push(edge.dst);
  }
  
  const workableActions = [];
  
  for (const action of incompleteActions) {
    // Check dependencies
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
    
    // Check children
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

describe('Workable Actions Algorithm', () => {
  it('should find simple action with no dependencies or children', () => {
    const actions: Action[] = [
      { id: '1', title: 'Simple Action', done: false }
    ];
    const edges: Edge[] = [];
    
    const workable = getWorkableActions(actions, edges);
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('1');
  });

  it('should not find action with incomplete dependency', () => {
    const actions: Action[] = [
      { id: '1', title: 'Dependency', done: false },
      { id: '2', title: 'Action', done: false }
    ];
    const edges: Edge[] = [
      { src: '1', dst: '2', kind: 'depends_on' }
    ];
    
    const workable = getWorkableActions(actions, edges);
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('1'); // Only the dependency is workable
  });

  it('should find action with completed dependency', () => {
    const actions: Action[] = [
      { id: '1', title: 'Dependency', done: true },
      { id: '2', title: 'Action', done: false }
    ];
    const edges: Edge[] = [
      { src: '1', dst: '2', kind: 'depends_on' }
    ];
    
    const workable = getWorkableActions(actions, edges);
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('2');
  });

  it('should not find parent with incomplete children', () => {
    const actions: Action[] = [
      { id: '1', title: 'Parent', done: false },
      { id: '2', title: 'Child 1', done: true },
      { id: '3', title: 'Child 2', done: false }
    ];
    const edges: Edge[] = [
      { src: '1', dst: '2', kind: 'family' },
      { src: '1', dst: '3', kind: 'family' }
    ];
    
    const workable = getWorkableActions(actions, edges);
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('3'); // Only the incomplete child
  });

  it('should find parent with all children completed', () => {
    const actions: Action[] = [
      { id: '1', title: 'Parent', done: false },
      { id: '2', title: 'Child 1', done: true },
      { id: '3', title: 'Child 2', done: true }
    ];
    const edges: Edge[] = [
      { src: '1', dst: '2', kind: 'family' },
      { src: '1', dst: '3', kind: 'family' }
    ];
    
    const workable = getWorkableActions(actions, edges);
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('1'); // Parent is now workable
  });

  it('should handle complex tree correctly', () => {
    // Create a tree:
    //   1 (depends on 0 which is done)
    //   ├── 2 (done)
    //   └── 3
    //       └── 4 (not done)
    const actions: Action[] = [
      { id: '0', title: 'Dependency', done: true },
      { id: '1', title: 'Root', done: false },
      { id: '2', title: 'Child 1', done: true },
      { id: '3', title: 'Child 2', done: false },
      { id: '4', title: 'Grandchild', done: false }
    ];
    const edges: Edge[] = [
      { src: '0', dst: '1', kind: 'depends_on' },
      { src: '1', dst: '2', kind: 'family' },
      { src: '1', dst: '3', kind: 'family' },
      { src: '3', dst: '4', kind: 'family' }
    ];
    
    const workable = getWorkableActions(actions, edges);
    expect(workable).toHaveLength(1);
    expect(workable[0].id).toBe('4'); // Only the leaf is workable
  });

  it('should handle circular dependencies', () => {
    const actions: Action[] = [
      { id: '1', title: 'A', done: false },
      { id: '2', title: 'B', done: false },
      { id: '3', title: 'C', done: false }
    ];
    const edges: Edge[] = [
      { src: '2', dst: '1', kind: 'depends_on' }, // A depends on B
      { src: '3', dst: '2', kind: 'depends_on' }, // B depends on C
      { src: '1', dst: '3', kind: 'depends_on' }  // C depends on A (circular)
    ];
    
    const workable = getWorkableActions(actions, edges);
    expect(workable).toHaveLength(0); // Nothing workable due to circular deps
  });

  it('should scale with large datasets', () => {
    const actions: Action[] = [];
    const edges: Edge[] = [];
    
    // Create 200 actions
    for (let i = 0; i < 200; i++) {
      actions.push({
        id: String(i),
        title: `Action ${i}`,
        done: i < 50 // First 50 are done
      });
    }
    
    // Create dependencies
    for (let i = 60; i < 150; i++) {
      edges.push({
        src: String(i - 10),
        dst: String(i),
        kind: 'depends_on'
      });
    }
    
    // Create families
    for (let i = 0; i < 20; i++) {
      const parent = 150 + i;
      for (let j = 0; j < 3; j++) {
        edges.push({
          src: String(parent),
          dst: String(170 + i * 3 + j),
          kind: 'family'
        });
      }
    }
    
    const start = Date.now();
    const workable = getWorkableActions(actions, edges);
    const duration = Date.now() - start;
    
    console.log(`Processing 200 actions took ${duration}ms`);
    console.log(`Found ${workable.length} workable actions`);
    
    expect(duration).toBeLessThan(100); // Should be very fast
    expect(workable.length).toBeGreaterThan(0);
  });
});