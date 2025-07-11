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
import { EnhancedContextService } from './enhanced-context';
import { ContextService } from './context';
import { buildActionPath, buildActionBreadcrumb } from '../utils/path-builder';

// Default confidence threshold for automatically applying placement suggestions

// Helper function to check if an action has incomplete dependencies
async function hasIncompleteDependencies(actionId: string): Promise<{ hasIncomplete: boolean; incompleteDeps: string[] }> {
  // Get all dependencies for this action
  const dependencyEdges = await getDb()
    .select()
    .from(edges)
    .where(and(eq(edges.dst, actionId), eq(edges.kind, "depends_on")));
  
  if (dependencyEdges.length === 0) {
    return { hasIncomplete: false, incompleteDeps: [] };
  }
  
  // Get the completion status of all dependencies
  const dependencyIds = dependencyEdges.map((edge: any) => edge.src).filter(Boolean);
  const dependencyActions = await getDb()
    .select({ id: actions.id, done: actions.done, title: actions.title })
    .from(actions)
    .where(inArray(actions.id, dependencyIds));
  
  const incompleteDeps = dependencyActions
    .filter((action: any) => !action.done)
    .map((action: any) => `"${action.title || action.id}" (${action.id})`);
  
  return {
    hasIncomplete: incompleteDeps.length > 0,
    incompleteDeps
  };
}

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
    // Legacy editorial fields (Phase 2)
    implementation_story?: string;
    impact_story?: string;
    learning_story?: string;
    headline?: string;
    deck?: string;
    pull_quotes?: string[];
    // New objective fields (Phase 3)
    technical_changes?: {
      files_modified?: string[];
      files_created?: string[];
      functions_added?: string[];
      apis_modified?: string[];
      dependencies_added?: string[];
      config_changes?: string[];
    };
    outcomes?: {
      features_implemented?: string[];
      bugs_fixed?: string[];
      performance_improvements?: string[];
      tests_passing?: boolean;
      build_status?: "success" | "failed" | "unknown";
    };
    challenges?: {
      blockers_encountered?: string[];
      blockers_resolved?: string[];
      approaches_tried?: string[];
      discoveries?: string[];
    };
    // Alignment reflection fields (Phase 3)
    alignment_reflection?: {
      purpose_interpretation?: string;
      goal_achievement_assessment?: string;
      context_influence?: string;
      assumptions_made?: string[];
    };
    // Common fields
    changelog_visibility?: string;
    git_context?: {
      commits?: Array<{
        hash?: string;
        shortHash?: string;
        message: string;
        author?: {
          name: string;
          email?: string;
          username?: string;
        };
        timestamp?: string;
        branch?: string;
        repository?: string;
        stats?: {
          filesChanged?: number;
          insertions?: number;
          deletions?: number;
          files?: string[];
        };
      }>;
      pullRequests?: Array<{
        number?: number;
        title: string;
        url?: string;
        repository?: string;
        author?: {
          name?: string;
          username?: string;
        };
        state?: 'open' | 'closed' | 'merged' | 'draft';
        merged?: boolean;
        mergedAt?: string;
        branch?: {
          head: string;
          base: string;
        };
      }>;
      repositories?: Array<{
        name: string;
        url?: string;
        platform?: 'github' | 'gitlab' | 'other';
      }>;
    };
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
      
      // Create automatic dependency: parent depends on child
      // This ensures parent cannot be completed until child is done
      await getDb().insert(edges).values({
        src: newAction[0].id,  // child (must be completed first)
        dst: parent_id,        // parent (depends on child)
        kind: "depends_on",
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
    await getDb()
      .insert(edges)
      .values({
        src: parent_id,
        dst: newAction[0].id,
        kind: "family",
      });
    
    // Create automatic dependency: parent depends on child
    // This ensures parent cannot be completed until child is done
    await getDb()
      .insert(edges)
      .values({
        src: newAction[0].id,  // child (must be completed first)
        dst: parent_id,        // parent (depends on child)
        kind: "depends_on",
      });

    // Generate embedding and node summary asynchronously for new child action
    generateEmbeddingAsync(newAction[0].id, validatedData).catch(console.error);
    generateNodeSummaryAsync(newAction[0].id, validatedData).catch(console.error);
    
    // Generate parent summaries for the new child action (since it now has a parent chain)
    generateFamilySummariesAsync(newAction[0].id).catch(console.error);
    
    // Generate subtree summary for parent asynchronously (since it now has a new child)
    generateSubtreeSummaryAsync(parent_id).catch(console.error);

    return {
      action: newAction[0],
      parent: parentAction[0]
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
    
    console.log(`[REMOVE_DEPENDENCY] Starting removal: ${action_id} depends on ${depends_on_id}`);
    
    // Check that both actions exist
    console.log(`[REMOVE_DEPENDENCY] Checking if action ${action_id} exists...`);
    const action = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
    console.log(`[REMOVE_DEPENDENCY] Action found: ${action.length > 0 ? action[0].data?.title : 'NOT FOUND'}`);
    
    console.log(`[REMOVE_DEPENDENCY] Checking if dependency action ${depends_on_id} exists...`);
    const dependsOn = await getDb().select().from(actions).where(eq(actions.id, depends_on_id)).limit(1);
    console.log(`[REMOVE_DEPENDENCY] Dependency action found: ${dependsOn.length > 0 ? dependsOn[0].data?.title : 'NOT FOUND'}`);
    
    if (action.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }
    
    if (dependsOn.length === 0) {
      throw new Error(`Dependency action with ID ${depends_on_id} not found`);
    }

    // Check if dependency exists
    console.log(`[REMOVE_DEPENDENCY] Checking if dependency edge exists: src=${depends_on_id}, dst=${action_id}, kind=depends_on`);
    const existingEdge = await getDb().select().from(edges).where(
      and(
        eq(edges.src, depends_on_id),
        eq(edges.dst, action_id),
        eq(edges.kind, "depends_on")
      )
    ).limit(1);
    console.log(`[REMOVE_DEPENDENCY] Existing edge found: ${existingEdge.length > 0 ? 'YES' : 'NO'}`);

    if (existingEdge.length === 0) {
      throw new Error(`No dependency found: ${action[0].data?.title} does not depend on ${dependsOn[0].data?.title}`);
    }
    
    // Delete the dependency edge
    console.log(`[REMOVE_DEPENDENCY] Deleting dependency edge...`);
    const deletedEdge = await getDb().delete(edges).where(
      and(
        eq(edges.src, depends_on_id),
        eq(edges.dst, action_id),
        eq(edges.kind, "depends_on")
      )
    ).returning();
    console.log(`[REMOVE_DEPENDENCY] Deleted edge:`, deletedEdge[0]);

    console.log(`[REMOVE_DEPENDENCY] Successfully removed dependency`);
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
      // If marking as complete, check for incomplete dependencies
      if (done === true) {
        const { hasIncomplete, incompleteDeps } = await hasIncompleteDependencies(action_id);
        if (hasIncomplete) {
          throw new Error(`Cannot complete action "${existingAction[0].data?.title || action_id}". The following dependencies must be completed first: ${incompleteDeps.join(', ')}`);
        }
      }
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
          
          // Fetch enhanced context and generate editorial content asynchronously (don't wait)
          (async () => {
            try {
              // Get enhanced dependency and sibling context
              const enhancedContext = await EnhancedContextService.getEnhancedEditorialContext(action_id);

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
                // Include enhanced dependency and sibling context
                dependencyCompletions: enhancedContext.dependencyCompletions,
                siblingContext: enhancedContext.siblingContext
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
          gitContext: completion_context.git_context,
          // Phase 3: Objective completion data
          technicalChanges: completion_context.technical_changes,
          outcomes: completion_context.outcomes,
          challenges: completion_context.challenges,
          alignmentReflection: completion_context.alignment_reflection,
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

    // Remove existing dependency relationship from this action to old parent
    if (old_family_id) {
      await getDb().delete(edges).where(
        and(
          eq(edges.src, action_id),
          eq(edges.dst, old_family_id),
          eq(edges.kind, "depends_on")
        )
      );
    }

    // Add new family relationship if provided
    if (new_family_id) {
      await getDb().insert(edges).values({
        src: new_family_id,
        dst: action_id,
        kind: "family",
      });
      
      // Create automatic dependency: parent depends on child
      // This ensures parent cannot be completed until child is done
      await getDb().insert(edges).values({
        src: action_id,        // child (must be completed first)
        dst: new_family_id,    // parent (depends on child)
        kind: "depends_on",
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

  static async getActionCounts(): Promise<{ total: number; incomplete: number; completed: number; generatedAt: string }> {
    // Get total count
    const totalResult = await getDb().select({ count: count() }).from(actions);
    const total = totalResult[0].count;
    
    // Get completed count
    const completedResult = await getDb().select({ count: count() }).from(actions).where(eq(actions.done, true));
    const completed = completedResult[0].count;
    
    // Calculate incomplete
    const incomplete = total - completed;
    
    return {
      total,
      incomplete,
      completed,
      generatedAt: new Date().toISOString()
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
          description: action.description || action.data?.description,
          vision: action.vision || action.data?.vision,
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
          description: action.description || action.data?.description,
          vision: action.vision || action.data?.vision,
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
          gitContext: completionContexts.gitContext,
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
          git_context: context.gitContext || undefined,
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
          gitContext: completionContexts.gitContext,
          templateContent: completionContexts.templateContent,
          technicalChanges: completionContexts.technicalChanges,
          outcomes: completionContexts.outcomes,
          challenges: completionContexts.challenges,
          alignmentReflection: completionContexts.alignmentReflection,
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
          git_context: context.gitContext || undefined,
          templateContent: context.templateContent || undefined,
          technical_changes: context.technicalChanges || undefined,
          outcomes: context.outcomes || undefined,
          challenges: context.challenges || undefined,
          alignment_reflection: context.alignmentReflection || undefined,
        };
      }
    }

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
        const siblingActions = await getDb().select().from(actions).where(inArray(actions.id, siblingIds));
        siblings.push(...siblingActions.map(toActionMetadata));
      }
    }

    // Build relationship flags to indicate which lists each action appears in
    const relationshipFlags: { [action_id: string]: string[] } = {};
    
    // Track which lists each action appears in
    parentChain.forEach((ancestor: ActionMetadata) => {
      if (!relationshipFlags[ancestor.id]) relationshipFlags[ancestor.id] = [];
      relationshipFlags[ancestor.id].push('ancestor');
    });
    
    children.map(toActionMetadata).forEach((child: ActionMetadata) => {
      if (!relationshipFlags[child.id]) relationshipFlags[child.id] = [];
      relationshipFlags[child.id].push('child');
    });
    
    dependencies.map(toActionMetadata).forEach((dep: ActionMetadata) => {
      if (!relationshipFlags[dep.id]) relationshipFlags[dep.id] = [];
      relationshipFlags[dep.id].push('dependency');
    });
    
    dependents.map(toActionMetadata).forEach((dependent: ActionMetadata) => {
      if (!relationshipFlags[dependent.id]) relationshipFlags[dependent.id] = [];
      relationshipFlags[dependent.id].push('dependent');
    });
    
    siblings.forEach((sibling: ActionMetadata) => {
      if (!relationshipFlags[sibling.id]) relationshipFlags[sibling.id] = [];
      relationshipFlags[sibling.id].push('sibling');
    });

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
      siblings: siblings,
      relationship_flags: relationshipFlags,
      dependency_completion_context: dependencyCompletionContext,
      // Family summaries from database columns
      family_context_summary: action[0].familyContextSummary,
      family_vision_summary: action[0].familyVisionSummary,
      // Action's own completion context
      completion_context: ownCompletionContext,
    };
  }

  // Core data only - no relationships, no AI summaries
  static async getWorkItemCoreData(actionId: string): Promise<{
    id: string;
    title: string;
    description?: string;
    vision?: string;
    done: boolean;
    version: number | null;
    created_at: string;
    updated_at: string;
    completion_context?: DependencyCompletionContext;
  }> {
    // Get the basic action data
    const actionResult = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    if (actionResult.length === 0) {
      throw new Error(`Action with ID ${actionId} not found`);
    }
    
    const action = actionResult[0];
    
    // Get completion context if action is completed
    let completionContext: DependencyCompletionContext | undefined;
    if (action.done) {
      const completionResult = await getDb()
        .select()
        .from(completionContexts)
        .where(eq(completionContexts.actionId, actionId))
        .limit(1);
      
      if (completionResult.length > 0) {
        const context = completionResult[0];
        completionContext = {
          action_id: context.actionId,
          action_title: action.title || action.data?.title || 'untitled',
          completion_timestamp: context.completionTimestamp?.toISOString() || new Date().toISOString(),
          implementation_story: context.implementationStory || undefined,
          impact_story: context.impactStory || undefined,
          learning_story: context.learningStory || undefined,
          changelog_visibility: context.changelogVisibility,
          headline: context.headline || undefined,
          deck: context.deck || undefined,
          pull_quotes: context.pullQuotes as string[] || undefined,
          git_context: context.gitContext || undefined,
        };
      }
    }

    return {
      id: action.id,
      title: action.title || action.data?.title || 'untitled',
      description: action.description || action.data?.description,
      vision: action.vision || action.data?.vision,
      done: action.done,
      version: action.version,
      created_at: action.createdAt.toISOString(),
      updated_at: action.updatedAt.toISOString(),
      completion_context: completionContext,
    };
  }


  static async getUnblockedActions(limit: number = 50): Promise<Action[]> {
    // Get all incomplete actions
    const openActions = await getDb()
      .select()
      .from(actions)
      .where(eq(actions.done, false))
      .orderBy(desc(actions.updatedAt))
      .limit(limit * 3); // Get more than needed to account for filtering

    const unblockedActions: Action[] = [];

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
            // All children are done, so this parent is unblocked
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
        }
      }
    }

    return unblockedActions;
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

  /**
   * Generate AI-powered suggestions for decomposing an action into smaller child actions
   * @param params - Object containing action_id, max_suggestions, and include_reasoning
   * @returns Object with suggestions array and metadata
   */
  static async decomposeAction(params: {
    action_id: string;
    max_suggestions?: number;
    include_reasoning?: boolean;
    custom_context?: string;
  }): Promise<{
    action: any;
    suggestions: Array<{
      title: string;
      description?: string;
      reasoning?: string;
      confidence: number;
      index: number;
    }>;
    dependencies: Array<{
      dependent_index: number;
      depends_on_index: number;
      reasoning?: string;
    }>;
    metadata: {
      processingTimeMs: number;
    };
  }> {
    const startTime = Date.now();
    const { action_id, max_suggestions = 5, include_reasoning = true, custom_context } = params;

    // Get the action details
    const actionResult = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
    if (actionResult.length === 0) {
      throw new Error(`Action with ID ${action_id} not found`);
    }

    const action = actionResult[0];
    const title = action.title || (action.data as any)?.title;
    const description = action.description || (action.data as any)?.description;
    const vision = action.vision || (action.data as any)?.vision;

    if (!title) {
      throw new Error(`Action ${action_id} has no title - cannot decompose`);
    }

    // Build AI prompt for decomposition with dependencies
    let prompt = `You are an expert at breaking down complex tasks into smaller, actionable subtasks with proper sequencing. Your goal is to decompose the given action into specific, concrete child actions AND identify the dependency relationships between them.\n\n`;
    
    prompt += `ACTION TO DECOMPOSE:\n`;
    prompt += `Title: ${title}\n`;
    if (description) {
      prompt += `Description: ${description}\n`;
    }
    if (vision) {
      prompt += `Success Criteria: ${vision}\n`;
    }
    if (custom_context) {
      prompt += `Additional Context: ${custom_context}\n`;
    }
    
    prompt += `\nTASK: Generate ${max_suggestions} child actions with their dependencies.\n\n`;
    
    prompt += `RESPONSE FORMAT:\n`;
    prompt += `Respond with a JSON object containing:\n`;
    prompt += `1. "actions": Array of child actions with index numbers\n`;
    prompt += `2. "dependencies": Array of dependency relationships\n\n`;
    
    prompt += `For each child action in the "actions" array, provide:\n`;
    prompt += `- "index": Unique number (0, 1, 2, etc.)\n`;
    prompt += `- "title": Clear, specific title (what needs to be done)\n`;
    prompt += `- "description": Brief description explaining the action\n`;
    if (include_reasoning) {
      prompt += `- "reasoning": Why this is a necessary step\n`;
    }
    prompt += `- "confidence": Score (0.0-1.0) indicating how essential this is\n\n`;
    
    prompt += `For each dependency in the "dependencies" array, provide:\n`;
    prompt += `- "dependent_index": Index of action that depends on another\n`;
    prompt += `- "depends_on_index": Index of action that must be completed first\n`;
    if (include_reasoning) {
      prompt += `- "reasoning": Why this dependency is necessary\n`;
    }
    prompt += `\n`;
    
    prompt += `Guidelines:\n`;
    prompt += `- Each child action should be specific and actionable\n`;
    prompt += `- Avoid vague or generic tasks\n`;
    prompt += `- Consider logical sequence: design before implementation, setup before execution\n`;
    prompt += `- Focus on concrete deliverables or milestones\n`;
    prompt += `- Each child should contribute directly to completing the parent\n`;
    prompt += `- Dependencies should reflect real execution constraints\n`;
    prompt += `- An action can depend on multiple other actions if needed\n\n`;
    
    prompt += `Example response format:\n`;
    prompt += `{\n`;
    prompt += `  "actions": [\n`;
    prompt += `    {"index": 0, "title": "...", "description": "...", ${include_reasoning ? '"reasoning": "...", ' : ''}"confidence": 0.9},\n`;
    prompt += `    {"index": 1, "title": "...", "description": "...", ${include_reasoning ? '"reasoning": "...", ' : ''}"confidence": 0.8}\n`;
    prompt += `  ],\n`;
    prompt += `  "dependencies": [\n`;
    prompt += `    {"dependent_index": 1, "depends_on_index": 0${include_reasoning ? ', "reasoning": "..."' : ''}}\n`;
    prompt += `  ]\n`;
    prompt += `}`;

    try {
      const { generateText } = await import("ai");
      const { createOpenAI } = await import("@ai-sdk/openai");

      const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const result = await generateText({
        model: provider('gpt-4o-mini'),
        prompt,
        maxTokens: 3000,
      });

      // Parse the AI response
      let suggestions: Array<{
        title: string;
        description?: string;
        reasoning?: string;
        confidence: number;
        index: number;
      }> = [];
      
      let dependencies: Array<{
        dependent_index: number;
        depends_on_index: number;
        reasoning?: string;
      }> = [];

      try {
        // Try to extract JSON from the response
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          
          if (parsedResponse.actions && Array.isArray(parsedResponse.actions)) {
            suggestions = parsedResponse.actions
              .filter((s: any) => s.title && typeof s.confidence === 'number' && typeof s.index === 'number')
              .slice(0, max_suggestions)
              .map((s: any) => ({
                title: s.title,
                description: s.description || undefined,
                reasoning: include_reasoning ? (s.reasoning || undefined) : undefined,
                confidence: Math.max(0, Math.min(1, s.confidence)), // Clamp between 0 and 1
                index: s.index,
              }));
          }
          
          if (parsedResponse.dependencies && Array.isArray(parsedResponse.dependencies)) {
            dependencies = parsedResponse.dependencies
              .filter((d: any) => 
                typeof d.dependent_index === 'number' && 
                typeof d.depends_on_index === 'number' &&
                d.dependent_index !== d.depends_on_index // Avoid self-dependencies
              )
              .map((d: any) => ({
                dependent_index: d.dependent_index,
                depends_on_index: d.depends_on_index,
                reasoning: include_reasoning ? (d.reasoning || undefined) : undefined,
              }));
          }
        }
      } catch (parseError) {
        console.error('[ActionsService] Failed to parse AI response:', parseError);
        // Fallback: return empty suggestions rather than throwing
        suggestions = [];
        dependencies = [];
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        action,
        suggestions,
        dependencies,
        metadata: {
          processingTimeMs,
        },
      };
    } catch (error) {
      console.error('[ActionsService] Error in decomposeAction:', error);
      throw new Error(`Failed to decompose action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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