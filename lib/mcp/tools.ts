import { z } from "zod";
import { ActionsService } from "../services/actions";
import { getDb } from "../db/adapter";
import { actions, edges } from "../../db/schema";
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

// Helper function to build nested action structure
async function buildNestedActionStructure(nextActionId: string) {
  // Get the parent chain
  const parentChain = [];
  let currentId = nextActionId;
  
  // Walk up the parent chain
  while (true) {
    const action = await getDb()
      .select()
      .from(actions)
      .where(eq(actions.id, currentId))
      .limit(1);
    
    if (action.length === 0) break;
    
    parentChain.unshift({
      id: currentId,
      title: action[0].data?.title || 'untitled',
      created_at: action[0].createdAt.toISOString()
    });
    
    // Find parent
    const parentEdges = await getDb()
      .select()
      .from(edges)
      .where(and(eq(edges.dst, currentId), eq(edges.kind, "child")));
    
    if (parentEdges.length === 0) break;
    
    const parentId = parentEdges[0].src;
    if (!parentId) break;
    
    currentId = parentId;
  }
  
  // Build nested structure from root down to next action
  let result: any = null;
  for (let i = 0; i < parentChain.length; i++) {
    const actionInfo = parentChain[i];
    const isNextAction = actionInfo.id === nextActionId;
    
    const node: any = {
      id: actionInfo.id,
      title: actionInfo.title,
      created_at: actionInfo.created_at,
      is_next_action: isNextAction
    };
    
    if (i === 0) {
      // Root node
      result = node;
    } else {
      // Add as child of previous node
      let current = result;
      for (let j = 1; j < i; j++) {
        current = current.child;
      }
      current.child = node;
    }
  }
  
  return result;
}

export function registerTools(server: any) {
  // create_action - Create a new action
  server.tool(
    "create_action",
    "Create a new action in the database with optional parent and dependencies",
    {
      title: z.string().min(1).describe("The title for the action"),
      parent_id: z.string().uuid().optional().describe("Optional parent action ID to create a child relationship"),
      depends_on_ids: z.array(z.string().uuid()).optional().describe("Optional array of action IDs that this action depends on"),
    },
    async ({ title, parent_id, depends_on_ids }: { title: string; parent_id?: string; depends_on_ids?: string[] }, extra: any) => {
      try {
        console.log(`Creating action with title: ${title}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.createAction({ title, parent_id, depends_on_ids });

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
        
        const authToken = 'test-token';
        
        const result = await makeApiCall('/actions/dependencies', {
          method: 'POST',
          body: JSON.stringify({ action_id, depends_on_id }),
        }, authToken);

        const edge = result.data;

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
      child_handling: z.enum(["delete_recursive", "orphan", "reparent"]).default("orphan").describe("How to handle child actions: delete_recursive (delete all children), orphan (remove parent relationship), or reparent (move children to deleted action's parent)"),
      new_parent_id: z.string().uuid().optional().describe("Required if child_handling is 'reparent' - the new parent for orphaned children"),
    },
    async ({ action_id, child_handling, new_parent_id }: { action_id: string; child_handling?: "delete_recursive" | "orphan" | "reparent"; new_parent_id?: string }, extra: any) => {
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
        
        const authToken = 'test-token';
        
        const result = await makeApiCall('/actions/dependencies', {
          method: 'DELETE',
          body: JSON.stringify({ action_id, depends_on_id }),
        }, authToken);

        const { action, depends_on, deleted_edge } = result.data;

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
      done: z.boolean().optional().describe("Whether the action is completed (true) or not (false)"),
    },
    async ({ action_id, title, done }: { action_id: string; title?: string; done?: boolean }, extra: any) => {
      try {
        // Validate that at least one field is provided
        if (title === undefined && done === undefined) {
          return {
            content: [
              {
                type: "text",
                text: "Error: At least one field (title or done) must be provided",
              },
            ],
          };
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (done !== undefined) updateData.done = done;
        
        console.log(`Updating action ${action_id} with:`, updateData);
        
        const authToken = 'test-token';
        
        const result = await makeApiCall(`/actions/${action_id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }, authToken);

        const action = result.data;
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

  // get_next_action - Return the next actionable task
  server.tool(
    "get_next_action",
    "Return the next action that should be worked on based on dependencies",
    {},
    async (_args: {}, extra: any) => {
      try {
        const action = await ActionsService.getNextAction();
        if (!action) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ next_action: null }),
              },
            ],
          };
        }
        
        // Build nested structure from root to next action
        const nestedStructure = await buildNestedActionStructure(action.id);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(nestedStructure, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error getting next action:', error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
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
  get_next_action: {
    description: "Return the next action that should be worked on based on dependencies",
  },
};