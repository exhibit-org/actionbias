import { eq, and, inArray, sql } from "drizzle-orm";
import { actions, edges } from "../../db/schema";
import { getDb } from "../db/adapter";

export interface BlockingDependency {
  blockingActionId: string;
  blockingActionTitle: string;
  blockingActionDone: boolean;
  blockedActions: Array<{
    id: string;
    title: string;
  }>;
  blockCount: number;
}

/**
 * Get all incomplete dependencies that are blocking other incomplete actions
 * This is much simpler than trying to find all workable actions
 */
export async function getBlockingDependencies(): Promise<BlockingDependency[]> {
  console.log('[BLOCKING-DEPS] Starting analysis');
  const startTime = Date.now();

  // Single query to get all blocking dependencies
  const query = sql`
    WITH blocking_deps AS (
      SELECT 
        dep.id as blocking_id,
        dep.data->>'title' as blocking_title,
        dep.done as blocking_done,
        blocked.id as blocked_id,
        blocked.data->>'title' as blocked_title
      FROM ${edges} e
      JOIN ${actions} dep ON dep.id = e.src
      JOIN ${actions} blocked ON blocked.id = e.dst
      WHERE e.kind = 'depends_on'
        AND dep.done = false
        AND blocked.done = false
    )
    SELECT 
      blocking_id,
      blocking_title,
      blocking_done,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', blocked_id,
          'title', blocked_title
        )
      ) as blocked_actions,
      COUNT(DISTINCT blocked_id) as block_count
    FROM blocking_deps
    GROUP BY blocking_id, blocking_title, blocking_done
    ORDER BY block_count DESC
  `;

  const result = await getDb().execute(query) as any;
  const rows = result.rows || result;
  
  const blockingDeps = rows.map((row: any) => ({
    blockingActionId: row.blocking_id,
    blockingActionTitle: row.blocking_title,
    blockingActionDone: row.blocking_done,
    blockedActions: row.blocked_actions,
    blockCount: parseInt(row.block_count)
  }));

  console.log(`[BLOCKING-DEPS] Found ${blockingDeps.length} blocking dependencies in ${Date.now() - startTime}ms`);
  
  return blockingDeps;
}

/**
 * Get actions that have no incomplete dependencies
 * (These are actually workable)
 */
export async function getActionsWithNoDependencies(): Promise<any[]> {
  console.log('[NO-DEPS] Starting query');
  const startTime = Date.now();

  const query = sql`
    WITH has_incomplete_deps AS (
      SELECT DISTINCT e.dst as action_id
      FROM ${edges} e
      JOIN ${actions} dep ON dep.id = e.src
      WHERE e.kind = 'depends_on'
        AND dep.done = false
    )
    SELECT 
      a.id,
      a.data,
      a.done,
      a.version,
      a.created_at,
      a.updated_at
    FROM ${actions} a
    WHERE a.done = false
      AND a.id NOT IN (SELECT action_id FROM has_incomplete_deps)
    ORDER BY a.updated_at DESC
  `;

  const result = await getDb().execute(query) as any;
  const rows = result.rows || result;
  
  console.log(`[NO-DEPS] Found ${rows.length} actions with no dependencies in ${Date.now() - startTime}ms`);
  
  return rows;
}