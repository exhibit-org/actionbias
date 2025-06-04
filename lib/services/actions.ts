import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, count, inArray } from "drizzle-orm";
import postgres from "postgres";
import { actions, actionDataSchema, edges } from "../../db/schema";
import { 
  ActionListResource, 
  ActionTreeResource, 
  ActionNode, 
  ActionDependenciesResource, 
  DependencyMapping,
  ActionDetailResource,
  Action 
} from "../types/resources";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Helper function to get all descendants of given action IDs
async function getAllDescendants(actionIds: string[]): Promise<string[]> {
  if (actionIds.length === 0) return [];
  
  const descendants = new Set<string>(actionIds);
  let toProcess = [...actionIds];
  
  while (toProcess.length > 0) {
    const currentLevel = [...toProcess];
    toProcess = [];
    
    for (const actionId of currentLevel) {
      const childEdges = await db.select().from(edges).where(
        and(eq(edges.src, actionId), eq(edges.kind, "child"))
      );
      
      for (const edge of childEdges) {
        if (edge.dst && !descendants.has(edge.dst)) {
          descendants.add(edge.dst);
          toProcess.push(edge.dst);
        }
      }
    }
  }
  
  return Array.from(descendants);
}

export interface CreateActionParams {
  title: string;
  parent_id?: string;
  depends_on_ids?: string[];
}

export interface ListActionsParams {
  limit?: number;
  offset?: number;
}

export interface AddChildActionParams {
  title: string;
  parent_id: string;
}

export interface AddDependencyParams {
  action_id: string;
  depends_on_id: string;
}

export interface DeleteActionParams {
  action_id: string;
  child_handling?: "delete_recursive" | "orphan" | "reparent";
  new_parent_id?: string;
}

export interface RemoveDependencyParams {
  action_id: string;
  depends_on_id: string;
}

export interface UpdateActionParams {
  action_id: string;
  title: string;
}

export class ActionsService {
  static async createAction(params: CreateActionParams) {
    const { title, parent_id, depends_on_ids } = params;
    
    // Validate parent exists if provided
    if (parent_id) {
      const parentAction = await db.select().from(actions).where(eq(actions.id, parent_id)).limit(1);
      if (parentAction.length === 0) {
        throw new Error(`Parent action with ID ${parent_id} not found`);
      }
    }

    // Validate dependencies exist if provided
    if (depends_on_ids && depends_on_ids.length > 0) {
      for (const depId of depends_on_ids) {
        const depAction = await db.select().from(actions).where(eq(actions.id, depId)).limit(1);
        if (depAction.length === 0) {
          throw new Error(`Dependency action with ID ${depId} not found`);
        }
      }
    }
    
    const newAction = await db
      .insert(actions)
      .values({
        id: crypto.randomUUID(),
        data: { title },
      })
      .returning();

    // Create parent relationship if specified
    if (parent_id) {
      await db.insert(edges).values({
        src: parent_id,
        dst: newAction[0].id,
        kind: "child",
      });
    }

    // Create dependency relationships if specified
    if (depends_on_ids && depends_on_ids.length > 0) {
      for (const depId of depends_on_ids) {
        await db.insert(edges).values({
          src: depId,
          dst: newAction[0].id,
          kind: "depends_on",
        });
      }
    }

    return {
      action: newAction[0],
      parent_id,
      dependencies_count: depends_on_ids?.length || 0
    };
  }

  static async listActions(params: ListActionsParams = {}) {
    const { limit = 20, offset = 0 } = params;
    
    const actionList = await db
      .select()
      .from(actions)
      .limit(limit)
      .offset(offset)
      .orderBy(actions.createdAt);

    return actionList;
  }

  static async addChildAction(params: AddChildActionParams) {
    const { title, parent_id } = params;
    
    // Check that parent exists
    const parentAction = await db.select().from(actions).where(eq(actions.id, parent_id)).limit(1);
    
    if (parentAction.length === 0) {
      throw new Error(`Parent action with ID ${parent_id} not found`);
    }
    
    // Create new action
    const newAction = await db
      .insert(actions)
      .values({
        id: crypto.randomUUID(),
        data: { title },
      })
      .returning();

    // Create parent-child relationship
    const newEdge = await db
      .insert(edges)
      .values({
        src: parent_id,
        dst: newAction[0].id,
        kind: "child",
      })
      .returning();

    return {
      action: newAction[0],
      parent: parentAction[0],
      edge: newEdge[0]
    };
  }

  static async addDependency(params: AddDependencyParams) {
    const { action_id, depends_on_id } = params;
    
    const newEdge = await db
      .insert(edges)
      .values({
        src: depends_on_id,
        dst: action_id,
        kind: "depends_on",
      })
      .returning();

    return newEdge[0];
  }

