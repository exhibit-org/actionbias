import { eq, and, count, inArray, sql } from "drizzle-orm";
import { actions, actionDataSchema, edges } from "../../db/schema";
import { 
  ActionListResource, 
  ActionTreeResource, 
  ActionNode, 
  ActionDependenciesResource, 
  DependencyMapping,
  ActionDetailResource,
  ActionMetadata,
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

// Check if all dependencies for an action have been completed
// Helper function to check if parent dependencies are met recursively
async function parentDependenciesMet(actionId: string): Promise<boolean> {
  // Get parent relationship
  const parentEdges = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "child")));
  
  if (parentEdges.length === 0) {
    // No parent, so parent dependencies are met
    return true;
  }
  
  const parentId = parentEdges[0].src;
  if (!parentId) {
    return true;
  }
  
  // Check if parent's direct dependencies are met
  const parentDepsOk = await dependenciesMetDirectly(parentId);
  if (!parentDepsOk) {
    return false;
  }
  
  // Recursively check parent's parent dependencies
  return await parentDependenciesMet(parentId);
}

// Helper function to check only direct dependencies (not parent dependencies)
async function dependenciesMetDirectly(actionId: string): Promise<boolean> {
  const dependencyEdges = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "depends_on")));
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
      return false;
    }
  }
  return true;
}

async function dependenciesMet(actionId: string): Promise<boolean> {
  // Check both direct dependencies and parent dependencies
  const directDepsOk = await dependenciesMetDirectly(actionId);
  if (!directDepsOk) {
    return false;
  }
  
  const parentDepsOk = await parentDependenciesMet(actionId);
  return parentDepsOk;
}

// Recursively find the next actionable child of a given action
async function findNextActionInChildren(actionId: string): Promise<{ action: any | null; allDone: boolean }> {
  const childEdges = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.src, actionId), eq(edges.kind, "child")));
  const childIds = childEdges
    .map((edge: any) => edge.dst)
    .filter((id: any): id is string => id !== null);

  if (childIds.length === 0) {
    return { action: null, allDone: true };
  }

  const children = await getDb()
    .select()
    .from(actions)
    .where(inArray(actions.id, childIds))
    .orderBy(actions.createdAt);

  let allChildrenDone = true;
  for (const child of children) {
    if (!child.done) {
      allChildrenDone = false;
      const depsMet = await dependenciesMet(child.id);
      if (!depsMet) {
        continue;
      }

      const result = await findNextActionInChildren(child.id);
      if (result.action) {
        return { action: result.action, allDone: false };
      }

      if (result.allDone) {
        return { action: child, allDone: false };
      }

      return { action: null, allDone: false };
    }
  }

  return { action: null, allDone: allChildrenDone };
}

export interface CreateActionParams {
  title: string;
  description?: string;
  vision?: string;
  parent_id?: string;
  depends_on_ids?: string[];
}

export interface ListActionsParams {
  limit?: number;
  offset?: number;
  done?: boolean;
  includeCompleted?: boolean;
}

export interface AddChildActionParams {
  title: string;
  description?: string;
  vision?: string;
  parent_id: string;
}

export interface AddDependencyParams {
  action_id: string;
  depends_on_id: string;
}

export interface DeleteActionParams {
  action_id: string;
  child_handling?: "delete_recursive" | "reparent";
  new_parent_id?: string;
}

export interface RemoveDependencyParams {
  action_id: string;
  depends_on_id: string;
}

export interface UpdateActionParams {
  action_id: string;
  title?: string;
  description?: string;
  vision?: string;
  done?: boolean;
}

export interface UpdateParentParams {
  action_id: string;
  new_parent_id?: string; // undefined means remove parent (make it a root action)
}

