import { eq, and, count, inArray, sql, desc } from "drizzle-orm";
import { actions, actionDataSchema, edges, completionContexts } from "../../db/schema";
import { 
  ActionListResource, 
  ActionTreeResource, 
  ActionNode, 
  ActionDependenciesResource, 
  DependencyMapping,
  ActionDetailResource,
  ActionMetadata,
  DependencyCompletionContext,
  Action 
} from "../types/resources";
import { getDb } from "../db/adapter";
import "../db/init"; // Auto-initialize PGlite if needed
import { EmbeddingsService } from './embeddings';
import { VectorService } from './vector';
import { SummaryService } from './summary';
import { SubtreeSummaryService } from './subtree-summary';
import { FamilySummaryService } from './family-summary';
import { CompletionContextService } from './completion-context';
import { ActionSearchService } from './action-search';
import { EditorialAIService } from './editorial-ai';
import { buildActionPath, buildActionBreadcrumb } from '../utils/path-builder';

// Default confidence threshold for automatically applying placement suggestions

// Helper function to get all descendants of given action IDs
async function getAllDescendants(actionIds: string[]): Promise<string[]> {
  if (actionIds.length === 0) return [];
  
  const descendants = new Set<string>(actionIds);
  let toProcess = [...actionIds];
  
  while (toProcess.length > 0) {
    const currentLevel = [...toProcess];
    toProcess = [];
    
    for (const actionId of currentLevel) {
      const childEdgesResult = await getDb().select().from(edges).where(
        and(eq(edges.src, actionId), eq(edges.kind, "family"))
      );
      const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
      
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
// Helper function to check if family dependencies are met recursively
async function familyDependenciesMet(actionId: string): Promise<boolean> {
  // Get family relationship
  const familyEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "family")));
  const familyEdges = Array.isArray(familyEdgesResult) ? familyEdgesResult : [];
  
  if (familyEdges.length === 0) {
    // No family, so family dependencies are met
    return true;
  }
  
  const familyId = familyEdges[0].src;
  if (!familyId) {
    return true;
  }
  
  // Check if family's direct dependencies are met
  const familyDepsOk = await dependenciesMetDirectly(familyId);
  if (!familyDepsOk) {
    return false;
  }
  
  // Recursively check family's family dependencies
  return await familyDependenciesMet(familyId);
}

// Helper function to check only direct dependencies (not parent dependencies)
async function dependenciesMetDirectly(actionId: string): Promise<boolean> {
  const dependencyEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "depends_on")));
  const dependencyEdges = Array.isArray(dependencyEdgesResult) ? dependencyEdgesResult : [];
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
  // Check both direct dependencies and family dependencies
  const directDepsOk = await dependenciesMetDirectly(actionId);
  if (!directDepsOk) {
    return false;
  }
  
  const familyDepsOk = await familyDependenciesMet(actionId);
  return familyDepsOk;
}

// Scoped version of dependency checking that only considers dependencies within a subtree
async function dependenciesMetScoped(actionId: string, scopeActionIds: string[]): Promise<boolean> {
  // Check both direct dependencies and family dependencies, but only within scope
  const directDepsOk = await dependenciesMetDirectlyScoped(actionId, scopeActionIds);
  if (!directDepsOk) {
    return false;
  }
  
  const familyDepsOk = await familyDependenciesMetScoped(actionId, scopeActionIds);
  return familyDepsOk;
}

// Helper function to check only direct dependencies within scope
async function dependenciesMetDirectlyScoped(actionId: string, scopeActionIds: string[]): Promise<boolean> {
  const dependencyEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "depends_on")));
  const dependencyEdges = Array.isArray(dependencyEdgesResult) ? dependencyEdgesResult : [];
  const dependencyIds = dependencyEdges
    .map((edge: any) => edge.src)
    .filter((id: any): id is string => id !== null);

  if (dependencyIds.length > 0) {
    // Filter dependencies to only those within scope
    const scopedDependencyIds = dependencyIds.filter(id => scopeActionIds.includes(id));
    
    if (scopedDependencyIds.length > 0) {
      const dependencies = await getDb()
        .select()
        .from(actions)
        .where(inArray(actions.id, scopedDependencyIds));
      const unmet = dependencies.find((dep: any) => !dep.done);
      if (unmet) {
        return false;
      }
    }
    
    // If there are dependencies outside scope, we ignore them for scoped analysis
    // This allows actions to be actionable within their subtree even if they have 
    // external dependencies that aren't met
  }
  return true;
}

// Helper function to check family dependencies within scope
async function familyDependenciesMetScoped(actionId: string, scopeActionIds: string[]): Promise<boolean> {
  // Get family relationship
  const familyEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "family")));
  const familyEdges = Array.isArray(familyEdgesResult) ? familyEdgesResult : [];
  
  if (familyEdges.length === 0) {
    // No family, so family dependencies are met
    return true;
  }
  
  const familyId = familyEdges[0].src;
  if (!familyId) {
    return true;
  }
  
  // If family is outside scope, ignore family dependencies
  if (!scopeActionIds.includes(familyId)) {
    return true;
  }
  
  // Check if family's direct dependencies are met (within scope)
  const familyDepsOk = await dependenciesMetDirectlyScoped(familyId, scopeActionIds);
  if (!familyDepsOk) {
    return false;
  }
  
  // Recursively check family's family dependencies (within scope)
  return await familyDependenciesMetScoped(familyId, scopeActionIds);
}

// Recursively find the next actionable child of a given action
async function findNextActionInChildren(actionId: string): Promise<{ action: any | null; allDone: boolean }> {
  const childEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.src, actionId), eq(edges.kind, "family")));
  const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
  const memberIds = childEdges
    .map((edge: any) => edge.dst)
    .filter((id: any): id is string => id !== null);

  if (memberIds.length === 0) {
    return { action: null, allDone: true };
  }

  const children = await getDb()
    .select()
    .from(actions)
    .where(inArray(actions.id, memberIds))
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

