import { eq, and, count, inArray, sql } from "drizzle-orm";
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
import { getDb } from "../db/adapter";
import "../db/init"; // Auto-initialize PGlite if needed

// Helper function to get all descendants of given action IDs
async function getAllDescendants(actionIds: string[]): Promise<string[]> {
  if (actionIds.length === 0) return [];
  
  const descendants = new Set<string>(actionIds);
  let toProcess = [...actionIds];
  
  while (toProcess.length > 0) {
    const currentLevel = [...toProcess];
    toProcess = [];
    
    for (const actionId of currentLevel) {
      const childEdges = await getDb().select().from(edges).where(
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
  done?: boolean;
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
  title?: string;
  done?: boolean;
}

export class ActionsService {
  static async createAction(params: CreateActionParams) {
    const { title, parent_id, depends_on_ids } = params;
    
    // Validate parent exists if provided
    if (parent_id) {
      const parentAction = await getDb().select().from(actions).where(eq(actions.id, parent_id)).limit(1);
      if (parentAction.length === 0) {
        throw new Error(`Parent action with ID ${parent_id} not found`);
      }
    }

    // Validate dependencies exist if provided
    if (depends_on_ids && depends_on_ids.length > 0) {
      for (const depId of depends_on_ids) {
        const depAction = await getDb().select().from(actions).where(eq(actions.id, depId)).limit(1);
        if (depAction.length === 0) {
          throw new Error(`Dependency action with ID ${depId} not found`);
        }
      }
    }
    
    const newAction = await getDb()
      .insert(actions)
      .values({
        id: crypto.randomUUID(),
        data: { title },
      })
      .returning();

    // Create parent relationship if specified
    if (parent_id) {
      await getDb().insert(edges).values({
        src: parent_id,
        dst: newAction[0].id,
        kind: "child",
      });
    }

    // Create dependency relationships if specified
    if (depends_on_ids && depends_on_ids.length > 0) {
      for (const depId of depends_on_ids) {
        await getDb().insert(edges).values({
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
    const { limit = 20, offset = 0, done } = params;
    
    let query = getDb()
      .select()
      .from(actions);
    
    // Add done filter if specified
    if (done !== undefined) {
      query = query.where(eq(actions.done, done)) as any;
    }
    
    const actionList = await query
      .limit(limit)
      .offset(offset)
      .orderBy(actions.createdAt);

    return actionList;
  }

  static async addChildAction(params: AddChildActionParams) {
    const { title, parent_id } = params;
    
    // Check that parent exists
    const parentAction = await getDb().select().from(actions).where(eq(actions.id, parent_id)).limit(1);
    
    if (parentAction.length === 0) {
      throw new Error(`Parent action with ID ${parent_id} not found`);
    }
    
    // Create new action
    const newAction = await getDb()
      .insert(actions)
      .values({
        id: crypto.randomUUID(),
        data: { title },
      })
      .returning();

    // Create parent-child relationship
    const newEdge = await getDb()
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
    
    const newEdge = await getDb()
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
    const actionToDelete = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
    
    if (actionToDelete.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }

    // Find all children (actions where this action is the parent)
    const childEdges = await getDb().select().from(edges).where(
      and(eq(edges.src, action_id), eq(edges.kind, "child"))
    );

    const childIds = childEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    
    // Handle children based on strategy
    if (child_handling === "delete_recursive" && childIds.length > 0) {
      const allDescendants = await getAllDescendants(childIds);
      
      // Delete all descendant actions (edges will cascade delete)
      for (const descendantId of allDescendants) {
        await getDb().delete(actions).where(eq(actions.id, descendantId));
      }
    } else if (child_handling === "reparent" && childIds.length > 0) {
      if (!new_parent_id) {
        throw new Error("new_parent_id is required when child_handling is 'reparent'");
      }
      
      // Check that new parent exists
      const newParent = await getDb().select().from(actions).where(eq(actions.id, new_parent_id)).limit(1);
      if (newParent.length === 0) {
        throw new Error(`New parent action with ID ${new_parent_id} not found`);
      }

      // Update all child edges to point to new parent
      for (const childId of childIds) {
        if (childId) {
          await getDb().insert(edges).values({
            src: new_parent_id,
            dst: childId,
            kind: "child",
          });
        }
      }
    }

    // Delete the action (this will cascade delete all edges due to foreign key constraints)
    const deletedAction = await getDb().delete(actions).where(eq(actions.id, action_id)).returning();

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
    const action = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
    const dependsOn = await getDb().select().from(actions).where(eq(actions.id, depends_on_id)).limit(1);
    
    if (action.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }
    
    if (dependsOn.length === 0) {
      throw new Error(`Dependency action with ID ${depends_on_id} not found`);
    }

    // Check if dependency exists
    const existingEdge = await getDb().select().from(edges).where(
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
    const deletedEdge = await getDb().delete(edges).where(
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
    const { action_id, title, done } = params;
    
    // Validate that at least one field is provided
    if (title === undefined && done === undefined) {
      throw new Error("At least one field (title or done) must be provided");
    }
    
    // Check that action exists
    const existingAction = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
    
    if (existingAction.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }
    
    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    // Update title if provided
    if (title !== undefined) {
      updateData.data = { title };
    }
    
    // Update done if provided
    if (done !== undefined) {
      updateData.done = done;
    }
    
    // Update the action
    const updatedAction = await getDb()
      .update(actions)
      .set(updateData)
      .where(eq(actions.id, action_id))
      .returning();

    return updatedAction[0];
  }

  // Resource methods for MCP resources

  static async getActionListResource(params: ListActionsParams = {}): Promise<ActionListResource> {
    const { limit = 20, offset = 0, done } = params;
    
    // Build base query
    let totalQuery = getDb().select({ count: count() }).from(actions);
    let actionQuery = getDb()
      .select()
      .from(actions);
    
    // Add done filter if specified
    if (done !== undefined) {
      totalQuery = totalQuery.where(eq(actions.done, done)) as any;
      actionQuery = actionQuery.where(eq(actions.done, done)) as any;
    }
    
    // Get total count
    const totalResult = await totalQuery;
    const total = totalResult[0].count;
    
    // Get actions with pagination
    const actionList = await actionQuery
      .limit(limit)
      .offset(offset)
      .orderBy(actions.createdAt);

    return {
      actions: actionList.map((action: any) => ({
        id: action.id,
        data: action.data as { title: string },
        done: action.done,
        version: action.version,
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
      })),
      total,
      offset,
      limit,
      ...(done !== undefined && { filtered_by_done: done }),
    };
  }

  static async getActionTreeResource(): Promise<ActionTreeResource> {
    // Get all actions and edges
    const allActions = await getDb().select().from(actions).orderBy(actions.createdAt);
    const allEdges = await getDb().select().from(edges).where(eq(edges.kind, "child"));

    // Build lookup maps
    const actionMap = new Map(allActions.map((action: any) => [action.id, action]));
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
    const dependencyEdges = await getDb().select().from(edges).where(eq(edges.kind, "depends_on"));
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
      const action = actionMap.get(actionId)! as any;
      const children = childrenMap.get(actionId) || [];
      const dependencies = dependenciesMap.get(actionId) || [];

      return {
        id: actionId,
        title: action.data?.title || 'untitled',
        done: action.done,
        created_at: action.createdAt.toISOString(),
        children: children.map(childId => buildNode(childId)),
        dependencies,
      };
    }

    // Find root actions (actions with no parents)
    const rootActionIds = allActions
      .filter((action: any) => !parentMap.has(action.id))
      .map((action: any) => action.id);

    return {
      rootActions: rootActionIds.map((id: any) => buildNode(id)),
    };
  }

  static async getActionDependenciesResource(): Promise<ActionDependenciesResource> {
    const allActions = await getDb().select().from(actions).orderBy(actions.createdAt);
    const dependencyEdges = await getDb().select().from(edges).where(eq(edges.kind, "depends_on"));

    const actionMap = new Map(allActions.map((action: any) => [action.id, action]));
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

    const dependencies: DependencyMapping[] = allActions.map((action: any) => ({
      action_id: action.id,
      action_title: action.data?.title || 'untitled',
      action_done: action.done,
      depends_on: (dependsOnMap.get(action.id) || []).map(depId => ({
        id: depId,
        title: (actionMap.get(depId) as any)?.data?.title || 'untitled',
        done: (actionMap.get(depId) as any)?.done || false,
      })),
      dependents: (dependentsMap.get(action.id) || []).map(depId => ({
        id: depId,
        title: (actionMap.get(depId) as any)?.data?.title || 'untitled',
        done: (actionMap.get(depId) as any)?.done || false,
      })),
    }));

    return { dependencies };
  }

  static async getActionDetailResource(actionId: string): Promise<ActionDetailResource> {
    // Get the action
    const action = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (action.length === 0) {
      throw new Error(`Action with ID ${actionId} not found`);
    }

    // Get parent relationship
    const parentEdges = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "child"))
    );
    const parentId = parentEdges.length > 0 ? parentEdges[0].src : undefined;

    // Get children
    const childEdges = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "child"))
    );
    const childIds = childEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    const children = childIds.length > 0 
      ? await getDb().select().from(actions).where(inArray(actions.id, childIds))
      : [];

    // Get dependencies (actions this depends on)
    const dependencyEdges = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "depends_on"))
    );
    const dependencyIds = dependencyEdges.map((edge: any) => edge.src).filter((id: any): id is string => id !== null);
    const dependencies = dependencyIds.length > 0 
      ? await getDb().select().from(actions).where(inArray(actions.id, dependencyIds))
      : [];

    // Get dependents (actions that depend on this)
    const dependentEdges = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "depends_on"))
    );
    const dependentIds = dependentEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    const dependents = dependentIds.length > 0 
      ? await getDb().select().from(actions).where(inArray(actions.id, dependentIds))
      : [];

    return {
      id: action[0].id,
      title: action[0].data?.title || 'untitled',
      done: action[0].done,
      created_at: action[0].createdAt.toISOString(),
      updated_at: action[0].updatedAt.toISOString(),
      parent_id: parentId || undefined,
      children: children.map((child: any) => ({
        id: child.id,
        data: child.data as { title: string },
        done: child.done,
        version: child.version,
        createdAt: child.createdAt.toISOString(),
        updatedAt: child.updatedAt.toISOString(),
      })),
      dependencies: dependencies.map((dep: any) => ({
        id: dep.id,
        data: dep.data as { title: string },
        done: dep.done,
        version: dep.version,
        createdAt: dep.createdAt.toISOString(),
        updatedAt: dep.updatedAt.toISOString(),
      })),
      dependents: dependents.map((dep: any) => ({
        id: dep.id,
        data: dep.data as { title: string },
        done: dep.done,
        version: dep.version,
        createdAt: dep.createdAt.toISOString(),
        updatedAt: dep.updatedAt.toISOString(),
      })),
    };
  }

  static async getNextAction(): Promise<Action | null> {
    // Find the earliest created action that is not done and has all dependencies completed
    const openActions = await getDb()
      .select()
      .from(actions)
      .where(eq(actions.done, false))
      .orderBy(actions.createdAt);

    for (const action of openActions) {
      const dependencyEdges = await getDb()
        .select()
        .from(edges)
        .where(and(eq(edges.dst, action.id), eq(edges.kind, "depends_on")));
      const dependencyIds = dependencyEdges
        .map((edge: any) => edge.src)
        .filter((id: any): id is string => id !== null);

      if (dependencyIds.length > 0) {
        const dependencies = await getDb()
          .select()
          .from(actions)
          .where(inArray(actions.id, dependencyIds));
        const unmet = dependencies.find((dep: any) => !dep.done);
        if (unmet) {
          continue;
        }
      }

      return {
        id: action.id,
        data: action.data as { title: string },
        done: action.done,
        version: action.version,
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
      };
    }

    return null;
  }
}