  static async deleteAction(params: DeleteActionParams) {
    const { action_id, child_handling = "orphan", new_parent_id } = params;
    
    // Check that action exists
    const actionToDelete = await db.select().from(actions).where(eq(actions.id, action_id)).limit(1);
    
    if (actionToDelete.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }

    // Find all children (actions where this action is the parent)
    const childEdges = await db.select().from(edges).where(
      and(eq(edges.src, action_id), eq(edges.kind, "child"))
    );

    const childIds = childEdges.map(edge => edge.dst).filter((id): id is string => id !== null);
    
    // Handle children based on strategy
    if (child_handling === "delete_recursive" && childIds.length > 0) {
      const allDescendants = await getAllDescendants(childIds);
      
      // Delete all descendant actions (edges will cascade delete)
      for (const descendantId of allDescendants) {
        await db.delete(actions).where(eq(actions.id, descendantId));
      }
    } else if (child_handling === "reparent" && childIds.length > 0) {
      if (!new_parent_id) {
        throw new Error("new_parent_id is required when child_handling is 'reparent'");
      }
      
      // Check that new parent exists
      const newParent = await db.select().from(actions).where(eq(actions.id, new_parent_id)).limit(1);
      if (newParent.length === 0) {
        throw new Error(`New parent action with ID ${new_parent_id} not found`);
      }

      // Update all child edges to point to new parent
      for (const childId of childIds) {
        if (childId) {
          await db.insert(edges).values({
            src: new_parent_id,
            dst: childId,
            kind: "child",
          });
        }
      }
    }

    // Delete the action (this will cascade delete all edges due to foreign key constraints)
    const deletedAction = await db.delete(actions).where(eq(actions.id, action_id)).returning();

    return {
      deleted_action: deletedAction[0],
      children_count: childIds.length,
      child_handling,
      new_parent_id
    };
  }

  static async removeDependency(params: RemoveDependencyParams) {
    const { action_id, depends_on_id } = params;
    
    // Check that both actions exist
    const action = await db.select().from(actions).where(eq(actions.id, action_id)).limit(1);
    const dependsOn = await db.select().from(actions).where(eq(actions.id, depends_on_id)).limit(1);
    
    if (action.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }
    
    if (dependsOn.length === 0) {
      throw new Error(`Dependency action with ID ${depends_on_id} not found`);
    }

    // Check if dependency exists
    const existingEdge = await db.select().from(edges).where(
      and(
        eq(edges.src, depends_on_id),
        eq(edges.dst, action_id),
        eq(edges.kind, "depends_on")
      )
    ).limit(1);

    if (existingEdge.length === 0) {
      throw new Error(`No dependency found: ${action[0].data?.title} does not depend on ${dependsOn[0].data?.title}`);
    }
    
    // Delete the dependency edge
    const deletedEdge = await db.delete(edges).where(
      and(
        eq(edges.src, depends_on_id),
        eq(edges.dst, action_id),
        eq(edges.kind, "depends_on")
      )
    ).returning();

    return {
      action: action[0],
      depends_on: dependsOn[0],
      deleted_edge: deletedEdge[0]
    };
  }

  static async updateAction(params: UpdateActionParams) {
    const { action_id, title } = params;
    
    // Check that action exists
    const existingAction = await db.select().from(actions).where(eq(actions.id, action_id)).limit(1);
    
    if (existingAction.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }
    
    // Update the action
    const updatedAction = await db
      .update(actions)
      .set({
        data: { title },
        updatedAt: new Date(),
      })
      .where(eq(actions.id, action_id))
      .returning();

    return updatedAction[0];
  }

  // Resource methods for MCP resources

  static async getActionListResource(params: ListActionsParams = {}): Promise<ActionListResource> {
    const { limit = 20, offset = 0 } = params;
    
    // Get total count
    const totalResult = await db.select({ count: count() }).from(actions);
    const total = totalResult[0].count;
    
    // Get actions with pagination
    const actionList = await db
      .select()
      .from(actions)
      .limit(limit)
      .offset(offset)
      .orderBy(actions.createdAt);

    return {
      actions: actionList.map(action => ({
        id: action.id,
        data: action.data as { title: string },
        version: action.version,
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
      })),
      total,
      offset,
      limit,
    };
  }