// Scoped version that only considers children within the specified subtree
async function findNextActionInChildrenScoped(actionId: string, scopeActionIds: string[]): Promise<{ action: any | null; allDone: boolean }> {
  const childEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.src, actionId), eq(edges.kind, "family")));
  const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
  const memberIds = childEdges
    .map((edge: any) => edge.dst)
    .filter((id: any): id is string => id !== null)
    .filter(id => scopeActionIds.includes(id)); // Only consider children within scope

  if (memberIds.length === 0) {
    return { action: null, allDone: true };
  }

  const children = await getDb()
    .select()
    .from(actions)
    .where(inArray(actions.id, memberIds))
    .orderBy(actions.createdAt);

  let allChildrenDone = true;
  for (const child of children) {
    if (!child.done) {
      allChildrenDone = false;
      const depsMet = await dependenciesMetScoped(child.id, scopeActionIds);
      if (!depsMet) {
        continue;
      }

      const result = await findNextActionInChildrenScoped(child.id, scopeActionIds);
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
  parent_id?: string;  // Parent action that this action belongs to
  depends_on_ids?: string[];
  override_duplicate_check?: boolean;
}

export interface DuplicateActionInfo {
  id: string;
  title: string;
  description?: string;
  similarity: number;
  path?: string[];
}

export interface CreateActionResult {
  action: any; // The created action from the database
  parent_id?: string;
  applied_parent_id?: string;
  dependencies_count: number;
  duplicate_warning?: {
    message: string;
    potential_duplicates: DuplicateActionInfo[];
    suggestion: string;
  };
}

export interface ListActionsParams {
  limit?: number;
  offset?: number;
  includeCompleted?: boolean;
}

export interface AddFamilyActionParams {
  title: string;
  description?: string;
  vision?: string;
  parent_id: string;  // Will be renamed to family_id in next iteration
}

export interface AddDependencyParams {
  action_id: string;
  depends_on_id: string;
}

export interface DeleteActionParams {
  action_id: string;
  child_handling?: "delete_recursive" | "reparent";
  new_parent_id?: string;  // Will be renamed to new_family_id in next iteration
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
  completion_context?: {
    implementation_story?: string;
    impact_story?: string;
    learning_story?: string;
    headline?: string;
    deck?: string;
    pull_quotes?: string[];
    changelog_visibility?: string;
  };
}

export interface UpdateFamilyParams {
  action_id: string;
  new_family_id?: string; // undefined means leave family (make it an independent action)
}

export class ActionsService {
  static async createAction(
    params: CreateActionParams
  ): Promise<CreateActionResult> {
    const { title, description, vision, parent_id, depends_on_ids, override_duplicate_check } = params;
    
    // Validate family exists if provided
    if (parent_id) {
      const familyAction = await getDb().select().from(actions).where(eq(actions.id, parent_id)).limit(1);
      if (familyAction.length === 0) {
        throw new Error(`Family action with ID ${parent_id} not found`);
      }
    }

    // Check for duplicates unless explicitly overridden
    if (!override_duplicate_check) {
      try {
        // Search for similar actions using hybrid search
        const searchResults = await ActionSearchService.searchActions(title, {
          limit: 5,
          similarityThreshold: 0.8, // High threshold for duplicate detection
          includeCompleted: true, // Check against completed actions too
          searchMode: 'hybrid'
        });

        // Check if any results have very high similarity
        const potentialDuplicates = searchResults.results.filter(result => {
          // For vector matches, check similarity score
          if (result.similarity && result.similarity >= 0.8) {
            return true;
          }
          // For keyword matches, check if title is very similar
          if (result.title.toLowerCase() === title.toLowerCase()) {
            return true;
          }
          return false;
        });

        if (potentialDuplicates.length > 0) {
          // Map duplicates to include path information
          const duplicatesWithPaths = potentialDuplicates.map(dup => ({
            id: dup.id,
            title: dup.title,
            description: dup.description,
            similarity: dup.similarity || 1.0,
            path: dup.hierarchyPath
          }));

          // Return early with duplicate warning
          return {
            action: null as any, // No action created
            parent_id,
            applied_parent_id: undefined,
            dependencies_count: 0,
            duplicate_warning: {
              message: `Potential duplicate actions detected. The action "${title}" appears to be similar to existing actions.`,
              potential_duplicates: duplicatesWithPaths,
              suggestion: "Review the existing actions above. If you still want to create this action, use the 'override_duplicate_check' parameter."
            }
          };
        }
      } catch (error) {
        // Log but don't fail if duplicate detection fails
        console.warn('Duplicate detection failed, proceeding with action creation:', error);
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
        // Set new columns for better performance and indexing
        title: title,
        description: description,
        vision: vision,
      })
      .returning();

    // Create family relationship if specified
    if (parent_id) {
      await getDb().insert(edges).values({
        src: parent_id,
        dst: newAction[0].id,
        kind: "family",
      });
      
      // Generate family summaries for actions with explicit families
      generateFamilySummariesAsync(newAction[0].id).catch(console.error);
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

    let appliedFamilyId: string | undefined = parent_id;

    // Generate embedding and node summary asynchronously (fire-and-forget)
    generateEmbeddingAsync(newAction[0].id, validatedData).catch(console.error);
    generateNodeSummaryAsync(newAction[0].id, validatedData).catch(console.error);

    return {
      action: newAction[0],
      parent_id,
      applied_parent_id: appliedFamilyId,
      dependencies_count: depends_on_ids?.length || 0,
    };
  }

  static async listActions(params: ListActionsParams = {}) {
    const { limit = 20, offset = 0, includeCompleted = false } = params;
    
    let query = getDb()
      .select()
      .from(actions);
    
    // Default: exclude completed actions unless explicitly requested
    if (!includeCompleted) {
      query = query.where(eq(actions.done, false)) as any;
    }
    
    const actionList = await query
      .limit(limit)
      .offset(offset)
      .orderBy(actions.createdAt);

    return actionList;
  }

  static async addFamilyAction(params: AddFamilyActionParams) {
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
        // Set new columns for better performance and indexing
        title: title,
        description: description,
        vision: vision,
      })
      .returning();

    // Create parent-child relationship
    const newEdge = await getDb()
      .insert(edges)
      .values({
        src: parent_id,
        dst: newAction[0].id,
        kind: "family",
      })
      .returning();

    // Generate embedding and node summary asynchronously for new child action
    generateEmbeddingAsync(newAction[0].id, validatedData).catch(console.error);
    generateNodeSummaryAsync(newAction[0].id, validatedData).catch(console.error);
    
    // Generate parent summaries for the new child action (since it now has a parent chain)
    generateFamilySummariesAsync(newAction[0].id).catch(console.error);
    
    // Generate subtree summary for parent asynchronously (since it now has a new child)
    generateSubtreeSummaryAsync(parent_id).catch(console.error);

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

    // Get parent of action being deleted (for subtree summary regeneration)
    const parentEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.dst, action_id), eq(edges.kind, "family"))
    ).limit(1);
    const parentEdges = Array.isArray(parentEdgesResult) ? parentEdgesResult : [];
    const parent_id = parentEdges.length > 0 ? parentEdges[0].src : undefined;

    // Find all children (actions where this action is the parent)
    const childEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, action_id), eq(edges.kind, "family"))
    );

    const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
    const memberIds = childEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    
    // Handle children based on strategy
    if (child_handling === "delete_recursive" && memberIds.length > 0) {
      const allDescendants = await getAllDescendants(memberIds);
      
      // Delete all descendant actions (edges will cascade delete)
      for (const descendantId of allDescendants) {
        await getDb().delete(actions).where(eq(actions.id, descendantId));
      }
    } else if (child_handling === "reparent" && memberIds.length > 0) {
      if (!new_parent_id) {
        throw new Error("new_parent_id is required when child_handling is 'reparent'");
      }
      
      // Check that new parent exists
      const newParent = await getDb().select().from(actions).where(eq(actions.id, new_parent_id)).limit(1);
      if (newParent.length === 0) {
        throw new Error(`New parent action with ID ${new_parent_id} not found`);
      }

      // Update all child edges to point to new parent
      for (const memberId of memberIds) {
        if (memberId) {
          await getDb().insert(edges).values({
            src: new_parent_id,
            dst: memberId,
            kind: "family",
          });
        }
      }
    }

    // Delete the action (this will cascade delete all edges due to foreign key constraints)
    const deletedAction = await getDb().delete(actions).where(eq(actions.id, action_id)).returning();

    // Regenerate subtree summaries for affected parents
    if (parent_id) {
      // Regenerate subtree summary for original parent (child was removed)
      generateSubtreeSummaryAsync(parent_id).catch(console.error);
    }
    if (child_handling === "reparent" && new_parent_id && memberIds.length > 0) {
      // Regenerate subtree summary for new parent (children were added)
      generateSubtreeSummaryAsync(new_parent_id).catch(console.error);
      
      // Regenerate parent summaries for all reparented children and their descendants
      // (their parent chains have changed)
      for (const memberId of memberIds) {
        const allDescendants = await getAllDescendants([memberId]);
        for (const descendantId of allDescendants) {
          generateFamilySummariesAsync(descendantId).catch(console.error);
        }
      }
    }

    return {
      deleted_action: deletedAction[0],
      children_count: memberIds.length,
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
    const { action_id, title, description, vision, done, completion_context } = params;
    
    // Validate that at least one field is provided
    if (title === undefined && description === undefined && vision === undefined && done === undefined && completion_context === undefined) {
      throw new Error("At least one field (title, description, vision, done, or completion_context) must be provided");
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
        updateData.title = title; // Update new column
      }
      if (description !== undefined) {
        newData.description = description;
        updateData.description = description; // Update new column
      }
      if (vision !== undefined) {
        newData.vision = vision;
        updateData.vision = vision; // Update new column
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

    // Generate embedding and node summary asynchronously if content was updated
    if (updateData.data) {
      generateEmbeddingAsync(action_id, updateData.data).catch(console.error);
      generateNodeSummaryAsync(action_id, updateData.data).catch(console.error);
      
      // Regenerate parent summaries for all descendants (their parent chain context has changed)
      const allDescendants = await getAllDescendants([action_id]);
      for (const descendantId of allDescendants) {
        if (descendantId !== action_id) { // Don't regenerate for the current action itself
          generateFamilySummariesAsync(descendantId).catch(console.error);
        }
      }
    }

    // Handle completion context if provided
    if (completion_context !== undefined) {
      try {
        // If marking as done and editorial content not provided, generate it
        let editorial: any = {};
        if (done === true && 
            completion_context.implementation_story && 
            completion_context.impact_story && 
            completion_context.learning_story &&
            !completion_context.headline && 
            !completion_context.deck && 
            !completion_context.pull_quotes) {
          
          // Fetch dependency completions and generate editorial content asynchronously (don't wait)
          (async () => {
            try {
              // Get dependency completions for context
              const dependencyEdges = await getDb()
                .select()
                .from(edges)
                .where(and(
                  eq(edges.dst, action_id),
                  eq(edges.kind, 'depends_on')
                ));
              
              let dependencyCompletions = [];
              if (dependencyEdges.length > 0) {
                const depIds = dependencyEdges.map((e: any) => e.src).filter(Boolean);
                const deps = await getDb()
                  .select({
                    action: actions,
                    context: completionContexts
                  })
                  .from(actions)
                  .leftJoin(completionContexts, eq(completionContexts.actionId, actions.id))
                  .where(and(
                    inArray(actions.id, depIds),
                    eq(actions.done, true)
                  ));
                
                dependencyCompletions = deps.map((d: any) => ({
                  title: d.action.title || '',
                  impactStory: d.context?.impactStory || undefined
                }));
              }

              const generatedContent = await EditorialAIService.generateEditorialContent({
                actionTitle: updatedAction[0].title || existingAction[0].title || 'Untitled Action',
                actionDescription: updatedAction[0].description || existingAction[0].description,
                actionVision: updatedAction[0].vision || existingAction[0].vision,
                implementationStory: completion_context.implementation_story || '',
                impactStory: completion_context.impact_story || '',
                learningStory: completion_context.learning_story || '',
                // Include summaries
                nodeSummary: updatedAction[0].nodeSummary || existingAction[0].nodeSummary,
                subtreeSummary: updatedAction[0].subtreeSummary || existingAction[0].subtreeSummary,
                familyContextSummary: updatedAction[0].familyContextSummary || existingAction[0].familyContextSummary,
                familyVisionSummary: updatedAction[0].familyVisionSummary || existingAction[0].familyVisionSummary,
                // Include dependency completions
                dependencyCompletions: dependencyCompletions.length > 0 ? dependencyCompletions : undefined
              });
              // Update with generated content if available
              if (generatedContent.headline || generatedContent.deck || generatedContent.pullQuotes) {
                await CompletionContextService.upsertCompletionContext({
                  actionId: action_id,
                  headline: generatedContent.headline,
                  deck: generatedContent.deck,
                  pullQuotes: generatedContent.pullQuotes,
                });
              }
            } catch (error) {
              console.error('Failed to generate editorial content:', error);
            }
          })();
        }

        await CompletionContextService.upsertCompletionContext({
          actionId: action_id,
          implementationStory: completion_context.implementation_story,
          impactStory: completion_context.impact_story,
          learningStory: completion_context.learning_story,
          headline: completion_context.headline,
          deck: completion_context.deck,
          pullQuotes: completion_context.pull_quotes,
          changelogVisibility: completion_context.changelog_visibility,
        });
      } catch (error) {
        console.error(`Failed to update completion context for action ${action_id}:`, error);
        // Don't fail the action update if completion context fails
      }
    }

    // If done status changed, regenerate subtree summary for family (member completion affects family summary)
    if (done !== undefined) {
      // Find family of this action and regenerate its subtree summary
      getDb().select().from(edges).where(and(eq(edges.dst, action_id), eq(edges.kind, "family"))).limit(1)
        .then((familyEdges: any) => {
          const familyEdgeResults = Array.isArray(familyEdges) ? familyEdges : [];
          if (familyEdgeResults.length > 0 && familyEdgeResults[0].src) {
            generateSubtreeSummaryAsync(familyEdgeResults[0].src).catch(console.error);
          }
        })
        .catch(console.error);
    }

    return updatedAction[0];
  }

  static async updateFamily(params: UpdateFamilyParams) {
    const { action_id, new_family_id } = params;
    
    // Check that action exists
    const existingAction = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
    if (existingAction.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }

    // Check that new family exists if provided
    if (new_family_id) {
      const newFamilyAction = await getDb().select().from(actions).where(eq(actions.id, new_family_id)).limit(1);
      if (newFamilyAction.length === 0) {
        throw new Error(`New family action with ID ${new_family_id} not found`);
      }

      // Check for circular reference - new family cannot be a descendant of this action
      const descendants = await getAllDescendants([action_id]);
      if (descendants.includes(new_family_id)) {
        throw new Error(`Cannot set ${new_family_id} as family of ${action_id} - this would create a circular reference`);
      }
    }

    // Get existing family before removing relationship (for subtree summary regeneration)
    const existingFamilyEdges = await getDb().select().from(edges).where(
      and(eq(edges.dst, action_id), eq(edges.kind, "family"))
    ).limit(1);
    const existingFamilyEdgeResults = Array.isArray(existingFamilyEdges) ? existingFamilyEdges : [];
    const old_family_id = existingFamilyEdgeResults.length > 0 ? existingFamilyEdgeResults[0].src : undefined;

    // Remove existing family relationship
    await getDb().delete(edges).where(
      and(eq(edges.dst, action_id), eq(edges.kind, "family"))
    );

    // Add new family relationship if provided
    if (new_family_id) {
      await getDb().insert(edges).values({
        src: new_family_id,
        dst: action_id,
        kind: "family",
      });
    }

    // Update the action's timestamp
    await getDb()
      .update(actions)
      .set({ updatedAt: new Date() })
      .where(eq(actions.id, action_id));

    // Regenerate subtree summaries for both old and new families (if they exist)
    if (old_family_id) {
      generateSubtreeSummaryAsync(old_family_id).catch(console.error);
    }
    if (new_family_id) {
      generateSubtreeSummaryAsync(new_family_id).catch(console.error);
    }

    // Regenerate family summaries for the moved action and all its descendants
    // (their family chains have changed)
    const allDescendants = await getAllDescendants([action_id]);
    for (const descendantId of allDescendants) {
      generateFamilySummariesAsync(descendantId).catch(console.error);
    }

    return {
      action_id,
      old_family_id,
      new_family_id,
    };
  }

  // Resource methods for MCP resources

  static async getActionListResource(params: ListActionsParams = {}): Promise<ActionListResource> {
    const { limit = 20, offset = 0, includeCompleted = false } = params;
    
    // Build base query
    let totalQuery = getDb().select({ count: count() }).from(actions);
    let actionQuery = getDb()
      .select()
      .from(actions);
    
    // Default: exclude completed actions unless explicitly requested
    if (!includeCompleted) {
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
    };
  }

  static async getActionTreeResource(includeCompleted: boolean = false): Promise<ActionTreeResource> {
    console.log('[SERVICE] Starting optimized database queries for tree resource');
    
    try {
      // Optimize: Single query with limit and filtering at database level
      const MAX_ACTIONS = 500; // Reasonable limit to prevent timeouts
      let actionQuery = getDb().select().from(actions).limit(MAX_ACTIONS);
      
      if (!includeCompleted) {
        actionQuery = actionQuery.where(eq(actions.done, false));
      }
      
      // Execute all queries in parallel for better performance
      const [allActions, childEdgesResult, dependencyEdgesResult] = await Promise.all([
        actionQuery.orderBy(actions.createdAt),
        getDb().select().from(edges).where(eq(edges.kind, "family")).limit(1000),
        getDb().select().from(edges).where(eq(edges.kind, "depends_on")).limit(1000)
      ]);
      
      console.log('[SERVICE] Got actions:', allActions.length);
      
      // Early return if no actions
      if (allActions.length === 0) {
        return { rootActions: [] };
      }
      
      const allEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
      const dependencyEdges = Array.isArray(dependencyEdgesResult) ? dependencyEdgesResult : [];

      // Build lookup maps more efficiently
      const actionMap = new Map(allActions.map((action: any) => [action.id, action]));
      const membersMap = new Map<string, string[]>();
      const familyMap = new Map<string, string>();
      const dependenciesMap = new Map<string, string[]>();

      // Build family-member relationships
      for (const edge of allEdges) {
        if (edge.src && edge.dst) {
          if (!membersMap.has(edge.src)) {
            membersMap.set(edge.src, []);
          }
          membersMap.get(edge.src)!.push(edge.dst);
          familyMap.set(edge.dst, edge.src);
        }
      }
      
      // Build dependency relationships
      for (const edge of dependencyEdges) {
        if (edge.src && edge.dst) {
          if (!dependenciesMap.has(edge.dst)) {
            dependenciesMap.set(edge.dst, []);
          }
          dependenciesMap.get(edge.dst)!.push(edge.src);
        }
      }

      // Optimized tree building with depth limit to prevent infinite recursion
      const MAX_DEPTH = 10;
      function buildNode(actionId: string, depth: number = 0): ActionNode | null {
        if (depth > MAX_DEPTH) {
          console.warn('[SERVICE] Max depth reached for action:', actionId);
          return null;
        }
        
        const action = actionMap.get(actionId) as any;
        if (!action) {
          console.warn('[SERVICE] Action not found:', actionId);
          return null;
        }
        
        // Skip completed actions unless includeCompleted is true
        if (!includeCompleted && action.done) {
          return null;
        }
        
        const children = membersMap.get(actionId) || [];
        const dependencies = dependenciesMap.get(actionId) || [];

        // Filter members to exclude completed ones (unless includeCompleted is true)
        const filteredMembers = children
          .map(memberId => buildNode(memberId, depth + 1))
          .filter((child): child is ActionNode => child !== null);

        return {
          id: actionId,
          title: action.data?.title || 'untitled',
          done: action.done,
          created_at: action.createdAt.toISOString(),
          children: filteredMembers,
          dependencies,
        };
      }

      // Find root actions (actions with no family)
      const rootActionIds = allActions
        .filter((action: any) => !familyMap.has(action.id))
        .map((action: any) => action.id);

      console.log('[SERVICE] Found root actions:', rootActionIds.length);

      // Build root nodes and filter out completed ones
      const rootNodes = rootActionIds
        .map((id: any) => buildNode(id))
        .filter((node: ActionNode | null): node is ActionNode => node !== null);

      console.log('[SERVICE] Built tree with root nodes:', rootNodes.length);
      
      return {
        rootActions: rootNodes,
      };
      
    } catch (error) {
      console.error('[SERVICE] Error in getActionTreeResource:', error);
      throw new Error(`Failed to build action tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all descendant action IDs for a given root action
   * Uses recursive traversal of the family-member hierarchy
   */
  private static async getAllDescendants(rootActionId: string): Promise<string[]> {
    const descendants: string[] = [];
    const visited = new Set<string>();
    
    // Get all child edges
    const childEdges = await getDb()
      .select()
      .from(edges)
      .where(eq(edges.kind, "family"));
    
    // Build children map
    const membersMap = new Map<string, string[]>();
    for (const edge of childEdges) {
      if (edge.src && edge.dst) {
        if (!membersMap.has(edge.src)) {
          membersMap.set(edge.src, []);
        }
        membersMap.get(edge.src)!.push(edge.dst);
      }
    }
    
    // Recursive function to collect descendants
    function collectDescendants(actionId: string) {
      if (visited.has(actionId)) {
        return; // Prevent infinite loops
      }
      visited.add(actionId);
      
      const children = membersMap.get(actionId) || [];
      for (const memberId of children) {
        descendants.push(memberId);
        collectDescendants(memberId);
      }
    }
    
    collectDescendants(rootActionId);
    return descendants;
  }

  static async getActionTreeResourceScoped(rootActionId: string, includeCompleted: boolean = false): Promise<ActionTreeResource> {
    console.log('[SERVICE] Starting scoped tree resource for root:', rootActionId);
    
    try {
      // First, verify the root action exists
      const rootActionResult = await getDb()
        .select()
        .from(actions)
        .where(eq(actions.id, rootActionId))
        .limit(1);
        
      if (rootActionResult.length === 0) {
        throw new Error(`Root action ${rootActionId} not found`);
      }
      
      const rootAction = rootActionResult[0];
      
      // Skip if root action is completed and includeCompleted is false
      if (!includeCompleted && rootAction.done) {
        return { 
          rootActions: [],
          rootAction: rootActionId,
          scope: rootActionId
        };
      }
      
      // Get all descendants of the root action
      const descendantIds = await this.getAllDescendants(rootActionId);
      const scopedActionIds = [rootActionId, ...descendantIds];
      
      console.log('[SERVICE] Found', descendantIds.length, 'descendants for root action');
      
      // Get all actions in the scope
      let actionQuery = getDb()
        .select()
        .from(actions)
        .where(sql`${actions.id} = ANY(${sql.raw(`ARRAY[${scopedActionIds.map(id => `'${id}'::uuid`).join(',')}]`)})`)
        .limit(500);
      
      if (!includeCompleted) {
        actionQuery = actionQuery.where(eq(actions.done, false));
      }
      
      // Execute queries in parallel for better performance
      const [scopedActions, childEdgesResult, dependencyEdgesResult] = await Promise.all([
        actionQuery.orderBy(actions.createdAt),
        getDb()
          .select()
          .from(edges)
          .where(and(
            eq(edges.kind, "family"),
            sql`${edges.src} = ANY(${sql.raw(`ARRAY[${scopedActionIds.map(id => `'${id}'::uuid`).join(',')}]`)})`,
            sql`${edges.dst} = ANY(${sql.raw(`ARRAY[${scopedActionIds.map(id => `'${id}'::uuid`).join(',')}]`)})`
          )),
        getDb()
          .select()
          .from(edges)
          .where(and(
            eq(edges.kind, "depends_on"),
            sql`${edges.dst} = ANY(${sql.raw(`ARRAY[${scopedActionIds.map(id => `'${id}'::uuid`).join(',')}]`)})`
          ))
      ]);
      
      console.log('[SERVICE] Got scoped actions:', scopedActions.length);
      
      // Early return if no actions in scope
      if (scopedActions.length === 0) {
        return { 
          rootActions: [],
          rootAction: rootActionId,
          scope: rootActionId
        };
      }
      
      const allEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
      const dependencyEdges = Array.isArray(dependencyEdgesResult) ? dependencyEdgesResult : [];

      // Build lookup maps
      const actionMap = new Map(scopedActions.map((action: any) => [action.id, action]));
      const membersMap = new Map<string, string[]>();
      const familyMap = new Map<string, string>();
      const dependenciesMap = new Map<string, string[]>();

      // Build parent-child relationships (only within scope)
      for (const edge of allEdges) {
        if (edge.src && edge.dst) {
          if (!membersMap.has(edge.src)) {
            membersMap.set(edge.src, []);
          }
          membersMap.get(edge.src)!.push(edge.dst);
          familyMap.set(edge.dst, edge.src);
        }
      }
      
      // Build dependency relationships
      for (const edge of dependencyEdges) {
        if (edge.src && edge.dst) {
          if (!dependenciesMap.has(edge.dst)) {
            dependenciesMap.set(edge.dst, []);
          }
          dependenciesMap.get(edge.dst)!.push(edge.src);
        }
      }

      // Tree building with depth limit
      const MAX_DEPTH = 10;
      function buildNode(actionId: string, depth: number = 0): ActionNode | null {
        if (depth > MAX_DEPTH) {
          console.warn('[SERVICE] Max depth reached for action:', actionId);
          return null;
        }
        
        const action = actionMap.get(actionId) as any;
        if (!action) {
          return null;
        }
        
        // Skip completed actions unless includeCompleted is true
        if (!includeCompleted && action.done) {
          return null;
        }
        
        const children = membersMap.get(actionId) || [];
        const dependencies = dependenciesMap.get(actionId) || [];

        // Filter members to exclude completed ones (unless includeCompleted is true)
        const filteredMembers = children
          .map(memberId => buildNode(memberId, depth + 1))
          .filter((child): child is ActionNode => child !== null);

        return {
          id: actionId,
          title: action.data?.title || 'untitled',
          done: action.done,
          created_at: action.createdAt.toISOString(),
          children: filteredMembers,
          dependencies,
        };
      }

      // Build the scoped tree starting from the root action
      const rootNode = buildNode(rootActionId);
      
      console.log('[SERVICE] Built scoped tree');
      
      return {
        rootActions: rootNode ? [rootNode] : [],
        rootAction: rootActionId,
        scope: rootActionId
      };
      
    } catch (error) {
      console.error('[SERVICE] Error in getActionTreeResourceScoped:', error);
      throw new Error(`Failed to build scoped action tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getActionDependenciesResource(includeCompleted: boolean = false): Promise<ActionDependenciesResource> {
    // Get all actions and filter if needed
    let actionQuery = getDb().select().from(actions);
    if (!includeCompleted) {
      actionQuery = actionQuery.where(eq(actions.done, false));
    }
    const allActions = await actionQuery.orderBy(actions.createdAt);
    const dependencyEdgesResult = await getDb().select().from(edges).where(eq(edges.kind, "depends_on"));
    const dependencyEdges = Array.isArray(dependencyEdgesResult) ? dependencyEdgesResult : [];

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

  /**
   * Get action with automatic generation of missing context
   * This method loads action data and triggers async generation for any missing context
   * @param actionId The action ID to load
   * @returns The action with all existing context
   */
  static async getActionWithContext(actionId: string): Promise<any> {
    // Get the action
    const actionResult = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (actionResult.length === 0) {
      throw new Error(`Action with ID ${actionId} not found`);
    }

    const action = actionResult[0];
    
    // Check for missing context and trigger async generation
    const missingContext: string[] = [];
    
    // Check family summaries (treat placeholder text as missing)
    const needsFamilyContext = !action.familyContextSummary || 
                              action.familyContextSummary === 'This action has no family context.';
    const needsFamilyVision = !action.familyVisionSummary || 
                             action.familyVisionSummary === 'This action has no family vision context.';
    
    if (needsFamilyContext || needsFamilyVision) {
      // Check if action has a family relationship
      const familyEdges = await getDb().select().from(edges).where(
        and(eq(edges.dst, actionId), eq(edges.kind, "family"))
      ).limit(1);
      
      if (familyEdges.length > 0) {
        // Has family but missing summaries
        if (needsFamilyContext) missingContext.push('family_context_summary');
        if (needsFamilyVision) missingContext.push('family_vision_summary');
        
        // Trigger async generation
        generateFamilySummariesAsync(actionId).catch(error => {
          console.error(`Failed to generate family summaries for action ${actionId}:`, error);
        });
      }
    }
    
    // Check node summary
    if (!action.nodeSummary) {
      missingContext.push('node_summary');
      
      // Trigger async generation
      const title = action.title || (action.data as any)?.title;
      const description = action.description || (action.data as any)?.description;
      const vision = action.vision || (action.data as any)?.vision;
      
      if (title) {
        generateNodeSummaryAsync(actionId, { title, description, vision }).catch(error => {
          console.error(`Failed to generate node summary for action ${actionId}:`, error);
        });
      }
    }
    
    // Check embedding
    if (!action.embedding) {
      missingContext.push('embedding');
      
      // Trigger async generation
      const title = action.title || (action.data as any)?.title;
      const description = action.description || (action.data as any)?.description;
      const vision = action.vision || (action.data as any)?.vision;
      
      if (title) {
        generateEmbeddingAsync(actionId, { title, description, vision }).catch(error => {
          console.error(`Failed to generate embedding for action ${actionId}:`, error);
        });
      }
    }
    
    // Check subtree summary (only if action has children)
    const childEdges = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "family"))
    ).limit(1);
    
    if (childEdges.length > 0 && !action.subtreeSummary) {
      missingContext.push('subtree_summary');
      
      // Trigger async generation
      generateSubtreeSummaryAsync(actionId).catch(error => {
        console.error(`Failed to generate subtree summary for action ${actionId}:`, error);
      });
    }
    
    // Log what context is being generated
    if (missingContext.length > 0) {
      console.log(`Generating missing context for action ${actionId}:`, missingContext.join(', '));
    }
    
    return action;
  }

  static async getActionDetailResource(actionId: string): Promise<ActionDetailResource> {
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

    // Get the action with context generation
    const actionData = await this.getActionWithContext(actionId);
    const action = [actionData]; // Convert to array for compatibility

    // Get parent relationship
    const parentEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "family"))
    );
    const parentEdges = Array.isArray(parentEdgesResult) ? parentEdgesResult : [];
    const parentId = parentEdges.length > 0 ? parentEdges[0].src : undefined;

    // Build parent chain by walking up the hierarchy
    const parentChain: ActionMetadata[] = [];
    let currentParentId = parentId;
    
    while (currentParentId) {
      const parentAction = await getDb().select().from(actions).where(eq(actions.id, currentParentId)).limit(1);
      
      if (parentAction.length === 0) break;
      
      parentChain.unshift(toActionMetadata(parentAction[0])); // Add to front to maintain order from root
      
      // Find the next parent
      const nextParentEdgesResult = await getDb().select().from(edges).where(
        and(eq(edges.dst, currentParentId), eq(edges.kind, "family"))
      );
      const nextParentEdges = Array.isArray(nextParentEdgesResult) ? nextParentEdgesResult : [];
      currentParentId = nextParentEdges.length > 0 ? nextParentEdges[0].src : undefined;
    }

    // Get children
    const childEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "family"))
    );
    const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
    const memberIds = childEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    const children = memberIds.length > 0 
      ? await getDb().select().from(actions).where(inArray(actions.id, memberIds))
      : [];

    // Get dependencies (actions this depends on)
    const dependencyEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "depends_on"))
    );
    const dependencyEdges = Array.isArray(dependencyEdgesResult) ? dependencyEdgesResult : [];
    const dependencyIds = dependencyEdges.map((edge: any) => edge.src).filter((id: any): id is string => id !== null);
    const dependencies = dependencyIds.length > 0 
      ? await getDb().select().from(actions).where(inArray(actions.id, dependencyIds))
      : [];

    // Get dependents (actions that depend on this)
    const dependentEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "depends_on"))
    );
    const dependentEdges = Array.isArray(dependentEdgesResult) ? dependentEdgesResult : [];
    const dependentIds = dependentEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    const dependents = dependentIds.length > 0 
      ? await getDb().select().from(actions).where(inArray(actions.id, dependentIds))
      : [];

    // Get completion context from dependencies for enhanced knowledge transfer
    const dependencyCompletionContext: DependencyCompletionContext[] = [];
    if (dependencyIds.length > 0) {
      const completionContextResults = await getDb()
        .select({
          actionId: completionContexts.actionId,
          implementationStory: completionContexts.implementationStory,
          impactStory: completionContexts.impactStory,
          learningStory: completionContexts.learningStory,
          changelogVisibility: completionContexts.changelogVisibility,
          completionTimestamp: completionContexts.completionTimestamp,
          actionTitle: actions.title,
          headline: completionContexts.headline,
          deck: completionContexts.deck,
          pullQuotes: completionContexts.pullQuotes,
        })
        .from(completionContexts)
        .innerJoin(actions, eq(completionContexts.actionId, actions.id))
        .where(inArray(completionContexts.actionId, dependencyIds))
        .orderBy(completionContexts.completionTimestamp);

      for (const context of completionContextResults) {
        dependencyCompletionContext.push({
          action_id: context.actionId,
          action_title: context.actionTitle || 'untitled',
          completion_timestamp: context.completionTimestamp.toISOString(),
          implementation_story: context.implementationStory || undefined,
          impact_story: context.impactStory || undefined,
          learning_story: context.learningStory || undefined,
          changelog_visibility: context.changelogVisibility || 'team',
          headline: context.headline || undefined,
          deck: context.deck || undefined,
          pull_quotes: context.pullQuotes as string[] || undefined,
        });
      }
    }

    // Get action's own completion context if it's completed
    let ownCompletionContext: DependencyCompletionContext | undefined;
    if (action[0].done) {
      const ownContextResult = await getDb()
        .select({
          actionId: completionContexts.actionId,
          implementationStory: completionContexts.implementationStory,
          impactStory: completionContexts.impactStory,
          learningStory: completionContexts.learningStory,
          changelogVisibility: completionContexts.changelogVisibility,
          completionTimestamp: completionContexts.completionTimestamp,
          headline: completionContexts.headline,
          deck: completionContexts.deck,
          pullQuotes: completionContexts.pullQuotes,
        })
        .from(completionContexts)
        .where(eq(completionContexts.actionId, actionId))
        .limit(1);

      if (ownContextResult.length > 0) {
        const context = ownContextResult[0];
        ownCompletionContext = {
          action_id: context.actionId,
          action_title: action[0].title || action[0].data?.title || 'untitled',
          completion_timestamp: context.completionTimestamp.toISOString(),
          implementation_story: context.implementationStory || undefined,
          impact_story: context.impactStory || undefined,
          learning_story: context.learningStory || undefined,
          changelog_visibility: context.changelogVisibility || 'team',
          headline: context.headline || undefined,
          deck: context.deck || undefined,
          pull_quotes: context.pullQuotes as string[] || undefined,
        };
      }
    }

    return {
      id: action[0].id,
      title: action[0].title || action[0].data?.title || 'untitled',
      description: action[0].description || action[0].data?.description,
      vision: action[0].vision || action[0].data?.vision,
      done: action[0].done,
      version: action[0].version,
      created_at: action[0].createdAt.toISOString(),
      updated_at: action[0].updatedAt.toISOString(),
      parent_id: parentId || undefined,
      parent_chain: parentChain,
      children: children.map(toActionMetadata),
      dependencies: dependencies.map(toActionMetadata),
      dependents: dependents.map(toActionMetadata),
      dependency_completion_context: dependencyCompletionContext,
      // Family summaries from database columns
      family_context_summary: action[0].familyContextSummary,
      family_vision_summary: action[0].familyVisionSummary,
      // Action's own completion context
      completion_context: ownCompletionContext,
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

  static async getWorkableActions(limit: number = 50): Promise<Action[]> {
    // Get all incomplete actions
    const openActions = await getDb()
      .select()
      .from(actions)
      .where(eq(actions.done, false))
      .orderBy(desc(actions.updatedAt))
      .limit(limit * 3); // Get more than needed to account for filtering

    const workableActions: Action[] = [];

    for (const action of openActions) {
      // Check if all dependencies are met
      if (!(await dependenciesMet(action.id))) {
        continue;
      }

      // Check if this is a leaf node (no incomplete children)
      const childEdgesResult = await getDb()
        .select()
        .from(edges)
        .where(and(eq(edges.src, action.id), eq(edges.kind, "family")));
      const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
      
      if (childEdges.length === 0) {
        // No children, this is a leaf node
        workableActions.push({
          id: action.id,
          data: action.data as { title: string },
          done: action.done,
          version: action.version,
          createdAt: action.createdAt.toISOString(),
          updatedAt: action.updatedAt.toISOString(),
        });
        
        if (workableActions.length >= limit) {
          break;
        }
      } else {
        // Has children - check if all are done
        const childIds = childEdges.map(e => e.dst).filter((id): id is string => id !== null);
        if (childIds.length > 0) {
          const children = await getDb()
            .select()
            .from(actions)
            .where(inArray(actions.id, childIds));
          
          const allChildrenDone = children.every((child: any) => child.done);
          if (allChildrenDone) {
            // All children are done, so this parent is workable
            workableActions.push({
              id: action.id,
              data: action.data as { title: string },
              done: action.done,
              version: action.version,
              createdAt: action.createdAt.toISOString(),
              updatedAt: action.updatedAt.toISOString(),
            });
            
            if (workableActions.length >= limit) {
              break;
            }
          }
        }
      }
    }

    return workableActions;
  }

  static async getNextActionScoped(scopeActionId: string): Promise<Action | null> {
    // Validate that the scope action exists and generate missing context
    let scopeAction;
    try {
      const actionData = await this.getActionWithContext(scopeActionId);
      scopeAction = [actionData]; // Convert to array for compatibility
    } catch (error) {
      throw new Error(`Scope action with ID ${scopeActionId} not found`);
    }

    // Get all descendants of the scope action (including the scope action itself)
    const subtreeActionIds = await getAllDescendants([scopeActionId]);
    
    // If the subtree is empty (no descendants), only consider the scope action itself
    if (subtreeActionIds.length === 1) {
      const action = scopeAction[0];
      // Check if this single action is actionable using scoped dependency checking
      if (action.done || !(await dependenciesMetScoped(action.id, subtreeActionIds))) {
        return null;
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

    // Get all actions in the subtree that are not done, ordered by creation date
    const subtreeActions = await getDb()
      .select()
      .from(actions)
      .where(and(
        inArray(actions.id, subtreeActionIds),
        eq(actions.done, false)
      ))
      .orderBy(actions.createdAt);

    // Apply the same logic as getNextAction, but only within the subtree
    for (const action of subtreeActions) {
      if (!(await dependenciesMetScoped(action.id, subtreeActionIds))) {
        continue;
      }

      const result = await findNextActionInChildrenScoped(action.id, subtreeActionIds);
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

  static async getFamilyContextSummary(actionId: string): Promise<string> {
    const detail = await this.getActionDetailResource(actionId);
    
    // Get only parent descriptions, excluding the current action
    const parentDescriptions: string[] = [];
    for (const parent of detail.parent_chain) {
      if (parent.description) {
        parentDescriptions.push(parent.description);
      }
    }
    
    // If no parent descriptions, return empty summary
    if (parentDescriptions.length === 0) {
      return "This action has no family context.";
    }
    
    // Reverse the array so we go from closest to furthest parent
    const reversedDescriptions = [...parentDescriptions].reverse();
    
    let prompt = `You are creating a contextual summary to help someone understand how the current action "${detail.title}" fits into the broader project context.\n\n`;
    prompt += "CURRENT ACTION:\n";
    prompt += `${detail.title}`;
    if (detail.description) {
      prompt += `: ${detail.description}`;
    }
    prompt += "\n\n";
    prompt += "FAMILY CONTEXTS (from closest to furthest):\n";
    prompt += reversedDescriptions.map((d, i) => `${i + 1}. ${d}`).join("\n");
    prompt += `\n\nWrite a concise summary that explains how "${detail.title}" connects to and supports the broader project goals. Focus on the relationship between this specific action and the larger context it serves. Make it clear why this action matters in the bigger picture.`;

    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");

    const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await generateText({
      model: provider('gpt-3.5-turbo'),
      prompt,
    });

    return result.text;
  }

  static async getFamilyVisionSummary(actionId: string): Promise<string> {
    const detail = await this.getActionDetailResource(actionId);
    
    // Get only parent visions, excluding the current action
    const parentVisions: string[] = [];
    for (const parent of detail.parent_chain) {
      if (parent.vision) {
        parentVisions.push(parent.vision);
      }
    }
    
    // If no parent visions, return empty summary
    if (parentVisions.length === 0) {
      return "This action has no family vision context.";
    }
    
    // Reverse the array so we go from closest to furthest parent
    const reversedVisions = [...parentVisions].reverse();
    
    let prompt = `You are creating a vision summary to help someone understand how completing the current action "${detail.title}" contributes to the broader project outcomes.\n\n`;
    prompt += "CURRENT ACTION:\n";
    prompt += `${detail.title}`;
    if (detail.description) {
      prompt += `: ${detail.description}`;
    }
    if (detail.vision) {
      prompt += ` (Success criteria: ${detail.vision})`;
    }
    prompt += "\n\n";
    prompt += "FAMILY VISIONS (from closest to furthest):\n";
    prompt += reversedVisions.map((v, i) => `${i + 1}. ${v}`).join("\n");
    prompt += `\n\nWrite a concise summary that explains how completing "${detail.title}" moves the project toward these broader visions. Focus on the connection between this specific action's success and the larger outcomes it enables. Make it clear what bigger picture this action serves.`;

    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");

    const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await generateText({
      model: provider('gpt-3.5-turbo'),
      prompt,
    });

    return result.text;
  }

  /**
   * Build a breadcrumb path for an action by traversing up to the root
   * @param actionId The ID of the action to build the path for
   * @param separator The separator to use in the breadcrumb string (default: " > ")
   * @param includeCurrentAction Whether to include the current action in the path (default: true)
   * @returns PathBuilderResult with segments, breadcrumb string, and titles
   */
  static async buildActionPath(
    actionId: string, 
    separator: string = " > ", 
    includeCurrentAction: boolean = true
  ) {
    return buildActionPath(actionId, separator, includeCurrentAction);
  }

  /**
   * Build a simple breadcrumb string for an action
   * @param actionId The ID of the action to build the path for
   * @param separator The separator to use (default: " > ")
   * @param includeCurrentAction Whether to include the current action (default: true)
   * @returns Simple breadcrumb string
   */
  static async buildActionBreadcrumb(
    actionId: string, 
    separator: string = " > ", 
    includeCurrentAction: boolean = true
  ): Promise<string> {
    return buildActionBreadcrumb(actionId, separator, includeCurrentAction);
  }
}

/**
 * Generate embedding for an action asynchronously (fire-and-forget)
 * This function runs in the background and doesn't block the main operation
 */
async function generateEmbeddingAsync(actionId: string, actionData: any): Promise<void> {
  try {
    const embeddingInput = {
      title: actionData.title,
      description: actionData.description,
      vision: actionData.vision
    };

    const embedding = await EmbeddingsService.generateEmbedding(embeddingInput);
    await VectorService.updateEmbedding(actionId, embedding);
    
    console.log(`Generated embedding for action ${actionId}`);
  } catch (error) {
    console.error(`Failed to generate embedding for action ${actionId}:`, error);
    // Don't throw - this is fire-and-forget
  }
}

/**
 * Generate node summary for an action asynchronously (fire-and-forget)
 * This function runs in the background and doesn't block the main operation
 */
async function generateNodeSummaryAsync(actionId: string, actionData: any): Promise<void> {
  try {
    const summaryInput = {
      title: actionData.title,
      description: actionData.description,
      vision: actionData.vision
    };

    const summary = await SummaryService.generateNodeSummary(summaryInput);
    await SummaryService.updateNodeSummary(actionId, summary);
    
    console.log(`Generated node summary for action ${actionId}`);
  } catch (error) {
    console.error(`Failed to generate node summary for action ${actionId}:`, error);
    // Don't throw - this is fire-and-forget
  }
}

/**
 * Generate subtree summary for a parent action asynchronously (fire-and-forget)
 * This function runs in the background and doesn't block the main operation
 * Only generates summaries for actions that have children
 */
async function generateSubtreeSummaryAsync(actionId: string): Promise<void> {
  try {
    // Get the action details and children
    const actionResult = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (actionResult.length === 0) {
      console.log(`Action ${actionId} not found, skipping subtree summary generation`);
      return;
    }

    const action = actionResult[0];
    const actionData = action.data as any;

    // Get children to check if this action needs a subtree summary
    const childEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "family"))
    );
    const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
    
    if (childEdges.length === 0) {
      console.log(`Action ${actionId} has no children, skipping subtree summary generation`);
      return;
    }

    // Get children details
    const memberIds = childEdges.map(edge => edge.dst).filter((id): id is string => id !== null);
    const childrenResult = await getDb().select().from(actions).where(inArray(actions.id, memberIds));
    const children = Array.isArray(childrenResult) ? childrenResult : [];

    const subtreeSummaryInput = {
      actionId: actionId,
      title: actionData.title,
      description: actionData.description,
      children: children.map(child => ({
        title: (child.data as any)?.title || 'Untitled',
        description: (child.data as any)?.description,
        done: Boolean(child.done)
      }))
    };

    const summary = await SubtreeSummaryService.generateSubtreeSummary(subtreeSummaryInput);
    await SubtreeSummaryService.updateSubtreeSummary(actionId, summary);
    
    console.log(`Generated subtree summary for action ${actionId}`);
  } catch (error) {
    console.error(`Failed to generate subtree summary for action ${actionId}:`, error);
    // Don't throw - this is fire-and-forget
  }
}

/**
 * Generate family summaries for an action asynchronously (fire-and-forget)
 * This function runs in the background and doesn't block the main operation
 * Generates both context and vision summaries based on family chain
 */
async function generateFamilySummariesAsync(actionId: string): Promise<void> {
  try {
    // Get the action details
    const actionResult = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (actionResult.length === 0) {
      console.log(`Action ${actionId} not found, skipping family summaries generation`);
      return;
    }

    const action = actionResult[0];
    
    // Get title, description, vision from either new columns or JSON fallback
    const title = action.title || (action.data as any)?.title;
    const description = action.description || (action.data as any)?.description;
    const vision = action.vision || (action.data as any)?.vision;

    if (!title) {
      console.log(`Action ${actionId} has no title, skipping family summaries generation`);
      return;
    }

    // Get family chain
    const familyChain = await FamilySummaryService.getFamilyChain(actionId);

    const familySummaryInput = {
      actionId: actionId,
      title: title,
      description: description,
      vision: vision,
      familyChain: familyChain
    };

    const { contextSummary, visionSummary } = await FamilySummaryService.generateBothFamilySummaries(familySummaryInput);
    await FamilySummaryService.updateFamilySummaries(actionId, contextSummary, visionSummary);
    
    console.log(`Generated family summaries for action ${actionId}`);
  } catch (error) {
    console.error(`Failed to generate family summaries for action ${actionId}:`, error);
    // Don't throw - this is fire-and-forget
  }
}