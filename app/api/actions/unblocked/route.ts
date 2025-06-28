import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db/adapter";
import { actions, edges } from "../../../../db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";

export const maxDuration = 60; // 60 seconds timeout

interface UnblockedDebugInfo {
  totalActions: number;
  incompleteActions: number;
  unblockedActions: number;
  timings: {
    loadActions?: number;
    loadEdges?: number;
    processDependencies?: number;
    processChildren?: number;
    total?: number;
  };
  errors: string[];
  sample?: any[];
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const debug: UnblockedDebugInfo = {
    totalActions: 0,
    incompleteActions: 0,
    unblockedActions: 0,
    timings: {},
    errors: [],
    sample: []
  };

  try {
    // Step 1: Load all actions
    const actionsStart = Date.now();
    const allActions = await getDb().select().from(actions);
    debug.timings.loadActions = Date.now() - actionsStart;
    debug.totalActions = allActions.length;
    
    // Filter incomplete actions
    const incompleteActions = allActions.filter((a: any) => !a.done);
    debug.incompleteActions = incompleteActions.length;
    
    // Step 2: Load all edges
    const edgesStart = Date.now();
    const allEdges = await getDb().select().from(edges);
    debug.timings.loadEdges = Date.now() - edgesStart;
    
    // Build lookup maps
    const actionMap = new Map(allActions.map((a: any) => [a.id, a]));
    const dependencyEdges = allEdges.filter((e: any) => e.kind === 'depends_on');
    const familyEdges = allEdges.filter((e: any) => e.kind === 'family');
    
    // Build dependency map: action -> [dependencies]
    const dependencyMap = new Map<string, string[]>();
    for (const edge of dependencyEdges) {
      if (edge.dst && edge.src) {
        if (!dependencyMap.has(edge.dst)) {
          dependencyMap.set(edge.dst, []);
        }
        dependencyMap.get(edge.dst)!.push(edge.src);
      }
    }
    
    // Build children map: parent -> [children]
    const childrenMap = new Map<string, string[]>();
    for (const edge of familyEdges) {
      if (edge.src && edge.dst) {
        if (!childrenMap.has(edge.src)) {
          childrenMap.set(edge.src, []);
        }
        childrenMap.get(edge.src)!.push(edge.dst);
      }
    }
    
    // Step 3: Process each incomplete action
    const processStart = Date.now();
    const unblockedActions = [];
    
    for (const action of incompleteActions) {
      // Check dependencies
      const dependencies = dependencyMap.get(action.id) || [];
      let dependenciesMet = true;
      
      for (const depId of dependencies) {
        const dep = actionMap.get(depId) as any;
        if (dep && !dep.done) {
          dependenciesMet = false;
          break;
        }
      }
      
      if (!dependenciesMet) continue;
      
      // Check children
      const children = childrenMap.get(action.id) || [];
      let isUnblocked = true;
      
      if (children.length > 0) {
        // Has children - check if all are done
        for (const childId of children) {
          const child = actionMap.get(childId) as any;
          if (child && !child.done) {
            isUnblocked = false;
            break;
          }
        }
      }
      // If no children, it's a leaf node and is unblocked
      
      if (isUnblocked) {
        unblockedActions.push({
          id: action.id,
          title: (action.data as any).title,
          dependencies: dependencies.length,
          children: children.length
        });
      }
    }
    
    debug.timings.processDependencies = Date.now() - processStart;
    debug.unblockedActions = unblockedActions.length;
    debug.sample = unblockedActions.slice(0, 5);
    debug.timings.total = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      debug,
      unblocked: unblockedActions
    });
    
  } catch (error) {
    debug.errors.push((error as Error).message);
    debug.timings.total = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      debug
    }, { status: 500 });
  }
}