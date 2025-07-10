import { z } from "zod";
import { ActionsService } from "../services/actions";
import { VectorPlacementService } from "../services/vector-placement";
import { ActionSearchService } from "../services/action-search";
import { WorkLogService } from "../services/work-log";
import { getDb } from "../db/adapter";
import { actions, edges, actionDataSchema } from "../../db/schema";
import { eq, and } from "drizzle-orm";

// Helper function to make internal API calls with authentication
async function makeApiCall(endpoint: string, options: RequestInit = {}, authToken?: string, hostHeader?: string) {
  // Use the host header from the current request if available, otherwise fall back to VERCEL_URL
  let baseUrl;
  if (hostHeader) {
    baseUrl = `https://${hostHeader}`;
  } else if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    baseUrl = 'http://localhost:3000';
  }
  
  const url = `${baseUrl}/api${endpoint}`;
  console.log(`Making API call to: ${url}`);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add existing headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  // Add authentication if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    console.log('Adding authentication to API call');
  } else {
    console.log('No authentication token available for API call');
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  console.log(`API response status: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API call failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const errorText = await response.text();
    console.error(`Expected JSON but got: ${contentType}`, errorText);
    throw new Error(`Expected JSON response but got ${contentType}`);
  }
  
  const data = await response.json();
  return data;
}


export function registerTools(server: any) {
  // create_action - Create a new action
  server.tool(
    "create_action",
    "Create a new action in the database with a required family",
    {
      title: z.string().min(1).describe("The title for the action"),
      description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
      vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
      family_id: z.string().uuid().describe("Required family action ID to create a family relationship"),
      depends_on_ids: z.array(z.string().uuid()).optional().describe("Optional array of action IDs that this action depends on"),
      override_duplicate_check: z.boolean().optional().describe("Override duplicate detection check if you intentionally want to create a similar action"),
    },
    async ({ title, description, vision, family_id, depends_on_ids, override_duplicate_check }: { title: string; description?: string; vision?: string; family_id: string; depends_on_ids?: string[]; override_duplicate_check?: boolean }, extra: any) => {
      try {
        console.log(`Creating action with title: ${title}`);
        
        // Validate family_id exists
        const db = getDb();
        const familyAction = await db.select().from(actions).where(eq(actions.id, family_id)).limit(1);
        
        if (familyAction.length === 0) {
          throw new Error(`Family action with ID ${family_id} not found. Use search_actions or work://tree to find a valid family.`);
        }
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.createAction({ 
          title, 
          description, 
          vision, 
          parent_id: family_id, 
          depends_on_ids,
          override_duplicate_check 
        });

        // Check if duplicate warning was returned
        if (result.duplicate_warning) {
          let warningMessage = `⚠️ **Duplicate Detection Warning**\n\n`;
          warningMessage += `${result.duplicate_warning.message}\n\n`;
          warningMessage += `**Potential Duplicates Found:**\n\n`;
          
          result.duplicate_warning.potential_duplicates.forEach((dup, index) => {
            warningMessage += `${index + 1}. **${dup.title}** (${(dup.similarity * 100).toFixed(1)}% similarity)\n`;
            warningMessage += `   ID: ${dup.id}\n`;
            if (dup.description) {
              warningMessage += `   Description: ${dup.description.substring(0, 100)}${dup.description.length > 100 ? '...' : ''}\n`;
            }
            if (dup.path && dup.path.length > 0) {
              warningMessage += `   Path: ${dup.path.join(' → ')}\n`;
            }
            warningMessage += `\n`;
          });
          
          warningMessage += `**Suggestion:** ${result.duplicate_warning.suggestion}`;
          
          return {
            content: [
              {
                type: "text",
                text: warningMessage,
              },
            ],
          };
        }

        const { action, dependencies_count } = result;
        let message = `Created action: ${title}\nID: ${action.id}\nCreated: ${action.createdAt}`;
        
        message += `\nParent: ${family_id}`;
        
        if (dependencies_count > 0) {
          message += `\nDependencies: ${dependencies_count} actions`;
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error creating action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );


  // add_dependency - Create dependency relationship
  server.tool(
    "add_dependency",
    "Create a dependency relationship between two existing actions",
    {
      action_id: z.string().uuid().describe("The ID of the action that depends on another"),
      depends_on_id: z.string().uuid().describe("The ID of the action that must be completed first"),
    },
    async ({ action_id, depends_on_id }: { action_id: string; depends_on_id: string }, extra: any) => {
      try {
        console.log(`Creating dependency: ${action_id} depends on ${depends_on_id}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const edge = await ActionsService.addDependency({ action_id, depends_on_id });

        return {
          content: [
            {
              type: "text",
              text: `Created dependency: ${action_id} depends on ${depends_on_id}\nCreated: ${edge.createdAt}`,
            },
          ],
        };
      } catch (error) {
        console.error('Error creating dependency:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating dependency: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // delete_action - Delete an action
  server.tool(
    "delete_action",
    "Delete an action and handle its children",
    {
      action_id: z.string().uuid().describe("The ID of the action to delete"),
      child_handling: z.enum(["delete_recursive", "reparent"]).default("reparent").describe("How to handle child actions: delete_recursive (delete all children), or reparent (move children to deleted action's parent)"),
      new_parent_id: z.string().uuid().optional().describe("Required if child_handling is 'reparent' - the new parent for orphaned children"),
    },
    async ({ action_id, child_handling, new_parent_id }: { action_id: string; child_handling?: "delete_recursive" | "reparent"; new_parent_id?: string }, extra: any) => {
      try {
        console.log(`Deleting action ${action_id} with child handling: ${child_handling}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.deleteAction({ action_id, child_handling, new_parent_id });

        const { deleted_action, children_count, child_handling: handling, new_parent_id: newParentId } = result;
        let message = `Deleted action: ${deleted_action.data?.title}\nID: ${action_id}`;
        
        if (children_count > 0) {
          message += `\nChildren handled via ${handling}: ${children_count} child actions`;
          if (handling === "reparent" && newParentId) {
            message += `\nNew parent: ${newParentId}`;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error deleting action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error deleting action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // remove_dependency - Remove dependency relationship
  server.tool(
    "remove_dependency",
    "Remove a dependency relationship between two actions",
    {
      action_id: z.string().uuid().describe("The ID of the action that currently depends on another"),
      depends_on_id: z.string().uuid().describe("The ID of the action that the dependency should be removed from"),
    },
    async ({ action_id, depends_on_id }: { action_id: string; depends_on_id: string }, extra: any) => {
      try {
        console.log(`[MCP TOOL] remove_dependency called with action_id: ${action_id}, depends_on_id: ${depends_on_id}`);
        console.log(`[MCP TOOL] Starting dependency removal...`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.removeDependency({ action_id, depends_on_id });
        console.log(`[MCP TOOL] ActionsService.removeDependency completed successfully`);

        const { action, depends_on, deleted_edge } = result;

        const response = {
          content: [
            {
              type: "text",
              text: `Removed dependency: ${action.data?.title} no longer depends on ${depends_on.data?.title}\nRemoved: ${deleted_edge.createdAt}`,
            },
          ],
        };
        
        console.log(`[MCP TOOL] Returning successful response`);
        return response;
      } catch (error) {
        console.error('[MCP TOOL] Error removing dependency:', error);
        const errorResponse = {
          content: [
            {
              type: "text",
              text: `Error removing dependency: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
        console.log(`[MCP TOOL] Returning error response`);
        return errorResponse;
      }
    },
  );

  // update_action - Update an action
  server.tool(
    "update_action",
    "Update an existing action's properties including title and description (use complete_action to mark actions as done)",
    {
      action_id: z.string().uuid().describe("The ID of the action to update"),
      title: z.string().min(1).optional().describe("The new title for the action"),
      description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
      vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
    },
    async ({ action_id, title, description, vision }: { 
      action_id: string; 
      title?: string; 
      description?: string; 
      vision?: string; 
    }, extra: any) => {
      try {
        // Validate that at least one field is provided
        if (title === undefined && description === undefined && vision === undefined) {
          return {
            content: [
              {
                type: "text",
                text: "Error: At least one field (title, description, or vision) must be provided",
              },
            ],
          };
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (vision !== undefined) updateData.vision = vision;
        
        console.log(`Updating action ${action_id} with:`, updateData);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          ...updateData
        });
        let message = `Updated action: ${action.data?.title}\nID: ${action.id}\nUpdated: ${action.updatedAt}`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error updating action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error updating action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // complete_action - Mark an action as completed with objective completion data for server-side editorial generation
  server.tool(
    "complete_action",
    "Mark an action as completed with REQUIRED objective completion data. Provide concrete, factual information about what was changed, accomplished, and challenges encountered. The server will generate editorial content from this objective data combined with hook activity logs.",
    {
      action_id: z.string().uuid().describe("The ID of the action to complete"),
      changelog_visibility: z.enum(["private", "team", "public"]).describe("REQUIRED: Who should see this completion context in changelog generation"),
      
      // Objective technical data (replaces implementation_story)
      technical_changes: z.object({
        files_modified: z.array(z.string()).default([]).describe("List of file paths that were modified (e.g., ['/lib/services/actions.ts', '/db/schema.ts'])"),
        files_created: z.array(z.string()).default([]).describe("List of new file paths that were created (e.g., ['/api/new-endpoint/route.ts'])"),
        functions_added: z.array(z.string()).default([]).describe("List of new function names added (e.g., ['createAction', 'updateMetadata'])"),
        apis_modified: z.array(z.string()).default([]).describe("List of API endpoints modified (e.g., ['/api/actions', '/mcp/tools'])"),
        dependencies_added: z.array(z.string()).default([]).describe("List of new dependencies added with versions (e.g., ['zod@3.22.0', '@vercel/ai@2.1.0'])"),
        config_changes: z.array(z.string()).default([]).describe("List of configuration changes made (e.g., ['Updated eslint.config.js', 'Added DATABASE_URL env var'])"),
      }).describe("Objective technical changes made during implementation"),
      
      // Objective outcomes (replaces impact_story)
      outcomes: z.object({
        features_implemented: z.array(z.string()).default([]).describe("List of user-facing features implemented (e.g., ['User authentication', 'File upload'])"),
        bugs_fixed: z.array(z.string()).default([]).describe("List of specific bugs fixed (e.g., ['Memory leak in upload handler'])"),
        performance_improvements: z.array(z.string()).default([]).describe("List of measurable performance improvements (e.g., ['Query speed improved 40%'])"),
        tests_passing: z.boolean().optional().describe("Whether all tests are passing after completion"),
        build_status: z.enum(["success", "failed", "unknown"]).optional().describe("Final build status"),
      }).describe("Objective outcomes and results achieved"),
      
      // Objective challenges (replaces learning_story)
      challenges: z.object({
        blockers_encountered: z.array(z.string()).default([]).describe("List of blockers encountered (e.g., ['TypeScript compilation errors'])"),
        blockers_resolved: z.array(z.string()).default([]).describe("List of how blockers were resolved (e.g., ['Fixed import path issues'])"),
        approaches_tried: z.array(z.string()).default([]).describe("List of different approaches attempted (e.g., ['Tried Redis first, switched to PGlite'])"),
        discoveries: z.array(z.string()).default([]).describe("List of insights or discoveries made (e.g., ['Found existing util function for validation'])"),
      }).describe("Objective challenges and problem-solving information"),
      
      // Alignment reflection - agent's understanding of purpose fulfillment
      alignment_reflection: z.object({
        purpose_interpretation: z.string().describe("How the agent interpreted the action's goal/vision/description - what did you understand the purpose to be?"),
        goal_achievement_assessment: z.string().describe("Agent's assessment of how well the intended goal was achieved - did you accomplish what was asked?"),
        context_influence: z.string().describe("How family/dependency/project context influenced your approach - what context shaped your decisions?"),
        assumptions_made: z.array(z.string()).default([]).describe("Key assumptions made during implementation that weren't explicitly specified"),
      }).describe("REQUIRED: Agent reflection on purpose understanding and goal alignment for feedback loop"),
      
      // Optional git context information
      git_context: z.object({
        commits: z.array(z.object({
          hash: z.string().optional().describe("SHA hash (optional - might not know yet)"),
          shortHash: z.string().optional().describe("Short SHA (7 chars)"),
          message: z.string().describe("Commit message (required)"),
          author: z.object({
            name: z.string().describe("Author name"),
            email: z.string().optional().describe("Author email"),
            username: z.string().optional().describe("GitHub username")
          }).optional(),
          timestamp: z.string().optional().describe("ISO timestamp"),
          branch: z.string().optional().describe("Branch name"),
          repository: z.string().optional().describe("Repository name/URL"),
          stats: z.object({
            filesChanged: z.number().optional(),
            insertions: z.number().optional(),
            deletions: z.number().optional(),
            files: z.array(z.string()).optional()
          }).optional()
        })).optional().describe("Array of commits associated with this action"),
        pullRequests: z.array(z.object({
          number: z.number().optional().describe("PR number (optional - might not exist yet)"),
          title: z.string().describe("PR title (required)"),
          url: z.string().optional().describe("Full PR URL"),
          repository: z.string().optional().describe("Repository name/URL"),
          author: z.object({
            name: z.string().optional(),
            username: z.string().optional()
          }).optional(),
          state: z.enum(['open', 'closed', 'merged', 'draft']).optional(),
          merged: z.boolean().optional(),
          mergedAt: z.string().optional(),
          branch: z.object({
            head: z.string().describe("Source branch"),
            base: z.string().describe("Target branch")
          }).optional()
        })).optional().describe("Array of pull requests associated with this action"),
        repositories: z.array(z.object({
          name: z.string().describe("Repository name"),
          url: z.string().optional().describe("Repository URL"),
          platform: z.enum(['github', 'gitlab', 'other']).optional()
        })).optional().describe("Repositories involved in this work")
      }).optional().describe("Flexible git context including commits, pull requests, and repository information. Provide whatever information you have available."),
    },
    async ({ action_id, changelog_visibility, technical_changes, outcomes, challenges, alignment_reflection, git_context }: { 
      action_id: string; 
      changelog_visibility: "private" | "team" | "public";
      technical_changes: {
        files_modified: string[];
        files_created: string[];
        functions_added: string[];
        apis_modified: string[];
        dependencies_added: string[];
        config_changes: string[];
      };
      outcomes: {
        features_implemented: string[];
        bugs_fixed: string[];
        performance_improvements: string[];
        tests_passing?: boolean;
        build_status?: "success" | "failed" | "unknown";
      };
      challenges: {
        blockers_encountered: string[];
        blockers_resolved: string[];
        approaches_tried: string[];
        discoveries: string[];
      };
      alignment_reflection: {
        purpose_interpretation: string;
        goal_achievement_assessment: string;
        context_influence: string;
        assumptions_made: string[];
      };
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
    }, extra: any) => {
      try {
        console.log(`Completing action ${action_id} with completion context`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          done: true,
          completion_context: {
            changelog_visibility,
            technical_changes,
            outcomes,
            challenges,
            alignment_reflection,
            git_context
          }
        });
        
        let message = `✅ Completed action: ${action.data?.title}\nID: ${action.id}\nCompleted: ${action.updatedAt}`;
        message += `\n\n📋 Objective Completion Data Captured:`;
        
        // Technical changes summary
        const totalTechnicalChanges = technical_changes.files_modified.length + 
                                    technical_changes.files_created.length + 
                                    technical_changes.functions_added.length + 
                                    technical_changes.apis_modified.length + 
                                    technical_changes.dependencies_added.length + 
                                    technical_changes.config_changes.length;
        message += `\n• Technical Changes: ${totalTechnicalChanges} items`;
        if (technical_changes.files_modified.length > 0) message += ` (${technical_changes.files_modified.length} files modified)`;
        if (technical_changes.files_created.length > 0) message += ` (${technical_changes.files_created.length} files created)`;
        
        // Outcomes summary
        const totalOutcomes = outcomes.features_implemented.length + 
                            outcomes.bugs_fixed.length + 
                            outcomes.performance_improvements.length;
        message += `\n• Outcomes: ${totalOutcomes} achievements`;
        if (outcomes.features_implemented.length > 0) message += ` (${outcomes.features_implemented.length} features)`;
        if (outcomes.bugs_fixed.length > 0) message += ` (${outcomes.bugs_fixed.length} bugs fixed)`;
        if (outcomes.tests_passing !== undefined) message += ` (tests: ${outcomes.tests_passing ? 'passing' : 'failing'})`;
        
        // Challenges summary
        const totalChallenges = challenges.blockers_encountered.length + 
                              challenges.approaches_tried.length + 
                              challenges.discoveries.length;
        message += `\n• Challenges: ${totalChallenges} items documented`;
        if (challenges.blockers_encountered.length > 0) message += ` (${challenges.blockers_encountered.length} blockers)`;
        if (challenges.discoveries.length > 0) message += ` (${challenges.discoveries.length} discoveries)`;
        
        message += `\n• Visibility: ${changelog_visibility}`;
        
        // Alignment reflection summary
        message += `\n\n🎯 Alignment Reflection:`;
        message += `\n• Purpose: ${alignment_reflection.purpose_interpretation.substring(0, 80)}${alignment_reflection.purpose_interpretation.length > 80 ? '...' : ''}`;
        message += `\n• Achievement: ${alignment_reflection.goal_achievement_assessment.substring(0, 80)}${alignment_reflection.goal_achievement_assessment.length > 80 ? '...' : ''}`;
        if (alignment_reflection.assumptions_made.length > 0) message += `\n• Assumptions: ${alignment_reflection.assumptions_made.length} documented`;
        
        if (git_context?.commits && git_context.commits.length > 0) {
          message += `\n\n🔗 Git Information:`;
          git_context.commits.forEach((commit, index) => {
            if (index < 3) { // Show up to 3 commits in summary
              if (commit.hash) message += `\n• Commit: ${commit.shortHash || commit.hash.substring(0, 7)}`;
              message += `\n  ${commit.message.substring(0, 50)}${commit.message.length > 50 ? '...' : ''}`;
              if (commit.branch) message += `\n  Branch: ${commit.branch}`;
              if (commit.author) message += `\n  Author: ${commit.author.name}`;
            }
          });
          if (git_context.commits.length > 3) {
            message += `\n• ...and ${git_context.commits.length - 3} more commit${git_context.commits.length - 3 === 1 ? '' : 's'}`;
          }
          if (git_context.pullRequests && git_context.pullRequests.length > 0) {
            message += `\n• Pull Requests: ${git_context.pullRequests.length}`;
          }
        }
        
        message += `\n\n🤖 Server will generate editorial content from this objective data combined with hook activity logs.`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error completing action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error completing action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // uncomplete_action - Mark a completed action as incomplete again
  server.tool(
    "uncomplete_action",
    "Mark a completed action as incomplete again (reopens action for further work)",
    {
      action_id: z.string().uuid().describe("The ID of the completed action to reopen"),
    },
    async ({ action_id }: { action_id: string }, extra: any) => {
      try {
        console.log(`Uncompleting action ${action_id}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          done: false
        });
        
        let message = `🔄 Reopened action: ${action.data?.title}\nID: ${action.id}\nReopened: ${action.updatedAt}`;
        message += `\n\nAction is now available for further work. Previous completion context is preserved.`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error uncompleting action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error uncompleting action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // join_family - Update an action's family relationship
  server.tool(
    "join_family",
    "Update an action's family relationship by having it join a new family or making it independent",
    {
      action_id: z.string().uuid().describe("The ID of the action to move"),
      new_family_id: z.string().uuid().optional().describe("The ID of the new family action to join, or omit to make this an independent action"),
    },
    async ({ action_id, new_family_id }: { action_id: string; new_family_id?: string }, extra: any) => {
      try {
        console.log(`Updating family for action ${action_id} to family ${new_family_id || 'none (independent action)'}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.updateFamily({
          action_id,
          new_family_id: new_family_id
        });
        
        let message = `Updated family relationship for action: ${action_id}`;
        if (new_family_id) {
          message += `\nJoined family: ${new_family_id}`;
        } else {
          message += `\nAction is now independent (no family)`;
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error updating family:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error updating family: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );


  // search_actions - Search for actions using vector embeddings and keyword matching
  server.tool(
    "search_actions",
    "Search for actions using vector embeddings, keyword matching, or ID-based relationship search. When query is a UUID, returns the target action plus all related actions (dependencies, dependents, family members). For text queries, uses semantic similarity and keyword matching.",
    {
      query: z.string().min(1).describe("Search query - can be keywords, phrases, or natural language description of what you're looking for"),
      limit: z.number().min(1).max(50).default(10).optional().describe("Maximum number of results to return (default: 10)"),
      search_mode: z.enum(["vector", "keyword", "hybrid"]).default("hybrid").optional().describe("Search mode: 'vector' for semantic similarity, 'keyword' for exact/fuzzy text matching, 'hybrid' for both (default: hybrid)"),
      similarity_threshold: z.number().min(0).max(1).default(0.3).optional().describe("Minimum similarity threshold for vector search (0-1, default: 0.3). Lower values = more results"),
      include_completed: z.boolean().default(false).optional().describe("Include completed actions in results (default: false)"),
      exclude_ids: z.array(z.string().uuid()).optional().describe("Action IDs to exclude from search results"),
    },
    async ({ query, limit = 10, search_mode = "hybrid", similarity_threshold = 0.3, include_completed = false, exclude_ids = [] }: { 
      query: string; 
      limit?: number; 
      search_mode?: "vector" | "keyword" | "hybrid";
      similarity_threshold?: number;
      include_completed?: boolean;
      exclude_ids?: string[];
    }, extra: any) => {
      try {
        console.log(`[MCP search_actions] Searching for: "${query}" (mode: ${search_mode})`);
        
        const searchResult = await ActionSearchService.searchActions(query, {
          limit,
          similarityThreshold: similarity_threshold,
          includeCompleted: include_completed,
          searchMode: search_mode,
          excludeIds: exclude_ids
        });

        let message = `🔍 **Search Results for:** "${query}"\n`;
        
        // Special handling for ID-based searches
        if (searchResult.searchMode === 'id-based') {
          message += `🎯 **Mode:** ID-based relationship search\n`;
          message += `⚡ **Performance:** ${searchResult.metadata.processingTimeMs.toFixed(1)}ms total\n`;
          
          if (searchResult.results.length > 0) {
            message += `📊 **Found:** Action and ${searchResult.totalMatches - 1} related actions\n\n`;
            message += `✅ **Action and Relationships:**\n\n`;
            
            searchResult.results.forEach((result, index) => {
              const isTarget = result.keywordMatches?.includes('TARGET ACTION');
              const relationship = result.keywordMatches?.[0] || 'RELATED';
              
              let relationshipIcon = '🔗';
              if (isTarget) relationshipIcon = '🎯';
              else if (relationship === 'PARENT') relationshipIcon = '⬆️';
              else if (relationship === 'CHILD') relationshipIcon = '⬇️';
              else if (relationship === 'SIBLING') relationshipIcon = '↔️';
              else if (relationship === 'DEPENDS ON TARGET') relationshipIcon = '📨';
              else if (relationship === 'TARGET DEPENDS ON') relationshipIcon = '📩';
              
              message += `${index + 1}. ${relationshipIcon} **${result.title}**${result.done ? ' ✅' : ''}\n`;
              message += `   ID: ${result.id}\n`;
              message += `   Relationship: ${relationship}\n`;
              
              if (result.description) {
                message += `   Description: ${result.description.substring(0, 100)}${result.description.length > 100 ? '...' : ''}\n`;
              }
              
              if (result.hierarchyPath && result.hierarchyPath.length > 1) {
                message += `   Path: ${result.hierarchyPath.join(' → ')}\n`;
              }
              
              message += `\n`;
            });
          } else {
            message += `❌ **Action not found** - ID "${query}" does not exist\n`;
          }
        } else {
          // Regular search mode formatting
          message += `🎯 **Mode:** ${search_mode} search\n`;
          message += `⚡ **Performance:** ${searchResult.metadata.processingTimeMs.toFixed(1)}ms total`;
          
          if (searchResult.metadata.embeddingTimeMs) {
            message += ` (${searchResult.metadata.embeddingTimeMs.toFixed(1)}ms embedding, ${searchResult.metadata.searchTimeMs.toFixed(1)}ms search)`;
          } else {
            message += ` (${searchResult.metadata.searchTimeMs.toFixed(1)}ms search)`;
          }
          message += `\n`;
          
          message += `📊 **Found:** ${searchResult.totalMatches} result${searchResult.totalMatches !== 1 ? 's' : ''}`;
          if (searchResult.metadata.vectorMatches > 0 || searchResult.metadata.keywordMatches > 0) {
            message += ` (${searchResult.metadata.vectorMatches} vector, ${searchResult.metadata.keywordMatches} keyword, ${searchResult.metadata.hybridMatches} hybrid)`;
          }
          message += `\n\n`;
          
          if (searchResult.results.length > 0) {
            message += `✅ **Results:**\n\n`;
            
            searchResult.results.forEach((result, index) => {
              const matchIcon = result.matchType === 'vector' ? '🧠' : result.matchType === 'keyword' ? '🔤' : '🎯';
              const scoreDisplay = result.matchType === 'vector' ? 
                `${(result.similarity! * 100).toFixed(1)}% similarity` : 
                `score: ${result.score.toFixed(2)}`;
              
              message += `${index + 1}. ${matchIcon} **${result.title}** (${scoreDisplay})${result.done ? ' ✅' : ''}\n`;
              message += `   ID: ${result.id}\n`;
              
              if (result.description) {
                message += `   Description: ${result.description.substring(0, 100)}${result.description.length > 100 ? '...' : ''}\n`;
              }
              
              if (result.keywordMatches && result.keywordMatches.length > 0) {
                message += `   Keywords: ${result.keywordMatches.join(', ')}\n`;
              }
              
              if (result.hierarchyPath && result.hierarchyPath.length > 1) {
                message += `   Path: ${result.hierarchyPath.join(' → ')}\n`;
              }
              
              message += `   ${result.matchType} match\n`;
              message += `\n`;
            });
          } else {
            message += `❌ **No results found**\n`;
            message += `   Try:\n`;
            message += `   • Different keywords or phrases\n`;
            message += `   • Lower similarity threshold (current: ${similarity_threshold})\n`;
            message += `   • Including completed actions (--include_completed=true)\n`;
            message += `   • Different search mode (vector, keyword, or hybrid)\n`;
          }
        }
        
        // Add top result summary for regular searches
        if (searchResult.searchMode !== 'id-based' && searchResult.results.length > 0) {
          const topResult = searchResult.results[0];
          message += `🏆 **Top Result:** "${topResult.title}" (ID: ${topResult.id})\n`;
          message += `📈 **Best Match:** ${topResult.matchType} search with `;
          if (topResult.matchType === 'vector') {
            message += `${(topResult.similarity! * 100).toFixed(1)}% semantic similarity`;
          } else {
            message += `score ${topResult.score.toFixed(2)}`;
          }
        }
        
        message += `\n\n🧠 **Powered by:** OpenAI embeddings + PostgreSQL pgvector + fuzzy text matching`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('[MCP search_actions] Search failed:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error searching actions: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // log_work - Add entry to work log
  server.tool(
    "log_work",
    "Add an entry to the work log to track agent activity and collaboration",
    {
      content: z.string().min(1).describe("Rich narrative description of the work activity, including action IDs, blockers, discoveries, handoffs, etc."),
      metadata: z.record(z.any()).optional().describe("Optional structured metadata like agent_id, action_ids, event_type, etc."),
    },
    async ({ content, metadata }: { content: string; metadata?: Record<string, any> }, extra: any) => {
      try {
        console.log(`Adding work log entry: ${content.substring(0, 100)}...`);
        
        const entry = await WorkLogService.addEntry({
          content,
          metadata,
        });

        return {
          content: [
            {
              type: "text",
              text: `Added work log entry\nID: ${entry.id}\nTimestamp: ${entry.timestamp}\nContent: ${content}`,
            },
          ],
        };
      } catch (error) {
        console.error('Error adding work log entry:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error adding work log entry: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // get_work_log - Retrieve recent work log entries
  server.tool(
    "get_work_log",
    "Get recent work log entries to understand current activity and context",
    {
      limit: z.number().min(1).max(100).optional().describe("Number of entries to retrieve (default: 20)"),
      search: z.string().optional().describe("Search term to filter entries by content"),
      agent_id: z.string().optional().describe("Filter entries by specific agent ID"),
    },
    async ({ limit = 20, search, agent_id }: { limit?: number; search?: string; agent_id?: string }, extra: any) => {
      try {
        console.log(`Retrieving work log entries: limit=${limit}, search=${search}, agent_id=${agent_id}`);
        
        let entries;
        if (search) {
          entries = await WorkLogService.searchEntries(search, limit);
        } else if (agent_id) {
          entries = await WorkLogService.getEntriesByAgent(agent_id, limit);
        } else {
          entries = await WorkLogService.getRecentEntries(limit);
        }

        let message = `📋 **Work Log Entries** (${entries.length} found)\n\n`;
        
        if (entries.length === 0) {
          message += "No work log entries found.";
        } else {
          entries.forEach((entry, index) => {
            const timeAgo = new Date(Date.now() - entry.timestamp.getTime()).toISOString().substring(11, 19);
            message += `**${index + 1}.** ${entry.content}\n`;
            message += `   Time: ${entry.timestamp.toISOString()}\n`;
            message += `   ID: ${entry.id}\n`;
            if (entry.metadata && Object.keys(entry.metadata).length > 0) {
              message += `   Metadata: ${JSON.stringify(entry.metadata)}\n`;
            }
            message += `\n`;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error retrieving work log entries:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving work log entries: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // get_action_work_log - Get work log entries for a specific action
  server.tool(
    "get_action_work_log",
    "Get work log entries related to a specific action",
    {
      action_id: z.string().uuid().describe("ID of the action to get work log for"),
      limit: z.number().min(1).max(50).optional().describe("Number of entries to retrieve (default: 10)"),
    },
    async ({ action_id, limit = 10 }: { action_id: string; limit?: number }, extra: any) => {
      try {
        console.log(`Getting work log for action: ${action_id}`);
        
        const entries = await WorkLogService.getEntriesForAction(action_id, limit);

        let message = `📋 **Work Log for Action ${action_id}** (${entries.length} entries)\n\n`;
        
        if (entries.length === 0) {
          message += "No work log entries found for this action.";
        } else {
          entries.forEach((entry, index) => {
            message += `**${index + 1}.** ${entry.content}\n`;
            message += `   Time: ${entry.timestamp.toISOString()}\n`;
            message += `   ID: ${entry.id}\n`;
            if (entry.metadata && Object.keys(entry.metadata).length > 0) {
              message += `   Metadata: ${JSON.stringify(entry.metadata)}\n`;
            }
            message += `\n`;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error getting action work log:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting action work log: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // suggest_parent - Get multiple parent suggestions with confidence scores
  server.tool(
    "suggest_parent",
    "Get multiple parent suggestions with confidence scores for placing a new action in the hierarchy",
    {
      title: z.string().min(1).describe("Title of the action to place"),
      description: z.string().optional().describe("Description of the action to place"),
      limit: z.number().min(1).max(10).default(5).optional().describe("Maximum number of suggestions to return (default: 5)"),
      confidence_threshold: z.number().min(0).max(100).default(40).optional().describe("Minimum confidence threshold for suggestions (0-100, default: 40)"),
      include_create_new: z.boolean().default(true).optional().describe("Whether to include 'create new parent' suggestions (default: true)"),
    },
    async ({ title, description, limit = 5, confidence_threshold = 40, include_create_new = true }: { 
      title: string; 
      description?: string; 
      limit?: number; 
      confidence_threshold?: number; 
      include_create_new?: boolean; 
    }, extra: any) => {
      try {
        console.log(`[MCP suggest_parent] Getting parent suggestions for: "${title}"`);
        
        const { ParentSuggestionService } = await import('../services/parent-suggestion');
        
        const result = await ParentSuggestionService.suggestParents({
          title,
          description
        }, {
          limit,
          confidenceThreshold: confidence_threshold,
          includeCreateNew: include_create_new
        });

        let message = `🎯 **Parent Suggestions for:** "${title}"\n`;
        message += `⚡ **Performance:** ${result.metadata.totalProcessingTimeMs.toFixed(1)}ms total (${result.metadata.vectorTimeMs.toFixed(1)}ms vector, ${result.metadata.classificationTimeMs.toFixed(1)}ms classification)\n`;
        message += `📊 **Found:** ${result.suggestions.length} suggestion${result.suggestions.length !== 1 ? 's' : ''}\n\n`;

        if (result.suggestions.length === 0) {
          message += `❌ **No suitable parents found**\n`;
          message += `   Try:\n`;
          message += `   • Lower confidence threshold (current: ${confidence_threshold})\n`;
          message += `   • Enable create new parent suggestions\n`;
          message += `   • Provide more detailed description\n`;
        } else {
          message += `✅ **Suggestions:**\n\n`;
          
          result.suggestions.forEach((suggestion, index) => {
            const sourceIcon = suggestion.source === 'vector' ? '🧠' : 
                             suggestion.source === 'classification' ? '🤖' : '✨';
            const confidenceBar = '█'.repeat(Math.floor(suggestion.confidence / 10)) + 
                                '░'.repeat(10 - Math.floor(suggestion.confidence / 10));
            
            message += `${index + 1}. ${sourceIcon} **${suggestion.title}** (${suggestion.confidence}% confidence)\n`;
            message += `   ${confidenceBar} ${suggestion.confidence}/100\n`;
            message += `   ID: ${suggestion.id}\n`;
            
            if (suggestion.description) {
              message += `   Description: ${suggestion.description.substring(0, 100)}${suggestion.description.length > 100 ? '...' : ''}\n`;
            }
            
            message += `   Path: ${suggestion.hierarchyPath.join(' → ')}\n`;
            message += `   Source: ${suggestion.source} search\n`;
            message += `   Reasoning: ${suggestion.reasoning}\n`;
            
            if (suggestion.canCreateNewParent) {
              message += `   🆕 **This will create a new parent category**\n`;
            }
            
            message += `\n`;
          });
          
          // Add usage instructions
          message += `📝 **Usage Instructions:**\n`;
          message += `• Use the ID from your preferred suggestion as family_id in create_action\n`;
          message += `• For 'CREATE_NEW_PARENT' suggestions, create the parent action first\n`;
          message += `• Higher confidence scores indicate better semantic fit\n`;
          message += `• Consider the hierarchy path when choosing placement\n`;
        }

        message += `\n🔬 **Powered by:** Vector embeddings + AI classification`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('[MCP suggest_parent] Error:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting parent suggestions: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // decompose_action - Get suggestions for decomposing an action into child actions
  server.tool(
    "decompose_action",
    "Get AI-powered suggestions for decomposing an action into smaller child actions",
    {
      action_id: z.string().uuid().describe("The ID of the action to decompose"),
      max_suggestions: z.number().min(1).max(10).optional().default(5).describe("Maximum number of child action suggestions to return (default: 5)"),
      include_reasoning: z.boolean().optional().default(true).describe("Whether to include reasoning for each suggestion (default: true)"),
    },
    async ({ action_id, max_suggestions = 5, include_reasoning = true }: { 
      action_id: string; 
      max_suggestions?: number; 
      include_reasoning?: boolean; 
    }, extra: any) => {
      try {
        console.log(`[MCP decompose_action] Decomposing action: ${action_id}`);
        
        // Validate action exists
        const db = getDb();
        const actionResult = await db.select().from(actions).where(eq(actions.id, action_id)).limit(1);
        
        if (actionResult.length === 0) {
          throw new Error(`Action with ID ${action_id} not found. Use search_actions to find a valid action.`);
        }
        
        const action = actionResult[0];
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.decomposeAction({ 
          action_id,
          max_suggestions,
          include_reasoning
        });

        let message = `🔍 **Decomposition Suggestions for:** "${action.data?.title}"\n`;
        message += `📋 **Action ID:** ${action_id}\n`;
        message += `⚡ **Performance:** ${result.metadata.processingTimeMs.toFixed(1)}ms total\n`;
        message += `📊 **Generated:** ${result.suggestions.length} suggestion${result.suggestions.length !== 1 ? 's' : ''} with ${result.dependencies.length} dependenc${result.dependencies.length !== 1 ? 'ies' : 'y'}\n\n`;

        if (result.suggestions.length === 0) {
          message += `❌ **No decomposition suggestions generated**\n`;
          message += `   This could mean:\n`;
          message += `   • The action is already specific enough\n`;
          message += `   • The action description needs more detail\n`;
          message += `   • Try providing more context in the action description\n`;
        } else {
          message += `✅ **Suggested Child Actions:**\n\n`;
          
          result.suggestions.forEach((suggestion) => {
            const confidenceBar = '█'.repeat(Math.floor(suggestion.confidence * 10)) + 
                                '░'.repeat(10 - Math.floor(suggestion.confidence * 10));
            
            message += `${suggestion.index}. 📝 **${suggestion.title}** (${Math.round(suggestion.confidence * 100)}% confidence)\n`;
            message += `   ${confidenceBar} ${Math.round(suggestion.confidence * 100)}/100\n`;
            
            if (suggestion.description) {
              message += `   📄 Description: ${suggestion.description}\n`;
            }
            
            if (include_reasoning && suggestion.reasoning) {
              message += `   🤔 Reasoning: ${suggestion.reasoning}\n`;
            }
            
            message += `\n`;
          });
          
          // Add dependency information
          if (result.dependencies.length > 0) {
            message += `🔗 **Suggested Dependencies:**\n\n`;
            
            result.dependencies.forEach((dependency, index) => {
              const dependentAction = result.suggestions.find(s => s.index === dependency.dependent_index);
              const dependsOnAction = result.suggestions.find(s => s.index === dependency.depends_on_index);
              
              if (dependentAction && dependsOnAction) {
                message += `${index + 1}. **${dependentAction.title}** depends on **${dependsOnAction.title}**\n`;
                message += `   📩 ${dependency.depends_on_index} → ${dependency.dependent_index}\n`;
                
                if (include_reasoning && dependency.reasoning) {
                  message += `   🤔 Reasoning: ${dependency.reasoning}\n`;
                }
                message += `\n`;
              }
            });
          } else {
            message += `🔗 **Dependencies:** No dependencies suggested (actions can be executed in parallel)\n\n`;
          }
          
          // Add usage instructions
          message += `📝 **Usage Instructions:**\n`;
          message += `• Use create_action with family_id=${action_id} to create these child actions\n`;
          message += `• After creating actions, use add_dependency to set up the dependency relationships\n`;
          message += `• Higher confidence scores indicate better decomposition fit\n`;
          message += `• Dependencies ensure proper execution order - complete prerequisite actions first\n`;
          message += `• You can modify the suggested titles, descriptions, and dependencies as needed\n`;
        }

        message += `\n🤖 **Powered by:** AI-driven task decomposition analysis`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('[MCP decompose_action] Error:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error decomposing action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );


}

export const toolCapabilities = {
  create_action: {
    description: "Create a new action in the database with a required family",
  },
  add_dependency: {
    description: "Create a dependency relationship between two existing actions",
  },
  delete_action: {
    description: "Delete an action and handle its children",
  },
  remove_dependency: {
    description: "Remove a dependency relationship between two actions",
  },
  update_action: {
    description: "Update an existing action's properties including title and description (use complete_action to mark actions as done)",
  },
  complete_action: {
    description: "Mark an action as completed with required completion context for dynamic changelog generation. ALL parameters are required including editorial content (headline, deck, pull_quotes). Use measured, analytical language similar to The Economist or scientific journals.",
  },
  uncomplete_action: {
    description: "Mark a completed action as incomplete again (reopens action for further work)",
  },
  join_family: {
    description: "Update an action's family relationship by having it join a new family or making it independent",
  },
  search_actions: {
    description: "Search for actions using vector embeddings, keyword matching, or ID-based relationship search. When query is a UUID, returns the target action plus all related actions (dependencies, dependents, family members). For text queries, uses semantic similarity and keyword matching.",
  },
  log_work: {
    description: "Add an entry to the work log to track agent activity and collaboration",
  },
  get_work_log: {
    description: "Get recent work log entries to understand current activity and context",
  },
  get_action_work_log: {
    description: "Get work log entries related to a specific action",
  },
  suggest_parent: {
    description: "Get multiple parent suggestions with confidence scores for placing a new action in the hierarchy",
  },
  decompose_action: {
    description: "Get AI-powered suggestions for decomposing an action into smaller child actions",
  },
};