import { eq, and, inArray, sql } from "drizzle-orm";
import { actions, edges } from "../../db/schema";
import { getDb } from "../db/adapter";
import { Action } from "../types/resources";

/**
 * Optimized version of getWorkableActions that uses bulk queries
 * instead of individual queries per action
 */
export async function getWorkableActionsOptimized(limit: number = 50): Promise<Action[]> {
  console.log('[OPTIMIZED] Starting getWorkableActions with limit:', limit);
  const startTime = Date.now();

  // Step 1: Get ALL incomplete actions in one query
  const incompleteActions = await getDb()
    .select()
    .from(actions)
    .where(eq(actions.done, false));
  
  console.log(`[OPTIMIZED] Found ${incompleteActions.length} incomplete actions in ${Date.now() - startTime}ms`);

  if (incompleteActions.length === 0) {
    return [];
  }

  const actionIds = incompleteActions.map((a: any) => a.id);
  const actionMap = new Map(incompleteActions.map((a: any) => [a.id, a]));

  // Step 2: Get ALL edges in bulk (both family and dependency edges)
  const edgeQueryStart = Date.now();
  const [familyEdges, dependencyEdges] = await Promise.all([
    getDb()
      .select()
      .from(edges)
      .where(and(
        eq(edges.kind, "family"),
        inArray(edges.src, actionIds)
      )),
    getDb()
      .select()
      .from(edges)
      .where(and(
        eq(edges.kind, "depends_on"),
        inArray(edges.dst, actionIds)
      ))
  ]);
  
  console.log(`[OPTIMIZED] Loaded ${familyEdges.length} family edges and ${dependencyEdges.length} dependency edges in ${Date.now() - edgeQueryStart}ms`);

  // Step 3: Build lookup maps
  const childrenMap = new Map<string, string[]>();
  const dependenciesMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  // Build children map and parent map from family edges
  for (const edge of familyEdges as any[]) {
    if (edge.src && edge.dst) {
      if (!childrenMap.has(edge.src)) {
        childrenMap.set(edge.src, []);
      }
      childrenMap.get(edge.src)!.push(edge.dst);
      parentMap.set(edge.dst, edge.src);
    }
  }

  // Build dependencies map
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

  // Step 5: Check each action for workability
  const filterStart = Date.now();
  const workableActions: Action[] = [];

  for (const action of incompleteActions as any[]) {
    // Check dependencies
    const dependencies = dependenciesMap.get(action.id) || [];
    const hasUnmetDependencies = dependencies.some(depId => {
      const depDone = dependencyStatuses.get(depId);
      return depDone === false; // Explicitly false, not undefined
    });

    if (hasUnmetDependencies) {
      continue;
    }

    // Check if it's a leaf node or all children are done
    const children = childrenMap.get(action.id) || [];
    if (children.length === 0) {
      // No children - it's a leaf node, so it's workable
      workableActions.push({
        id: action.id,
        data: action.data as { title: string },
        done: action.done,
        version: action.version,
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
      });
    } else {
      // Has children - check if all are done
      const allChildrenDone = children.every(childId => {
        const child = actionMap.get(childId) as any;
        return child?.done === true;
      });

      if (allChildrenDone) {
        workableActions.push({
          id: action.id,
          data: action.data as { title: string },
          done: action.done,
          version: action.version,
          createdAt: action.createdAt.toISOString(),
          updatedAt: action.updatedAt.toISOString(),
        });
      }
    }

    if (workableActions.length >= limit) {
      break;
    }
  }

  console.log(`[OPTIMIZED] Found ${workableActions.length} workable actions in ${Date.now() - filterStart}ms filtering`);
  console.log(`[OPTIMIZED] Total time: ${Date.now() - startTime}ms`);

  return workableActions;
}

/**
 * Even more optimized version using a single complex query
 * This pushes more logic to the database
 */
export async function getWorkableActionsSingleQuery(): Promise<Action[]> {
  console.log('[SINGLE-QUERY] Starting getWorkableActions');
  const startTime = Date.now();

  // This query finds all incomplete actions that:
  // 1. Have no incomplete dependencies
  // 2. Either have no children OR all children are complete
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
    ),
    -- Actions with incomplete children
    has_incomplete_children AS (
      SELECT DISTINCT e.src as action_id
      FROM ${edges} e
      JOIN ${actions} a ON a.id = e.dst
      WHERE e.kind = 'family'
        AND e.src IN (SELECT id FROM incomplete_actions)
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
      -- No incomplete dependencies
      a.id NOT IN (SELECT action_id FROM has_incomplete_deps)
      -- Either no children or no incomplete children
      AND a.id NOT IN (SELECT action_id FROM has_incomplete_children)
    ORDER BY a.updated_at DESC
    LIMIT 1000;
  `;

  const result = await getDb().execute(query);
  
  const workableActions = result.rows.map((row: any) => ({
    id: row.id,
    data: row.data as { title: string },
    done: row.done,
    version: row.version,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));

  console.log(`[SINGLE-QUERY] Found ${workableActions.length} workable actions in ${Date.now() - startTime}ms`);
  
  return workableActions;
}