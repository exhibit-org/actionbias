import { z } from "zod";
import { ActionsService } from "../services/actions";
import { VectorPlacementService } from "../services/vector-placement";
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
    "Create a new action in the database with optional parent and dependencies",
    {
      title: z.string().min(1).describe("The title for the action"),
      description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
      vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
      parent_id: z.string().uuid().optional().describe("Optional parent action ID to create a child relationship"),
      depends_on_ids: z.array(z.string().uuid()).optional().describe("Optional array of action IDs that this action depends on"),
    },
    async ({ title, description, vision, parent_id, depends_on_ids }: { title: string; description?: string; vision?: string; parent_id?: string; depends_on_ids?: string[] }, extra: any) => {
      try {
        console.log(`Creating action with title: ${title}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.createAction({ title, description, vision, parent_id, depends_on_ids });

        const { action, dependencies_count } = result;
        let message = `Created action: ${title}\nID: ${action.id}\nCreated: ${action.createdAt}`;
        
        if (parent_id) {
          message += `\nParent: ${parent_id}`;
        }
        
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
        console.log(`Removing dependency: ${action_id} no longer depends on ${depends_on_id}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.removeDependency({ action_id, depends_on_id });

        const { action, depends_on, deleted_edge } = result;

        return {
          content: [
            {
              type: "text",
              text: `Removed dependency: ${action.data?.title} no longer depends on ${depends_on.data?.title}\nRemoved: ${deleted_edge.createdAt}`,
            },
          ],
        };
      } catch (error) {
        console.error('Error removing dependency:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error removing dependency: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
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

  // complete_action - Mark an action as completed with required completion context
  server.tool(
    "complete_action",
    "Mark an action as completed with required completion context for dynamic changelog generation",
    {
      action_id: z.string().uuid().describe("The ID of the action to complete"),
      implementation_story: z.string().min(1).describe("How was this action implemented? What approach was taken, what tools were used, what challenges were overcome? Supports markdown formatting."),
      impact_story: z.string().min(1).describe("What was accomplished by completing this action? What impact did it have on the project or users? Supports markdown formatting."),
      learning_story: z.string().min(1).describe("What insights were gained? What worked well or poorly? What would be done differently? Supports markdown formatting."),
      changelog_visibility: z.enum(["private", "team", "public"]).default("team").describe("Who should see this completion context in changelog generation (default: 'team')"),
    },
    async ({ action_id, implementation_story, impact_story, learning_story, changelog_visibility }: { 
      action_id: string; 
      implementation_story: string;
      impact_story: string;
      learning_story: string;
      changelog_visibility: "private" | "team" | "public";
    }, extra: any) => {
      try {
        console.log(`Completing action ${action_id} with completion context`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          done: true,
          completion_context: {
            implementation_story,
            impact_story,
            learning_story,
            changelog_visibility
          }
        });
        
        let message = `✅ Completed action: ${action.data?.title}\nID: ${action.id}\nCompleted: ${action.updatedAt}`;
        message += `\n\n📋 Completion Context Captured:`;
        message += `\n• Implementation: ${implementation_story.substring(0, 100)}${implementation_story.length > 100 ? '...' : ''}`;
        message += `\n• Impact: ${impact_story.substring(0, 100)}${impact_story.length > 100 ? '...' : ''}`;
        message += `\n• Learning: ${learning_story.substring(0, 100)}${learning_story.length > 100 ? '...' : ''}`;
        message += `\n• Visibility: ${changelog_visibility}`;

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

  // update_parent - Update an action's parent relationship
  server.tool(
    "update_parent",
    "Update an action's parent relationship by moving it under a new parent or making it a root action",
    {
      action_id: z.string().uuid().describe("The ID of the action to reparent"),
      new_parent_id: z.string().uuid().optional().describe("The ID of the new parent action, or omit to make this a root action"),
    },
    async ({ action_id, new_parent_id }: { action_id: string; new_parent_id?: string }, extra: any) => {
      try {
        console.log(`Updating parent for action ${action_id} to parent ${new_parent_id || 'none (root action)'}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.updateParent({
          action_id,
          new_parent_id
        });
        
        let message = `Updated parent relationship for action: ${action_id}`;
        if (new_parent_id) {
          message += `\nNew parent: ${new_parent_id}`;
        } else {
          message += `\nAction is now a root action (no parent)`;
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
        console.error('Error updating parent:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error updating parent: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // suggest_parent - Get intelligent placement suggestion for a new action
  server.tool(
    "suggest_parent",
    "Get an intelligent placement suggestion for a new action using vector similarity search",
    {
      title: z.string().min(1).describe("The title for the new action"),
      description: z.string().optional().describe("Detailed description of what the action involves"),
      vision: z.string().optional().describe("The desired outcome when the action is complete"),
      action_id: z.string().uuid().optional().describe("Optional action ID to exclude from suggestions (for existing actions)"),
      similarity_threshold: z.number().min(0).max(1).default(0.5).optional().describe("Minimum similarity threshold for vector matching (0-1, default: 0.5). Higher values = stricter matching"),
      limit: z.number().min(1).max(20).default(10).optional().describe("Maximum number of parent suggestions to return (default: 10)"),
    },
    async ({ title, description, vision, action_id, similarity_threshold = 0.5, limit = 10 }: { 
      title: string; 
      description?: string; 
      vision?: string; 
      action_id?: string;
      similarity_threshold?: number;
      limit?: number;
    }, extra: any) => {
      try {
        console.log(`Getting vector-based placement suggestion for action: ${title}`);
        
        // Use VectorPlacementService to find parent suggestions
        const excludeIds = action_id ? [action_id] : [];
        const vectorResult = await VectorPlacementService.findVectorParentSuggestions(
          { title, description, vision },
          {
            limit,
            similarityThreshold: similarity_threshold,
            excludeIds,
            includeHierarchyPaths: true
          }
        );
        
        // Debug logging for MCP tool
        console.log('MCP suggest_parent debug:', {
          vectorResultType: typeof vectorResult,
          vectorResultKeys: Object.keys(vectorResult || {}),
          candidatesType: typeof vectorResult?.candidates,
          candidatesIsArray: Array.isArray(vectorResult?.candidates),
          candidatesLength: vectorResult?.candidates?.length,
          vectorResult: vectorResult
        });
        
        // Safety check for vectorResult structure
        if (!vectorResult || !vectorResult.candidates || !Array.isArray(vectorResult.candidates)) {
          console.error('Invalid vectorResult structure:', vectorResult);
          return {
            content: [
              {
                type: "text",
                text: `Error: Invalid response from vector placement service. vectorResult: ${JSON.stringify(vectorResult)}`,
              },
            ],
          };
        }
        
        let message = `🔍 **Vector-Based Placement Analysis for:** "${title}"\n`;
        message += `⚡ **Performance:** ${vectorResult.totalProcessingTimeMs.toFixed(1)}ms total (${vectorResult.embeddingTimeMs.toFixed(1)}ms embedding, ${vectorResult.searchTimeMs.toFixed(1)}ms search)\n`;
        message += `🎛️ **Threshold:** Similarity ≥ ${similarity_threshold}\n\n`;
        
        if (vectorResult.candidates.length > 0) {
          message += `✅ **Found ${vectorResult.candidates.length} Similar Parent Candidates:**\n\n`;
          
          vectorResult.candidates.forEach((candidate, index) => {
            message += `${index + 1}. **${candidate.title}** (${(candidate.similarity * 100).toFixed(1)}% match)\n`;
            message += `   ID: ${candidate.id}\n`;
            if (candidate.description) {
              message += `   Description: ${candidate.description.substring(0, 100)}${candidate.description.length > 100 ? '...' : ''}\n`;
            }
            message += `   Hierarchy: ${candidate.hierarchyPath.join(' → ')}\n`;
            message += `   Depth: ${candidate.depth} level${candidate.depth !== 1 ? 's' : ''}\n\n`;
          });
          
          const bestCandidate = vectorResult.candidates[0];
          message += `🏆 **Top Recommendation:** Use "${bestCandidate.title}" (ID: ${bestCandidate.id}) as parent\n`;
          message += `📊 **Match Quality:** ${(bestCandidate.similarity * 100).toFixed(1)}% semantic similarity\n`;
        } else {
          message += `❌ **No similar parent actions found**\n`;
          message += `   No existing actions meet the ${(similarity_threshold * 100).toFixed(0)}% similarity threshold\n`;
          message += `💡 **Suggestion:** This action should be created as a root-level action\n`;
          message += `   or consider lowering the similarity threshold to see more options.\n`;
        }
        
        message += `\n🧠 **Powered by:** Vector embeddings with PostgreSQL pgvector similarity search`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error getting vector placement suggestion:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting placement suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

}

export const toolCapabilities = {
  create_action: {
    description: "Create a new action in the database with optional parent and dependencies",
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
    description: "Mark an action as completed with required completion context for dynamic changelog generation",
  },
  uncomplete_action: {
    description: "Mark a completed action as incomplete again (reopens action for further work)",
  },
  update_parent: {
    description: "Update an action's parent relationship by moving it under a new parent or making it a root action",
  },
  suggest_parent: {
    description: "Get an intelligent placement suggestion for a new action using vector similarity search",
  },
};