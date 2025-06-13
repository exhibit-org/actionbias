import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ActionsService } from "../services/actions";
import { getDb } from "../db/adapter";
import { actions, edges } from "../../db/schema";
import { eq, and } from "drizzle-orm";

// Helper function to build nested action structure
async function buildNestedActionStructure(nextActionId: string) {
  const chain: { id: string; title: string; created_at: string }[] = [];
  let currentId: string | undefined = nextActionId;

  // Walk up the parent chain collecting data
  while (currentId) {
    const [action] = await getDb()
      .select()
      .from(actions)
      .where(eq(actions.id, currentId))
      .limit(1);
    if (!action) break;

    chain.push({
      id: currentId,
      title: action.data?.title || 'untitled',
      created_at: action.createdAt.toISOString(),
    });

    const [parentEdge] = await getDb()
      .select()
      .from(edges)
      .where(and(eq(edges.dst, currentId), eq(edges.kind, 'child')))
      .limit(1);

    currentId = parentEdge?.src ?? undefined;
  }

  // Build nested structure from root to next action
  return chain
    .reverse()
    .reduceRight<any>((child, info) => ({
      id: info.id,
      title: info.title,
      created_at: info.created_at,
      is_next_action: info.id === nextActionId,
      ...(child ? { child } : {}),
    }), null);
}

export function registerResources(server: any) {
  // actions://list - List all actions with pagination support
  server.resource(
    "List all actions with pagination support", 
    "actions://list",
    async (uri: any) => {
      try {
        // Parse URI parameters if present - default to reasonable limits
        let limit = 20;
        let offset = 0;
        let done: boolean | undefined = undefined;
        
        // Try to extract parameters from URI if it contains query string
        const uriString = uri.toString();
        if (uriString.includes('?')) {
          try {
            const url = new URL(uriString);
            limit = parseInt(url.searchParams.get('limit') || '20');
            offset = parseInt(url.searchParams.get('offset') || '0');
            
            // Parse done parameter
            const doneParam = url.searchParams.get('done');
            if (doneParam !== null) {
              done = doneParam === 'true';
            }
          } catch (urlError) {
            console.log('Could not parse URI parameters, using defaults:', urlError);
          }
        }
        
        // Check if database is available
        if (!process.env.DATABASE_URL) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({
                  error: "Database not configured",
                  message: "DATABASE_URL environment variable is not set",
                  actions: [],
                  total: 0
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const result = await ActionsService.getActionListResource({ limit, offset, done });
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(result, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching actions resource:', error);
        throw new Error(`Failed to fetch actions: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://tree - Hierarchical view of actions
  server.resource(
    "Hierarchical view of actions showing parent-child relationships",
    "actions://tree",
    async (uri: any) => {
      try {
        // Check if database is available
        if (!process.env.DATABASE_URL) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({
                  error: "Database not configured",
                  message: "DATABASE_URL environment variable is not set",
                  rootActions: []
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const result = await ActionsService.getActionTreeResource();
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(result, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching action tree resource:', error);
        throw new Error(`Failed to fetch action tree: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://dependencies - Dependency graph view
  server.resource(
    "Dependency graph view showing all action dependencies and dependents",
    "actions://dependencies",
    async (uri: any) => {
      try {
        // Check if database is available
        if (!process.env.DATABASE_URL) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({
                  error: "Database not configured", 
                  message: "DATABASE_URL environment variable is not set",
                  dependencies: []
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const result = await ActionsService.getActionDependenciesResource();
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(result, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching action dependencies resource:', error);
        throw new Error(`Failed to fetch action dependencies: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://{id} - Individual action details with relationships
  server.resource(
    "Individual action details with relationships",
    new ResourceTemplate("actions://{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const actionId = Array.isArray(id) ? id[0] : id;
        
        if (!actionId || actionId === '{id}') {
          throw new Error("Action ID is required - URI should be like 'actions://123'");
        }
        
        // Check if database is available
        if (!process.env.DATABASE_URL) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({
                  error: "Database not configured",
                  message: "DATABASE_URL environment variable is not set",
                  id: actionId,
                  title: "Action not available",
                  children: [],
                  dependencies: [],
                  dependents: []
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const result = await ActionsService.getActionDetailResource(actionId);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(result, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching action detail resource:', error);
        throw new Error(`Failed to fetch action details: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://next - Get the next actionable task with context
  server.resource(
    "Get the next action that should be worked on based on dependencies",
    "actions://next",
    async (uri: any) => {
      try {
        // Check if database is available
        if (!process.env.DATABASE_URL) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({
                  error: "Database not configured",
                  message: "DATABASE_URL environment variable is not set",
                  next_action: null
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const action = await ActionsService.getNextAction();
        if (!action) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({ next_action: null }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        // Build nested structure from root to next action
        const nestedStructure = await buildNestedActionStructure(action.id);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(nestedStructure, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error getting next action:', error);
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({ 
                error: error instanceof Error ? error.message : "Unknown error" 
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      }
    }
  );
}

export const resourceCapabilities = {
  "actions://list": {
    description: "List all actions with pagination support",
  },
  "actions://tree": {
    description: "Hierarchical view of actions showing parent-child relationships",
  },
  "actions://dependencies": {
    description: "Dependency graph view showing all action dependencies and dependents",
  },
  "actions://next": {
    description: "Get the next action that should be worked on based on dependencies",
  },
  "actions://{id}": {
    description: "Individual action details with relationships",
  },
};