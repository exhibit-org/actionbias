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
import { AnalysisService, needsPlacementAnalysis, type ActionAnalysisResult } from "./analysis";
import { PlacementService, type PlacementResult } from "./placement";
import type { ActionContent } from "../utils/text-processing";
import { EmbeddingsService } from './embeddings';
import { VectorService } from './vector';
import { SummaryService } from './summary';
import { SubtreeSummaryService } from './subtree-summary';
import { ParentSummaryService } from './parent-summary';
import { CompletionContextService } from './completion-context';
import { buildActionPath, buildActionBreadcrumb } from '../utils/path-builder';

// Default confidence threshold for automatically applying placement suggestions
const DEFAULT_AUTO_PLACEMENT_THRESHOLD = 0.8;

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
        and(eq(edges.src, actionId), eq(edges.kind, "child"))
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
// Helper function to check if parent dependencies are met recursively
async function parentDependenciesMet(actionId: string): Promise<boolean> {
  // Get parent relationship
  const parentEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "child")));
  const parentEdges = Array.isArray(parentEdgesResult) ? parentEdgesResult : [];
  
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
  // Check both direct dependencies and parent dependencies
  const directDepsOk = await dependenciesMetDirectly(actionId);
  if (!directDepsOk) {
    return false;
  }
  
  const parentDepsOk = await parentDependenciesMet(actionId);
  return parentDepsOk;
}

// Scoped version of dependency checking that only considers dependencies within a subtree
async function dependenciesMetScoped(actionId: string, scopeActionIds: string[]): Promise<boolean> {
  // Check both direct dependencies and parent dependencies, but only within scope
  const directDepsOk = await dependenciesMetDirectlyScoped(actionId, scopeActionIds);
  if (!directDepsOk) {
    return false;
  }
  
  const parentDepsOk = await parentDependenciesMetScoped(actionId, scopeActionIds);
  return parentDepsOk;
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

// Helper function to check parent dependencies within scope
async function parentDependenciesMetScoped(actionId: string, scopeActionIds: string[]): Promise<boolean> {
  // Get parent relationship
  const parentEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "child")));
  const parentEdges = Array.isArray(parentEdgesResult) ? parentEdgesResult : [];
  
  if (parentEdges.length === 0) {
    // No parent, so parent dependencies are met
    return true;
  }
  
  const parentId = parentEdges[0].src;
  if (!parentId) {
    return true;
  }
  
  // If parent is outside scope, ignore parent dependencies
  if (!scopeActionIds.includes(parentId)) {
    return true;
  }
  
  // Check if parent's direct dependencies are met (within scope)
  const parentDepsOk = await dependenciesMetDirectlyScoped(parentId, scopeActionIds);
  if (!parentDepsOk) {
    return false;
  }
  
  // Recursively check parent's parent dependencies (within scope)
  return await parentDependenciesMetScoped(parentId, scopeActionIds);
}

// Recursively find the next actionable child of a given action
async function findNextActionInChildren(actionId: string): Promise<{ action: any | null; allDone: boolean }> {
  const childEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.src, actionId), eq(edges.kind, "child")));
  const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
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

// Scoped version that only considers children within the specified subtree
async function findNextActionInChildrenScoped(actionId: string, scopeActionIds: string[]): Promise<{ action: any | null; allDone: boolean }> {
  const childEdgesResult = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.src, actionId), eq(edges.kind, "child")));
  const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
  const childIds = childEdges
    .map((edge: any) => edge.dst)
    .filter((id: any): id is string => id !== null)
    .filter(id => scopeActionIds.includes(id)); // Only consider children within scope

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
  parent_id?: string;
  depends_on_ids?: string[];
}

export interface CreateActionResult {
  action: any; // The created action from the database
  parent_id?: string;
  applied_parent_id?: string;
  dependencies_count: number;
  needs_auto_placement: boolean;
  analysis?: ActionAnalysisResult; // Content analysis if auto-placement is needed
  placement?: PlacementResult; // LLM-based placement suggestion if auto-placement is needed
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
  completion_context?: {
    implementation_story?: string;
    impact_story?: string;
    learning_story?: string;
    changelog_visibility?: string;
  };
}

