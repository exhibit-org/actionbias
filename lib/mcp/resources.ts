import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ActionsService } from "../services/actions";
import { getDb } from "../db/adapter";
import { actions, edges } from "../../db/schema";
import { eq, and } from "drizzle-orm";

export function registerResources(server: any) {
  // actions://list - List all actions with pagination support
  server.resource(
    "List all actions with pagination support (excludes completed actions by default)", 
    "actions://list",
    async (uri: any) => {
      try {
        // Parse URI parameters if present - default to reasonable limits
        let limit = 20;
        let offset = 0;
        let done: boolean | undefined = undefined;
        let includeCompleted = false;
        
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
            
            // Parse includeCompleted parameter
            const includeCompletedParam = url.searchParams.get('includeCompleted');
            if (includeCompletedParam !== null) {
              includeCompleted = includeCompletedParam === 'true';
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
        
        const result = await ActionsService.getActionListResource({ limit, offset, done, includeCompleted });
        
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
    "Hierarchical view of actions showing parent-child relationships (excludes completed actions by default)",
    "actions://tree",
    async (uri: any) => {
      try {
        // Parse URI parameters
        let includeCompleted = false;
        
        const uriString = uri.toString();
        if (uriString.includes('?')) {
          try {
            const url = new URL(uriString);
            
            // Parse includeCompleted parameter
            const includeCompletedParam = url.searchParams.get('includeCompleted');
            if (includeCompletedParam !== null) {
              includeCompleted = includeCompletedParam === 'true';
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
                  rootActions: []
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const result = await ActionsService.getActionTreeResource(includeCompleted);
        
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
    "Dependency graph view showing all action dependencies and dependents (excludes completed actions by default)",
    "actions://dependencies",
    async (uri: any) => {
      try {
        // Parse URI parameters
        let includeCompleted = false;
        
        const uriString = uri.toString();
        if (uriString.includes('?')) {
          try {
            const url = new URL(uriString);
            
            // Parse includeCompleted parameter
            const includeCompletedParam = url.searchParams.get('includeCompleted');
            if (includeCompletedParam !== null) {
              includeCompleted = includeCompletedParam === 'true';
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
                  dependencies: []
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const result = await ActionsService.getActionDependenciesResource(includeCompleted);
        
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

  // actions://next - Get the next actionable task with complete metadata context
  server.resource(
    "Get the next action that should be worked on based on dependencies, with complete metadata for the action and all parent actions",
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
        
        // Get complete action details with metadata for action and all parents
        const actionDetails = await ActionsService.getActionDetailResource(action.id);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(actionDetails, null, 2),
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
    description: "List all actions with pagination support (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "actions://tree": {
    description: "Hierarchical view of actions showing parent-child relationships (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "actions://dependencies": {
    description: "Dependency graph view showing all action dependencies and dependents (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "actions://next": {
    description: "Get the next action that should be worked on based on dependencies, with complete metadata for the action and all parent actions",
  },
  "actions://{id}": {
    description: "Individual action details with relationships",
  },
};