export class ActionsService {
  static async createAction(params: CreateActionParams) {
    const { title, description, vision, parent_id, depends_on_ids } = params;
    
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
    
    // Build and validate action data
    const actionData: any = { title };
    if (description !== undefined) {
      actionData.description = description;
    }
    if (vision !== undefined) {
      actionData.vision = vision;
    }
    
    // Validate action data against schema
    const validatedData = actionDataSchema.parse(actionData);
    
    const newAction = await getDb()
      .insert(actions)
      .values({
        id: crypto.randomUUID(),
        data: validatedData,
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
    const { title, description, vision, parent_id } = params;
    
    // Check that parent exists
    const parentAction = await getDb().select().from(actions).where(eq(actions.id, parent_id)).limit(1);
    
    if (parentAction.length === 0) {
      throw new Error(`Parent action with ID ${parent_id} not found`);
    }
    
    // Create new action
    const actionData: any = { title };
    if (description !== undefined) {
      actionData.description = description;
    }
    if (vision !== undefined) {
      actionData.vision = vision;
    }
    
    // Validate action data against schema
    const validatedData = actionDataSchema.parse(actionData);
    
    const newAction = await getDb()
      .insert(actions)
      .values({
        id: crypto.randomUUID(),
        data: validatedData,
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
    const { action_id, child_handling = "reparent", new_parent_id } = params;
    
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
    const { action_id, title, description, vision, done } = params;
    
    // Validate that at least one field is provided
    if (title === undefined && description === undefined && vision === undefined && done === undefined) {
      throw new Error("At least one field (title, description, vision, or done) must be provided");
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
    
    // Update data fields if provided (preserve existing data)
    if (title !== undefined || description !== undefined || vision !== undefined) {
      const currentData = existingAction[0].data as any || {};
      const newData = { ...currentData };
      
      if (title !== undefined) {
        newData.title = title;
      }
      if (description !== undefined) {
        newData.description = description;
      }
      if (vision !== undefined) {
        newData.vision = vision;
      }
      
      // Validate updated data against schema
      const validatedData = actionDataSchema.parse(newData);
      updateData.data = validatedData;
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

  static async updateParent(params: UpdateParentParams) {
    const { action_id, new_parent_id } = params;
    
    // Check that action exists
    const existingAction = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
    if (existingAction.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }

    // Check that new parent exists if provided
    if (new_parent_id) {
      const newParentAction = await getDb().select().from(actions).where(eq(actions.id, new_parent_id)).limit(1);
      if (newParentAction.length === 0) {
        throw new Error(`New parent action with ID ${new_parent_id} not found`);
      }

      // Check for circular reference - new parent cannot be a descendant of this action
      const descendants = await getAllDescendants([action_id]);
      if (descendants.includes(new_parent_id)) {
        throw new Error(`Cannot set ${new_parent_id} as parent of ${action_id} - this would create a circular reference`);
      }
    }

    // Remove existing parent relationship
    await getDb().delete(edges).where(
      and(eq(edges.dst, action_id), eq(edges.kind, "child"))
    );

    // Add new parent relationship if provided
    if (new_parent_id) {
      await getDb().insert(edges).values({
        src: new_parent_id,
        dst: action_id,
        kind: "child",
      });
    }

    // Update the action's timestamp
    await getDb()
      .update(actions)
      .set({ updatedAt: new Date() })
      .where(eq(actions.id, action_id));

    return {
      action_id,
      old_parent_id: undefined, // We could track this if needed
      new_parent_id,
    };
  }

  // Resource methods for MCP resources

  static async getActionListResource(params: ListActionsParams = {}): Promise<ActionListResource> {
    const { limit = 20, offset = 0, done, includeCompleted = false } = params;
    
    // Build base query
    let totalQuery = getDb().select({ count: count() }).from(actions);
    let actionQuery = getDb()
      .select()
      .from(actions);
    
    // Add done filter if specified
    if (done !== undefined) {
      totalQuery = totalQuery.where(eq(actions.done, done));
      actionQuery = actionQuery.where(eq(actions.done, done));
    } else if (!includeCompleted) {
      // Default: exclude completed actions unless explicitly requested
      totalQuery = totalQuery.where(eq(actions.done, false));
      actionQuery = actionQuery.where(eq(actions.done, false));
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

  static async getActionTreeResource(includeCompleted: boolean = false): Promise<ActionTreeResource> {
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

    // Build tree nodes recursively, filtering completed actions if needed
    function buildNode(actionId: string): ActionNode | null {
      const action = actionMap.get(actionId)! as any;
      
      // Skip completed actions unless includeCompleted is true
      if (!includeCompleted && action.done) {
        return null;
      }
      
      const children = childrenMap.get(actionId) || [];
      const dependencies = dependenciesMap.get(actionId) || [];

      // Filter children to exclude completed ones (unless includeCompleted is true)
      const filteredChildren = children
        .map(childId => buildNode(childId))
        .filter((child): child is ActionNode => child !== null);

      return {
        id: actionId,
        title: action.data?.title || 'untitled',
        done: action.done,
        created_at: action.createdAt.toISOString(),
        children: filteredChildren,
        dependencies,
      };
    }

    // Find root actions (actions with no parents)
    const rootActionIds = allActions
      .filter((action: any) => !parentMap.has(action.id))
      .map((action: any) => action.id);

    // Build root nodes and filter out completed ones
    const rootNodes = rootActionIds
      .map((id: any) => buildNode(id))
      .filter((node: ActionNode | null): node is ActionNode => node !== null);

    return {
      rootActions: rootNodes,
    };
  }

  static async getActionDependenciesResource(includeCompleted: boolean = false): Promise<ActionDependenciesResource> {
    // Get all actions and filter if needed
    let actionQuery = getDb().select().from(actions);
    if (!includeCompleted) {
      actionQuery = actionQuery.where(eq(actions.done, false));
    }
    const allActions = await actionQuery.orderBy(actions.createdAt);
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
    // Helper function to convert action to ActionMetadata
    const toActionMetadata = (action: any): ActionMetadata => ({
      id: action.id,
      title: action.data?.title || 'untitled',
      description: action.data?.description,
      vision: action.data?.vision,
      done: action.done,
      version: action.version,
      created_at: action.createdAt.toISOString(),
      updated_at: action.updatedAt.toISOString(),
    });

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

    // Build parent chain by walking up the hierarchy
    const parentChain: ActionMetadata[] = [];
    let currentParentId = parentId;
    
    while (currentParentId) {
      const parentAction = await getDb().select().from(actions).where(eq(actions.id, currentParentId)).limit(1);
      
      if (parentAction.length === 0) break;
      
      parentChain.unshift(toActionMetadata(parentAction[0])); // Add to front to maintain order from root
      
      // Find the next parent
      const nextParentEdges = await getDb().select().from(edges).where(
        and(eq(edges.dst, currentParentId), eq(edges.kind, "child"))
      );
      currentParentId = nextParentEdges.length > 0 ? nextParentEdges[0].src : undefined;
    }

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
      description: action[0].data?.description,
      vision: action[0].data?.vision,
      done: action[0].done,
      version: action[0].version,
      created_at: action[0].createdAt.toISOString(),
      updated_at: action[0].updatedAt.toISOString(),
      parent_id: parentId || undefined,
      parent_chain: parentChain,
      children: children.map(toActionMetadata),
      dependencies: dependencies.map(toActionMetadata),
      dependents: dependents.map(toActionMetadata),
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
      if (!(await dependenciesMet(action.id))) {
        continue;
      }

      const result = await findNextActionInChildren(action.id);
      if (result.action) {
        const a = result.action;
        return {
          id: a.id,
          data: a.data as { title: string },
          done: a.done,
          version: a.version,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        };
      }

      if (result.allDone) {
        return {
          id: action.id,
          data: action.data as { title: string },
          done: action.done,
          version: action.version,
          createdAt: action.createdAt.toISOString(),
          updatedAt: action.updatedAt.toISOString(),
        };
      }
    }

    return null;
  }
}