export interface UpdateParentParams {
  action_id: string;
  new_parent_id?: string; // undefined means remove parent (make it a root action)
}

export class ActionsService {
  static async createAction(
    params: CreateActionParams,
    autoPlacementThreshold: number = DEFAULT_AUTO_PLACEMENT_THRESHOLD
  ): Promise<CreateActionResult> {
    const { title, description, vision, parent_id, depends_on_ids } = params;
    
    // Detect if this action needs automatic placement analysis
    const needsAutoPlacement = !parent_id;
    
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
        // Set new columns for better performance and indexing
        title: title,
        description: description,
        vision: vision,
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

    // Perform content analysis and placement suggestion for orphaned actions
    let analysis: ActionAnalysisResult | undefined;
    let placement: PlacementResult | undefined;
    let appliedParentId: string | undefined = parent_id;
    
    if (needsAutoPlacement) {
      console.log(`Action created without parent_id: ${newAction[0].id} - "${title}" - flagged for automatic placement analysis`);
      
      try {
        // Build action content for analysis
        const actionContent: ActionContent = {
          title,
          description,
          vision
        };
        
        // Get all existing actions for placement context
        const existingActionsResult = await getDb()
          .select({
            id: actions.id,
            title: sql<string>`${actions.data}->>'title'`,
            description: sql<string>`${actions.data}->>'description'`,
            vision: sql<string>`${actions.data}->>'vision'`,
            parentId: sql<string>`${actions.data}->>'parent_id'`
          })
          .from(actions)
          .where(eq(actions.done, false)); // Only consider active actions
        
        // Ensure we have an array (handle test environment quirks)
        const existingActions = Array.isArray(existingActionsResult) ? existingActionsResult : [];
        
        // Convert to the format expected by PlacementService
        const hierarchyItems = existingActions.map(action => ({
          id: action.id,
          title: action.title || '',
          description: action.description || undefined,
          vision: action.vision || undefined,
          parentId: action.parentId || undefined
        }));
        
        // Get intelligent placement suggestion
        placement = await PlacementService.findBestParent(actionContent, hierarchyItems);
        analysis = placement.analysis; // PlacementService includes analysis results

        if (
          placement.bestParent &&
          placement.confidence >= autoPlacementThreshold
        ) {
          await getDb().insert(edges).values({
            src: placement.bestParent.id,
            dst: newAction[0].id,
            kind: "child",
          });
          appliedParentId = placement.bestParent.id;

          // Trigger async summary generation similar to addChildAction
          generateParentSummariesAsync(newAction[0].id).catch(console.error);
          generateSubtreeSummaryAsync(appliedParentId).catch(console.error);
        }
        
        console.log(`Placement analysis completed for action ${newAction[0].id}:`, {
          bestParent: placement.bestParent ? `${placement.bestParent.title} (${placement.bestParent.id})` : 'none',
          confidence: placement.confidence.toFixed(3),
          reasoning: placement.reasoning,
          qualityScore: analysis?.metadata.qualityScore.toFixed(3) || 'N/A',
          keywordCount: analysis?.keywords.keywords.length || 0
        });
      } catch (error) {
        console.error(`Error analyzing/placing action content for ${newAction[0].id}:`, error);
        // Don't fail action creation if analysis/placement fails
      }
    }

    // Generate embedding and node summary asynchronously (fire-and-forget)
    generateEmbeddingAsync(newAction[0].id, validatedData).catch(console.error);
    generateNodeSummaryAsync(newAction[0].id, validatedData).catch(console.error);

    return {
      action: newAction[0],
      parent_id,
      applied_parent_id: appliedParentId,
      dependencies_count: depends_on_ids?.length || 0,
      needs_auto_placement: needsAutoPlacement,
      analysis,
      placement
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
        kind: "child",
      })
      .returning();

