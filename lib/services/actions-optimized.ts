import { eq, and, inArray, sql } from "drizzle-orm";
import { actions, edges } from "../../db/schema";
import { getDb } from "../db/adapter";
import { Action } from "../types/resources";

/**
 * Optimized version of getUnblockedActions that uses bulk queries
 * instead of individual queries per action
 */
export async function getUnblockedActionsOptimized(limit: number = 50): Promise<Action[]> {
  console.log('[OPTIMIZED] Starting getUnblockedActions with limit:', limit);
  const startTime = Date.now();
  
  // Add timeout protection
  const timeout = 50000; // 50 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
  });

  // Step 1: Get ALL incomplete actions in one query
  const queryPromise = getDb()
    .select()
    .from(actions)
    .where(eq(actions.done, false));
    
  const incompleteActions = await Promise.race([queryPromise, timeoutPromise]) as any[];
  
  console.log(`[OPTIMIZED] Found ${incompleteActions.length} incomplete actions in ${Date.now() - startTime}ms`);

  if (incompleteActions.length === 0) {
    return [];
  }

  const actionIds = incompleteActions.map((a: any) => a.id);
  const actionMap = new Map(incompleteActions.map((a: any) => [a.id, a]));

  // Step 2: Get only dependency edges (family relationships are now handled through dependencies)
  const edgeQueryStart = Date.now();
  const dependencyEdges = await getDb()
    .select()
    .from(edges)
    .where(eq(edges.kind, "depends_on"));
  
  console.log(`[OPTIMIZED] Loaded ${dependencyEdges.length} dependency edges in ${Date.now() - edgeQueryStart}ms`);

  // Step 3: Build dependencies map (only dependency edges needed now)
  const dependenciesMap = new Map<string, string[]>();

  // Build dependencies map from dependency edges
  for (const edge of dependencyEdges as any[]) {
    if (edge.src && edge.dst) {
      if (!dependenciesMap.has(edge.dst)) {
        dependenciesMap.set(edge.dst, []);
      }
      dependenciesMap.get(edge.dst)!.push(edge.src);
    }
  }

  // Step 4: Get all dependency action statuses in one query
  const allDependencyIds = Array.from(new Set(
    Array.from(dependenciesMap.values()).flat()
  ));
  
  let dependencyStatuses = new Map<string, boolean>();
  if (allDependencyIds.length > 0) {
    const dependencyActions = await getDb()
      .select({
        id: actions.id,
        done: actions.done
      })
      .from(actions)
      .where(inArray(actions.id, allDependencyIds));
    
    dependencyStatuses = new Map(
      dependencyActions.map((a: any) => [a.id, a.done])
    );
  }

  console.log(`[OPTIMIZED] Loaded ${dependencyStatuses.size} dependency statuses`);

  // Step 5: Check each action for workability (simplified - only check dependencies)
  const filterStart = Date.now();
  const unblockedActions: Action[] = [];
  let processed = 0;

  for (const action of incompleteActions as any[]) {
    processed++;
    if (processed % 50 === 0) {
      console.log(`[OPTIMIZED] Processed ${processed}/${incompleteActions.length} actions...`);
    }
    
    // Check dependencies only - parent-child relationships are now handled through dependencies
    const dependencies = dependenciesMap.get(action.id) || [];
    const hasUnmetDependencies = dependencies.some(depId => {
      const depDone = dependencyStatuses.get(depId);
      return depDone === false; // Explicitly false, not undefined
    });

    if (hasUnmetDependencies) {
      continue; // Action is blocked by incomplete dependencies
    }

    // No unmet dependencies - action is unblocked
    unblockedActions.push({
      id: action.id,
      data: action.data as { title: string },
      done: action.done,
      version: action.version,
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    });

    if (unblockedActions.length >= limit) {
      break;
    }
  }

  console.log(`[OPTIMIZED] Found ${unblockedActions.length} unblocked actions in ${Date.now() - filterStart}ms filtering`);
  console.log(`[OPTIMIZED] Total time: ${Date.now() - startTime}ms`);

  return unblockedActions;
}

/**
 * Simplified single query version that only checks dependencies
 * Family relationships are handled through dependency edges now
 */
export async function getUnblockedActionsSingleQuery(): Promise<Action[]> {
  console.log('[SINGLE-QUERY] Starting getUnblockedActions');
  const startTime = Date.now();

  // This query finds all incomplete actions that have no incomplete dependencies
  // Since parents now depend on children, family relationships are automatically handled
  const query = sql`
    WITH incomplete_actions AS (
      SELECT * FROM ${actions} WHERE ${actions.done} = false
    ),
    -- Actions with incomplete dependencies
    has_incomplete_deps AS (
      SELECT DISTINCT e.dst as action_id
      FROM ${edges} e
      JOIN ${actions} a ON a.id = e.src
      WHERE e.kind = 'depends_on' 
        AND e.dst IN (SELECT id FROM incomplete_actions)
        AND a.done = false
    )
    SELECT 
      a.id,
      a.data,
      a.done,
      a.version,
      a.created_at,
      a.updated_at
    FROM incomplete_actions a
    WHERE 
      -- No incomplete dependencies (this handles parent-child relationships too)
      a.id NOT IN (SELECT action_id FROM has_incomplete_deps)
    ORDER BY a.updated_at DESC
    LIMIT 1000;
  `;

  const result = await getDb().execute(query);
  
  const unblockedActions = result.rows.map((row: any) => ({
    id: row.id,
    data: row.data as { title: string },
    done: row.done,
    version: row.version,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));

  console.log(`[SINGLE-QUERY] Found ${unblockedActions.length} unblocked actions in ${Date.now() - startTime}ms`);
  
  return unblockedActions;
}