  static async getActionTreeResource(): Promise<ActionTreeResource> {
    // Get all actions and edges
    const allActions = await db.select().from(actions).orderBy(actions.createdAt);
    const allEdges = await db.select().from(edges).where(eq(edges.kind, "child"));

    // Build lookup maps
    const actionMap = new Map(allActions.map(action => [action.id, action]));
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    // Build parent-child relationships
    for (const edge of allEdges) {
      if (edge.src && edge.dst) {
        if (!childrenMap.has(edge.src)) {
          childrenMap.set(edge.src, []);
        }
        childrenMap.get(edge.src)!.push(edge.dst);
        parentMap.set(edge.dst, edge.src);
      }
    }

    // Get dependency relationships for each action
    const dependencyEdges = await db.select().from(edges).where(eq(edges.kind, "depends_on"));
    const dependenciesMap = new Map<string, string[]>();
    
    for (const edge of dependencyEdges) {
      if (edge.src && edge.dst) {
        if (!dependenciesMap.has(edge.dst)) {
          dependenciesMap.set(edge.dst, []);
        }
        dependenciesMap.get(edge.dst)!.push(edge.src);
      }
    }

    // Build tree nodes recursively
    function buildNode(actionId: string): ActionNode {
      const action = actionMap.get(actionId)!;
      const children = childrenMap.get(actionId) || [];
      const dependencies = dependenciesMap.get(actionId) || [];

      return {
        id: actionId,
        title: action.data?.title || 'untitled',
        created_at: action.createdAt.toISOString(),
        children: children.map(childId => buildNode(childId)),
        dependencies,
      };
    }

    // Find root actions (actions with no parents)
    const rootActionIds = allActions
      .filter(action => !parentMap.has(action.id))
      .map(action => action.id);

    return {
      rootActions: rootActionIds.map(id => buildNode(id)),
    };
  }

  static async getActionDependenciesResource(): Promise<ActionDependenciesResource> {
    const allActions = await db.select().from(actions).orderBy(actions.createdAt);
    const dependencyEdges = await db.select().from(edges).where(eq(edges.kind, "depends_on"));

    const actionMap = new Map(allActions.map(action => [action.id, action]));
    const dependsOnMap = new Map<string, string[]>();
    const dependentsMap = new Map<string, string[]>();

    // Build dependency maps
    for (const edge of dependencyEdges) {
      if (edge.src && edge.dst) {
        // edge.dst depends on edge.src
        if (!dependsOnMap.has(edge.dst)) {
          dependsOnMap.set(edge.dst, []);
        }
        dependsOnMap.get(edge.dst)!.push(edge.src);

        // edge.src has edge.dst as dependent
        if (!dependentsMap.has(edge.src)) {
          dependentsMap.set(edge.src, []);
        }
        dependentsMap.get(edge.src)!.push(edge.dst);
      }
    }

    const dependencies: DependencyMapping[] = allActions.map(action => ({
      action_id: action.id,
      action_title: action.data?.title || 'untitled',
      depends_on: (dependsOnMap.get(action.id) || []).map(depId => ({
        id: depId,
        title: actionMap.get(depId)?.data?.title || 'untitled',
      })),
      dependents: (dependentsMap.get(action.id) || []).map(depId => ({
        id: depId,
        title: actionMap.get(depId)?.data?.title || 'untitled',
      })),
    }));

    return { dependencies };
  }

  static async getActionDetailResource(actionId: string): Promise<ActionDetailResource> {
    // Get the action
    const action = await db.select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (action.length === 0) {
      throw new Error(`Action with ID ${actionId} not found`);
    }

    // Get parent relationship
    const parentEdges = await db.select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "child"))
    );
    const parentId = parentEdges.length > 0 ? parentEdges[0].src : undefined;

    // Get children
    const childEdges = await db.select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "child"))
    );
    const childIds = childEdges.map(edge => edge.dst).filter((id): id is string => id !== null);
    const children = childIds.length > 0 
      ? await db.select().from(actions).where(inArray(actions.id, childIds))
      : [];

    // Get dependencies (actions this depends on)
    const dependencyEdges = await db.select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "depends_on"))
    );
    const dependencyIds = dependencyEdges.map(edge => edge.src).filter((id): id is string => id !== null);
    const dependencies = dependencyIds.length > 0 
      ? await db.select().from(actions).where(inArray(actions.id, dependencyIds))
      : [];

    // Get dependents (actions that depend on this)
    const dependentEdges = await db.select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "depends_on"))
    );
    const dependentIds = dependentEdges.map(edge => edge.dst).filter((id): id is string => id !== null);
    const dependents = dependentIds.length > 0 
      ? await db.select().from(actions).where(inArray(actions.id, dependentIds))
      : [];

    return {
      id: action[0].id,
      title: action[0].data?.title || 'untitled',
      created_at: action[0].createdAt.toISOString(),
      updated_at: action[0].updatedAt.toISOString(),
      parent_id: parentId || undefined,
      children: children.map(child => ({
        id: child.id,
        data: child.data as { title: string },
        version: child.version,
        createdAt: child.createdAt.toISOString(),
        updatedAt: child.updatedAt.toISOString(),
      })),
      dependencies: dependencies.map(dep => ({
        id: dep.id,
        data: dep.data as { title: string },
        version: dep.version,
        createdAt: dep.createdAt.toISOString(),
        updatedAt: dep.updatedAt.toISOString(),
      })),
      dependents: dependents.map(dep => ({
        id: dep.id,
        data: dep.data as { title: string },
        version: dep.version,
        createdAt: dep.createdAt.toISOString(),
        updatedAt: dep.updatedAt.toISOString(),
      })),
    };
  }
}