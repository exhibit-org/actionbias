/**
 * Path-builder utility for creating breadcrumb paths from action hierarchies
 * 
 * Given an action_id, traverses to root and creates a stringified breadcrumb path
 * like "Product > Marketing > Launch Ads" for UI display.
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/adapter';
import { actions, edges } from '../../db/schema';

export interface PathSegment {
  id: string;
  title: string;
}

export interface PathBuilderResult {
  /** Array of path segments from root to current action */
  segments: PathSegment[];
  /** Formatted breadcrumb string (e.g., "Product > Marketing > Launch Ads") */
  breadcrumb: string;
  /** Array of just the titles for simple display */
  titles: string[];
}

/**
 * Builds a breadcrumb path for a given action by traversing up to the root
 * @param actionId The ID of the action to build the path for
 * @param separator The separator to use in the breadcrumb string (default: " > ")
 * @param includeCurrentAction Whether to include the current action in the path (default: true)
 * @returns PathBuilderResult with segments, breadcrumb string, and titles
 */
export async function buildActionPath(
  actionId: string, 
  separator: string = " > ", 
  includeCurrentAction: boolean = true
): Promise<PathBuilderResult> {
  const db = getDb();
  const pathSegments: PathSegment[] = [];
  
  // First, get the current action if we're including it
  if (includeCurrentAction) {
    const currentActionResult = await db.select().from(actions).where(eq(actions.id, actionId)).limit(1);
    
    if (currentActionResult.length === 0) {
      throw new Error(`Action with ID ${actionId} not found`);
    }
    
    const currentAction = currentActionResult[0];
    const title = currentAction.title || (currentAction.data as any)?.title || 'Untitled';
    
    pathSegments.push({
      id: actionId,
      title
    });
  }
  
  // Walk up the parent chain
  let currentId = actionId;
  const visitedIds = new Set<string>([actionId]); // Prevent infinite loops
  const maxDepth = 50; // Safety limit to prevent runaway queries
  let depth = 0;
  
  while (depth < maxDepth) {
    // Find the parent of the current action
    const parentEdgesResult = await db.select().from(edges).where(
      and(eq(edges.dst, currentId), eq(edges.kind, "family"))
    );
    
    const parentEdges = Array.isArray(parentEdgesResult) ? parentEdgesResult : [];
    
    if (parentEdges.length === 0) {
      // No parent found, we've reached the root
      break;
    }
    
    const parentId = parentEdges[0].src;
    
    if (!parentId || visitedIds.has(parentId)) {
      // Cycle detected or null parent, stop traversal
      break;
    }
    
    visitedIds.add(parentId);
    
    // Get the parent action details
    const parentActionResult = await db.select().from(actions).where(eq(actions.id, parentId)).limit(1);
    
    if (parentActionResult.length === 0) {
      // Parent action not found, stop traversal
      break;
    }
    
    const parentAction = parentActionResult[0];
    const title = parentAction.title || (parentAction.data as any)?.title || 'Untitled';
    
    // Add to the beginning of the path (so we build root -> ... -> current)
    pathSegments.unshift({
      id: parentId,
      title
    });
    
    currentId = parentId;
    depth++;
  }
  
  if (depth >= maxDepth) {
    console.warn(`Path building hit maximum depth limit (${maxDepth}) for action ${actionId}`);
  }
  
  // Build the formatted breadcrumb string
  const titles = pathSegments.map(segment => segment.title);
  const breadcrumb = titles.join(separator);
  
  return {
    segments: pathSegments,
    breadcrumb,
    titles
  };
}

/**
 * Builds a simple breadcrumb string without full path details
 * @param actionId The ID of the action to build the path for
 * @param separator The separator to use (default: " > ")
 * @param includeCurrentAction Whether to include the current action (default: true)
 * @returns Simple breadcrumb string
 */
export async function buildActionBreadcrumb(
  actionId: string, 
  separator: string = " > ", 
  includeCurrentAction: boolean = true
): Promise<string> {
  const result = await buildActionPath(actionId, separator, includeCurrentAction);
  return result.breadcrumb;
}

/**
 * Gets just the titles in the path from root to current action
 * @param actionId The ID of the action to build the path for
 * @param includeCurrentAction Whether to include the current action (default: true)
 * @returns Array of titles from root to current
 */
export async function getActionPathTitles(
  actionId: string, 
  includeCurrentAction: boolean = true
): Promise<string[]> {
  const result = await buildActionPath(actionId, " > ", includeCurrentAction);
  return result.titles;
}

/**
 * Gets the parent titles only (excludes current action)
 * @param actionId The ID of the action to get parent titles for
 * @returns Array of parent titles from root to immediate parent
 */
export async function getParentPathTitles(actionId: string): Promise<string[]> {
  return getActionPathTitles(actionId, false);
}

/**
 * Builds a relative path showing just the immediate context
 * @param actionId The ID of the action
 * @param contextLevels How many parent levels to include (default: 2)
 * @param separator The separator to use (default: " > ")
 * @returns Relative breadcrumb with limited context
 */
export async function buildRelativeActionPath(
  actionId: string, 
  contextLevels: number = 2, 
  separator: string = " > "
): Promise<string> {
  const fullPath = await buildActionPath(actionId, separator, true);
  
  if (fullPath.titles.length <= contextLevels + 1) {
    // Path is short enough, return as-is
    return fullPath.breadcrumb;
  }
  
  // Take the last N+1 levels (N parents + current action)
  const relativeTitles = fullPath.titles.slice(-(contextLevels + 1));
  
  // If we're truncating, add ellipsis at the beginning
  if (fullPath.titles.length > contextLevels + 1) {
    return "..." + separator + relativeTitles.join(separator);
  }
  
  return relativeTitles.join(separator);
}