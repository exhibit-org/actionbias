import { z } from "zod";
import { ActionsService } from "../services/actions";
import { PlacementService } from "../services/placement";
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
    "Update an existing action's properties including title and completion status",
    {
      action_id: z.string().uuid().describe("The ID of the action to update"),
      title: z.string().min(1).optional().describe("The new title for the action"),
      description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
      vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
      done: z.boolean().optional().describe("Whether the action is completed (true) or not (false)"),
    },
    async ({ action_id, title, description, vision, done }: { action_id: string; title?: string; description?: string; vision?: string; done?: boolean }, extra: any) => {
      try {
        // Validate that at least one field is provided
        if (title === undefined && description === undefined && vision === undefined && done === undefined) {
          return {
            content: [
              {
                type: "text",
                text: "Error: At least one field (title, description, vision, or done) must be provided",
              },
            ],
          };
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (vision !== undefined) updateData.vision = vision;
        if (done !== undefined) updateData.done = done;
        
        console.log(`Updating action ${action_id} with:`, updateData);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          ...updateData
        });
        let message = `Updated action: ${action.data?.title}\nID: ${action.id}\nUpdated: ${action.updatedAt}`;
        
        if (done !== undefined) {
          message += `\nStatus: ${done ? 'Completed' : 'Not completed'}`;
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
    "Get an intelligent placement suggestion for a new action using semantic analysis",
    {
      title: z.string().min(1).describe("The title for the new action"),
      description: z.string().optional().describe("Detailed description of what the action involves"),
      vision: z.string().optional().describe("The desired outcome when the action is complete"),
      confidence_threshold: z.number().min(0).max(1).default(0.3).optional().describe("Minimum confidence threshold for accepting parent suggestions (0-1, default: 0.3). Lower values = more suggestions"),
      similarity_threshold: z.number().min(0).max(1).default(0.7).optional().describe("Minimum similarity threshold for vector matching (0-1, default: 0.7). Higher values = stricter matching"),
    },
    async ({ title, description, vision, confidence_threshold = 0.3, similarity_threshold = 0.7 }: { 
      title: string; 
      description?: string; 
      vision?: string; 
      confidence_threshold?: number;
      similarity_threshold?: number;
    }, extra: any) => {
      try {
        console.log(`Getting placement suggestion for action: ${title}`);
        
        // Get all existing actions to use as placement candidates (exclude completed actions)
        const existingActions = await ActionsService.listActions({ done: false });
        
        // Convert to the format expected by PlacementService
        const hierarchyItems = existingActions.map((action: any) => ({
          id: action.id,
          title: action.data?.title || '',
          description: action.data?.description,
          vision: action.data?.vision,
          parentId: action.data?.parent_id
        }));
        
        // Get placement suggestion
        const placementResult = await PlacementService.findBestParent(
          { title, description, vision },
          hierarchyItems,
          { confidenceThreshold: confidence_threshold, similarityThreshold: similarity_threshold }
        );
        
        let message = `Placement Analysis for: "${title}"\n`;
        message += `(Note: Only non-completed actions are considered as potential parents)\n`;
        message += `🎛️ **Thresholds:** Confidence ≥ ${confidence_threshold}, Similarity ≥ ${similarity_threshold}\n\n`;
        
        if (placementResult.bestParent) {
          message += `✅ **Recommended Parent:**\n`;
          message += `   ID: ${placementResult.bestParent.id}\n`;
          message += `   Title: ${placementResult.bestParent.title}\n`;
          message += `   Confidence: ${(placementResult.confidence * 100).toFixed(1)}%\n\n`;
          message += `📝 **Reasoning:**\n   ${placementResult.reasoning}\n\n`;
        } else {
          message += `❌ **No suitable parent found**\n`;
          message += `   Confidence: ${(placementResult.confidence * 100).toFixed(1)}%\n`;
          message += `   Reasoning: ${placementResult.reasoning}\n\n`;
          
          if (placementResult.suggestedNewParent) {
            message += `🆕 **Suggested New Parent Category:**\n`;
            message += `   Title: ${placementResult.suggestedNewParent.title}\n`;
            message += `   Description: ${placementResult.suggestedNewParent.description}\n`;
            message += `   Why Create This: ${placementResult.suggestedNewParent.reasoning}\n\n`;
            message += `💡 **Next Steps:** Consider creating this new parent category first, then placing the action under it.\n\n`;
          } else {
            message += `💡 **Suggestion:** This action should be created as a root-level action.\n\n`;
          }
        }
        
        // Add analysis details if available
        if (placementResult.analysis) {
          const analysis = placementResult.analysis;
          message += `🔍 **Content Analysis:**\n`;
          message += `   Quality Score: ${(analysis.metadata.qualityScore * 100).toFixed(1)}%\n`;
          message += `   Content Length: ${analysis.metadata.contentLength} characters\n`;
          message += `   Important Terms: ${analysis.importantTerms.slice(0, 5).join(', ')}\n`;
          
          if (analysis.keywords.phrases.length > 0) {
            message += `   Key Phrases: ${analysis.keywords.phrases.slice(0, 3).map((p: any) => p.term).join(', ')}\n`;
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
        console.error('Error getting placement suggestion:', error);
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
    description: "Update an existing action's properties including title and completion status",
  },
  update_parent: {
    description: "Update an action's parent relationship by moving it under a new parent or making it a root action",
  },
  suggest_parent: {
    description: "Get an intelligent placement suggestion for a new action using semantic analysis",
  },
};