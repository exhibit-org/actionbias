import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

// Helper function to make internal API calls
async function makeApiCall(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
  
  const response = await fetch(`${baseUrl}/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `API call failed: ${response.status}`);
  }
  
  return data;
}

const handler = createMcpHandler(
  (server) => {
    console.log('MCP server initialized with dynamic transport');
    
    server.tool(
      "create_action",
      "Create a new action in the database with optional parent and dependencies",
      {
        title: z.string().min(1).describe("The title for the action"),
        parent_id: z.string().uuid().optional().describe("Optional parent action ID to create a child relationship"),
        depends_on_ids: z.array(z.string().uuid()).optional().describe("Optional array of action IDs that this action depends on"),
      },
      async ({ title, parent_id, depends_on_ids }) => {
        try {
          console.log(`Creating action with title: ${title}`);
          
          const result = await makeApiCall('/actions', {
            method: 'POST',
            body: JSON.stringify({ title, parent_id, depends_on_ids }),
          });

          const { action, dependencies_count } = result.data;
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

    server.tool(
      "list_actions",
      "List all actions in the database",
      {
        limit: z.number().min(1).max(100).default(20).describe("Maximum number of actions to return"),
        offset: z.number().min(0).default(0).describe("Number of actions to skip for pagination"),
      },
      async ({ limit, offset }) => {
        try {
          console.log(`Listing actions with limit: ${limit}, offset: ${offset}`);
          
          const result = await makeApiCall(`/actions?limit=${limit}&offset=${offset}`, {
            method: 'GET',
          });

          const actions = result.data;
          console.log(`Found ${actions.length} actions`);

          const formattedActions = actions.map((action: any) => 
            `${action.data?.title || 'untitled'} (ID: ${action.id}, Created: ${action.createdAt})`
          ).join('\n');

          return {
            content: [
              {
                type: "text",
                text: `Found ${actions.length} actions:\n\n${formattedActions}`,
              },
            ],
          };
        } catch (error) {
          console.error('Error listing actions:', error);
          return {
            content: [
              {
                type: "text",
                text: `Error listing actions: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "add_child_action",
      "Create a new action as a child of an existing action",
      {
        title: z.string().min(1).describe("The title for the new child action"),
        parent_id: z.string().uuid().describe("The ID of the parent action"),
      },
      async ({ title, parent_id }) => {
        try {
          console.log(`Creating child action "${title}" under parent ${parent_id}`);
          
          const result = await makeApiCall('/actions/children', {
            method: 'POST',
            body: JSON.stringify({ title, parent_id }),
          });

          const { action, parent } = result.data;

          return {
            content: [
              {
                type: "text",
                text: `Created child action: ${title}\nID: ${action.id}\nParent: ${parent.data?.title}\nCreated: ${action.createdAt}`,
              },
            ],
          };
        } catch (error) {
          console.error('Error creating child action:', error);
          return {
            content: [
              {
                type: "text",
                text: `Error creating child action: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "add_dependency",
      "Create a dependency relationship between two existing actions",
      {
        action_id: z.string().uuid().describe("The ID of the action that depends on another"),
        depends_on_id: z.string().uuid().describe("The ID of the action that must be completed first"),
      },
      async ({ action_id, depends_on_id }) => {
        try {
          console.log(`Creating dependency: ${action_id} depends on ${depends_on_id}`);
          
          const result = await makeApiCall('/actions/dependencies', {
            method: 'POST',
            body: JSON.stringify({ action_id, depends_on_id }),
          });

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

    server.tool(
      "delete_action",
      "Delete an action and handle its children",
      {
        action_id: z.string().uuid().describe("The ID of the action to delete"),
        child_handling: z.enum(["delete_recursive", "orphan", "reparent"]).default("orphan").describe("How to handle child actions: delete_recursive (delete all children), orphan (remove parent relationship), or reparent (move children to deleted action's parent)"),
        new_parent_id: z.string().uuid().optional().describe("Required if child_handling is 'reparent' - the new parent for orphaned children"),
      },
      async ({ action_id, child_handling, new_parent_id }) => {
        try {
          console.log(`Deleting action ${action_id} with child handling: ${child_handling}`);
          
          const result = await makeApiCall(`/actions/${action_id}`, {
            method: 'DELETE',
            body: JSON.stringify({ child_handling, new_parent_id }),
          });

          const { deleted_action, children_count, child_handling: handling, new_parent_id: newParentId } = result.data;
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

    server.tool(
      "remove_dependency",
      "Remove a dependency relationship between two actions",
      {
        action_id: z.string().uuid().describe("The ID of the action that currently depends on another"),
        depends_on_id: z.string().uuid().describe("The ID of the action that the dependency should be removed from"),
      },
      async ({ action_id, depends_on_id }) => {
        try {
          console.log(`Removing dependency: ${action_id} no longer depends on ${depends_on_id}`);
          
          const result = await makeApiCall('/actions/dependencies', {
            method: 'DELETE',
            body: JSON.stringify({ action_id, depends_on_id }),
          });

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

  },
  {
    capabilities: {
      tools: {
        create_action: {
          description: "Create a new action in the database with optional parent and dependencies",
        },
        list_actions: {
          description: "List all actions in the database",
        },
        add_child_action: {
          description: "Create a new action as a child of an existing action",
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
      },
    },
  },
  {
    redisUrl: process.env.REDIS_URL,
    basePath: "", // Dynamic transport routing
    verboseLogs: true,
    maxDuration: 60,
  },
);

// Validate authentication
function validateAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  // Accept any token that starts with 'access_' (from our OAuth flow) OR 'test-token' for testing
  return token.startsWith('access_') || token === 'test-token';
}

async function authenticatedHandler(method: string, request: Request) {
  const url = new URL(request.url);
  const transport = url.pathname.substring(1); // Remove leading slash
  
  console.log(`[MCP Auth] ${method} ${url.pathname} received`);
  
  // Only handle MCP transport paths, exclude static files  
  if (!['sse', 'mcp', 'message'].includes(transport) || transport.includes('.')) {
    console.log(`[MCP Auth] Not an MCP transport path: ${transport}`);
    return new Response('Not Found', { status: 404 });
  }
  
  // SSE endpoint GET requests are for establishing the event stream connection
  // Check for authentication on SSE connection, but allow through even if missing for now
  if (transport === 'sse' && method === 'GET') {
    console.log('[MCP Auth] SSE connection establishment');
    console.log('[MCP Auth] SSE Headers:', Object.fromEntries(request.headers.entries()));
    if (validateAuth(request)) {
      console.log('[MCP Auth] SSE authenticated - allowing through');
    } else {
      console.log('[MCP Auth] SSE not authenticated - allowing through anyway for connection establishment');
    }
    return handler(request);
  }
  
  // Message endpoint - check if this is an exploratory request or authenticated request
  if (transport === 'message') {
    console.log('[MCP Auth] Message endpoint request');
    console.log('[MCP Auth] Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[MCP Auth] URL:', request.url);
    
    if (!validateAuth(request)) {
      console.log('[MCP Auth] Message endpoint - no authentication, allowing through for discovery');
      // Allow through for discovery/exploration
    } else {
      console.log('[MCP Auth] Message endpoint - authenticated request');
    }
    return handler(request);
  }
  
  // All other requests require authentication
  if (!validateAuth(request)) {
    console.log('[MCP Auth] Authentication failed');
    return new Response('Unauthorized', { status: 401 });
  }
  
  console.log('[MCP Auth] Authentication successful');
  console.log('[MCP Auth] Forwarding to MCP handler');
  
  return handler(request);
}

export async function GET(request: Request) {
  return authenticatedHandler('GET', request);
}

export async function POST(request: Request) {
  return authenticatedHandler('POST', request);
}

export async function DELETE(request: Request) {
  return authenticatedHandler('DELETE', request);
}