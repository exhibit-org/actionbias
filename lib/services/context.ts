import { eq, and, inArray } from "drizzle-orm";
import { actions, edges } from "../../db/schema";
import { getDb } from "../db/adapter";
import { ActionMetadata, RelationshipFlags } from "../types/resources";

export interface ActionRelationships {
  ancestors: ActionMetadata[];
  children: ActionMetadata[];
  dependencies: ActionMetadata[];
  dependents: ActionMetadata[];
  siblings: ActionMetadata[];
}

export interface ContextResponse {
  action: ActionMetadata;
  relationships: ActionRelationships;
  relationship_flags: RelationshipFlags;
}

export class ContextService {
  /**
   * Get comprehensive relationship context for an action
   * Returns all family and dependency relationships with flags to avoid duplicate display
   */
  static async getActionContext(actionId: string): Promise<ContextResponse> {
    // Helper function to convert action to ActionMetadata
    const toActionMetadata = (action: any): ActionMetadata => ({
      id: action.id,
      title: action.title || action.data?.title || 'untitled',
      description: action.description || action.data?.description,
      vision: action.vision || action.data?.vision,
      done: action.done,
      version: action.version,
      created_at: action.createdAt.toISOString(),
      updated_at: action.updatedAt.toISOString(),
    });

    // Get the focal action
    const actionResult = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (actionResult.length === 0) {
      throw new Error(`Action with ID ${actionId} not found`);
    }
    const action = toActionMetadata(actionResult[0]);

    // Get parent relationship
    const parentEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "family"))
    );
    const parentEdges = Array.isArray(parentEdgesResult) ? parentEdgesResult : [];
    const parentId = parentEdges.length > 0 ? parentEdges[0].src : undefined;

    // Build ancestor chain by walking up the hierarchy
    const ancestors: ActionMetadata[] = [];
    let currentParentId = parentId;
    
    while (currentParentId) {
      const parentAction = await getDb().select().from(actions).where(eq(actions.id, currentParentId)).limit(1);
      
      if (parentAction.length === 0) break;
      
      ancestors.unshift(toActionMetadata(parentAction[0])); // Add to front to maintain order from root
      
      // Find the next parent
      const nextParentEdgesResult = await getDb().select().from(edges).where(
        and(eq(edges.dst, currentParentId), eq(edges.kind, "family"))
      );
      const nextParentEdges = Array.isArray(nextParentEdgesResult) ? nextParentEdgesResult : [];
      currentParentId = nextParentEdges.length > 0 ? nextParentEdges[0].src : undefined;
    }

    // Get children (direct children only)
    const childEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "family"))
    );
    const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
    const childIds = childEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    const children = childIds.length > 0 
      ? (await getDb().select().from(actions).where(inArray(actions.id, childIds))).map(toActionMetadata)
      : [];

    // Get dependencies (actions this depends on)
    const dependencyEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "depends_on"))
    );
    const dependencyEdges = Array.isArray(dependencyEdgesResult) ? dependencyEdgesResult : [];
    const dependencyIds = dependencyEdges.map((edge: any) => edge.src).filter((id: any): id is string => id !== null);
    const dependencies = dependencyIds.length > 0 
      ? (await getDb().select().from(actions).where(inArray(actions.id, dependencyIds))).map(toActionMetadata)
      : [];

    // Get dependents (actions that depend on this)
    const dependentEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "depends_on"))
    );
    const dependentEdges = Array.isArray(dependentEdgesResult) ? dependentEdgesResult : [];
    const dependentIds = dependentEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    const dependents = dependentIds.length > 0 
      ? (await getDb().select().from(actions).where(inArray(actions.id, dependentIds))).map(toActionMetadata)
      : [];

    // Get siblings (same-parent actions, excluding current action)
    const siblings: ActionMetadata[] = [];
    if (parentId) {
      const siblingEdgesResult = await getDb().select().from(edges).where(
        and(eq(edges.src, parentId), eq(edges.kind, "family"))
      );
      const siblingEdges = Array.isArray(siblingEdgesResult) ? siblingEdgesResult : [];
      const siblingIds = siblingEdges
        .map((edge: any) => edge.dst)
        .filter((id: any): id is string => id !== null && id !== actionId); // Exclude current action
      
      if (siblingIds.length > 0) {
        siblings.push(...(await getDb().select().from(actions).where(inArray(actions.id, siblingIds))).map(toActionMetadata));
      }
    }

    // Build relationship flags to indicate which lists each action appears in
    const relationshipFlags: RelationshipFlags = {};
    
    // Track which lists each action appears in
    ancestors.forEach((ancestor: ActionMetadata) => {
      if (!relationshipFlags[ancestor.id]) relationshipFlags[ancestor.id] = [];
      relationshipFlags[ancestor.id].push('ancestor');
    });
    
    children.forEach((child: ActionMetadata) => {
      if (!relationshipFlags[child.id]) relationshipFlags[child.id] = [];
      relationshipFlags[child.id].push('child');
    });
    
    dependencies.forEach((dep: ActionMetadata) => {
      if (!relationshipFlags[dep.id]) relationshipFlags[dep.id] = [];
      relationshipFlags[dep.id].push('dependency');
    });
    
    dependents.forEach((dependent: ActionMetadata) => {
      if (!relationshipFlags[dependent.id]) relationshipFlags[dependent.id] = [];
      relationshipFlags[dependent.id].push('dependent');
    });
    
    siblings.forEach((sibling: ActionMetadata) => {
      if (!relationshipFlags[sibling.id]) relationshipFlags[sibling.id] = [];
      relationshipFlags[sibling.id].push('sibling');
    });

    return {
      action,
      relationships: {
        ancestors,
        children,
        dependencies,
        dependents,
        siblings,
      },
      relationship_flags: relationshipFlags,
    };
  }
}