    // Generate embedding and node summary asynchronously for new child action
    generateEmbeddingAsync(newAction[0].id, validatedData).catch(console.error);
    generateNodeSummaryAsync(newAction[0].id, validatedData).catch(console.error);
    
    // Generate parent summaries for the new child action (since it now has a parent chain)
    generateParentSummariesAsync(newAction[0].id).catch(console.error);
    
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
      and(eq(edges.dst, action_id), eq(edges.kind, "child"))
    ).limit(1);
    const parentEdges = Array.isArray(parentEdgesResult) ? parentEdgesResult : [];
    const parent_id = parentEdges.length > 0 ? parentEdges[0].src : undefined;

    // Find all children (actions where this action is the parent)
    const childEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, action_id), eq(edges.kind, "child"))
    );

    const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
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

    // Regenerate subtree summaries for affected parents
    if (parent_id) {
      // Regenerate subtree summary for original parent (child was removed)
      generateSubtreeSummaryAsync(parent_id).catch(console.error);
    }
    if (child_handling === "reparent" && new_parent_id && childIds.length > 0) {
      // Regenerate subtree summary for new parent (children were added)
      generateSubtreeSummaryAsync(new_parent_id).catch(console.error);
      
      // Regenerate parent summaries for all reparented children and their descendants
      // (their parent chains have changed)
      for (const childId of childIds) {
        const allDescendants = await getAllDescendants([childId]);
        for (const descendantId of allDescendants) {
          generateParentSummariesAsync(descendantId).catch(console.error);
        }
      }
    }

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
          generateParentSummariesAsync(descendantId).catch(console.error);
        }
      }
    }

    // Handle completion context if provided
    if (completion_context !== undefined) {
      try {
        await CompletionContextService.upsertCompletionContext({
          actionId: action_id,
          implementationStory: completion_context.implementation_story,
          impactStory: completion_context.impact_story,
          learningStory: completion_context.learning_story,
          changelogVisibility: completion_context.changelog_visibility,
        });
      } catch (error) {
        console.error(`Failed to update completion context for action ${action_id}:`, error);
        // Don't fail the action update if completion context fails
      }
    }

    // If done status changed, regenerate subtree summary for parent (child completion affects parent summary)
    if (done !== undefined) {
      // Find parent of this action and regenerate its subtree summary
      getDb().select().from(edges).where(and(eq(edges.dst, action_id), eq(edges.kind, "child"))).limit(1)
        .then((parentEdges: any) => {
          const parentEdgeResults = Array.isArray(parentEdges) ? parentEdges : [];
          if (parentEdgeResults.length > 0 && parentEdgeResults[0].src) {
            generateSubtreeSummaryAsync(parentEdgeResults[0].src).catch(console.error);
          }
        })
        .catch(console.error);
    }

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

    // Get existing parent before removing relationship (for subtree summary regeneration)
    const existingParentEdges = await getDb().select().from(edges).where(
      and(eq(edges.dst, action_id), eq(edges.kind, "child"))
    ).limit(1);
    const existingParentEdgeResults = Array.isArray(existingParentEdges) ? existingParentEdges : [];
    const old_parent_id = existingParentEdgeResults.length > 0 ? existingParentEdgeResults[0].src : undefined;

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

    // Regenerate subtree summaries for both old and new parents (if they exist)
    if (old_parent_id) {
      generateSubtreeSummaryAsync(old_parent_id).catch(console.error);
    }
    if (new_parent_id) {
      generateSubtreeSummaryAsync(new_parent_id).catch(console.error);
    }

    // Regenerate parent summaries for the moved action and all its descendants
    // (their parent chains have changed)
    const allDescendants = await getAllDescendants([action_id]);
    for (const descendantId of allDescendants) {
      generateParentSummariesAsync(descendantId).catch(console.error);
    }

    return {
      action_id,
      old_parent_id,
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
        getDb().select().from(edges).where(eq(edges.kind, "child")).limit(1000),
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
      const childrenMap = new Map<string, string[]>();
      const parentMap = new Map<string, string>();
      const dependenciesMap = new Map<string, string[]>();

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
        
        const children = childrenMap.get(actionId) || [];
        const dependencies = dependenciesMap.get(actionId) || [];

        // Filter children to exclude completed ones (unless includeCompleted is true)
        const filteredChildren = children
          .map(childId => buildNode(childId, depth + 1))
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

    // Get the action
    const action = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (action.length === 0) {
      throw new Error(`Action with ID ${actionId} not found`);
    }

    // Get parent relationship
    const parentEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "child"))
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
        and(eq(edges.dst, currentParentId), eq(edges.kind, "child"))
      );
      const nextParentEdges = Array.isArray(nextParentEdgesResult) ? nextParentEdgesResult : [];
      currentParentId = nextParentEdges.length > 0 ? nextParentEdges[0].src : undefined;
    }

    // Get children
    const childEdgesResult = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "child"))
    );
    const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
    const childIds = childEdges.map((edge: any) => edge.dst).filter((id: any): id is string => id !== null);
    const children = childIds.length > 0 
      ? await getDb().select().from(actions).where(inArray(actions.id, childIds))
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
      // Parent summaries from database columns
      parent_context_summary: action[0].parentContextSummary,
      parent_vision_summary: action[0].parentVisionSummary,
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

  static async getNextActionScoped(scopeActionId: string): Promise<Action | null> {
    // Validate that the scope action exists
    const scopeAction = await getDb()
      .select()
      .from(actions)
      .where(eq(actions.id, scopeActionId))
      .limit(1);

    if (scopeAction.length === 0) {
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

  static async getParentContextSummary(actionId: string): Promise<string> {
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
      return "This action has no parent context.";
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
    prompt += "PARENT CONTEXTS (from closest to furthest):\n";
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

  static async getParentVisionSummary(actionId: string): Promise<string> {
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
      return "This action has no parent vision context.";
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
    prompt += "PARENT VISIONS (from closest to furthest):\n";
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
      and(eq(edges.src, actionId), eq(edges.kind, "child"))
    );
    const childEdges = Array.isArray(childEdgesResult) ? childEdgesResult : [];
    
    if (childEdges.length === 0) {
      console.log(`Action ${actionId} has no children, skipping subtree summary generation`);
      return;
    }

    // Get children details
    const childIds = childEdges.map(edge => edge.dst).filter((id): id is string => id !== null);
    const childrenResult = await getDb().select().from(actions).where(inArray(actions.id, childIds));
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
 * Generate parent summaries for an action asynchronously (fire-and-forget)
 * This function runs in the background and doesn't block the main operation
 * Generates both context and vision summaries based on parent chain
 */
async function generateParentSummariesAsync(actionId: string): Promise<void> {
  try {
    // Get the action details
    const actionResult = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (actionResult.length === 0) {
      console.log(`Action ${actionId} not found, skipping parent summaries generation`);
      return;
    }

    const action = actionResult[0];
    
    // Get title, description, vision from either new columns or JSON fallback
    const title = action.title || (action.data as any)?.title;
    const description = action.description || (action.data as any)?.description;
    const vision = action.vision || (action.data as any)?.vision;

    if (!title) {
      console.log(`Action ${actionId} has no title, skipping parent summaries generation`);
      return;
    }

    // Get parent chain
    const parentChain = await ParentSummaryService.getParentChain(actionId);

    const parentSummaryInput = {
      actionId: actionId,
      title: title,
      description: description,
      vision: vision,
      parentChain: parentChain
    };

    const { contextSummary, visionSummary } = await ParentSummaryService.generateBothParentSummaries(parentSummaryInput);
    await ParentSummaryService.updateParentSummaries(actionId, contextSummary, visionSummary);
    
    console.log(`Generated parent summaries for action ${actionId}`);
  } catch (error) {
    console.error(`Failed to generate parent summaries for action ${actionId}:`, error);
    // Don't throw - this is fire-and-forget
  }
}