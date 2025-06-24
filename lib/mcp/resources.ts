import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ActionsService } from "../services/actions";
import { getDb } from "../db/adapter";
import { actions, edges } from "../../db/schema";
import { eq, and } from "drizzle-orm";

export function registerResources(server: any) {
  // action://list - List all actions with pagination support
  server.resource(
    "List all actions with pagination support (excludes completed actions by default)", 
    "action://list",
    async (uri: any) => {
      try {
        // Parse URI parameters if present - default to reasonable limits
        let limit = 20;
        let offset = 0;
        let includeCompleted = false;
        
        // Try to extract parameters from URI if it contains query string
        const uriString = uri.toString();
        if (uriString.includes('?')) {
          try {
            const url = new URL(uriString);
            limit = parseInt(url.searchParams.get('limit') || '20');
            offset = parseInt(url.searchParams.get('offset') || '0');
            
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
        
        const result = await ActionsService.getActionListResource({ limit, offset, includeCompleted });
        
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

  // action://tree - Hierarchical view of actions
  server.resource(
    "Hierarchical view of actions showing family relationships (excludes completed actions by default)",
    "action://tree",
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
        
        console.log('[RESOURCE] Starting getActionTreeResource', { includeCompleted });
        
        // Add timeout protection for the tree resource
        const timeoutMs = 45000; // 45 seconds, leaving buffer for the 60s maxDuration
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Tree resource timed out after 45 seconds')), timeoutMs);
        });
        
        const result = await Promise.race([
          ActionsService.getActionTreeResource(includeCompleted),
          timeoutPromise
        ]) as any;
        
        console.log('[RESOURCE] Completed getActionTreeResource');
        
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

  // action://dependencies - Dependency graph view
  server.resource(
    "Dependency graph view showing all action dependencies and dependents (excludes completed actions by default)",
    "action://dependencies",
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

  // action://item/{id} - Individual action details with relationships
  server.resource(
    "Individual action details with relationships",
    new ResourceTemplate("action://item/{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const actionId = Array.isArray(id) ? id[0] : id;
        
        if (!actionId || actionId === '{id}') {
          throw new Error("Action ID is required - URI should be like 'action://item/123'");
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
        
        // Family summaries are read directly from database columns
        // (they're automatically generated and regenerated by the FamilySummaryService)
        const enhancedResult = {
          ...result,
          family_context_summary: result.family_context_summary || 'This action has no family context.',
          family_vision_summary: result.family_vision_summary || 'This action has no family vision context.'
        };
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(enhancedResult, null, 2),
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

  // action://next - Get the next actionable task with complete metadata context
  server.resource(
    "Get the next action that should be worked on based on dependencies, with complete metadata for the action and all family actions",
    "action://next",
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
        
        // Family summaries are read directly from database columns
        // (they're automatically generated and regenerated by the FamilySummaryService)
        const enhancedActionDetails = {
          ...actionDetails,
          family_context_summary: actionDetails.family_context_summary || 'This action has no family context.',
          family_vision_summary: actionDetails.family_vision_summary || 'This action has no family vision context.'
        };
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(enhancedActionDetails, null, 2),
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

  // action://tree/{id} - Hierarchical view of actions scoped to a specific subtree
  server.resource(
    "Hierarchical view of actions showing family relationships within a specific subtree (excludes completed actions by default)",
    new ResourceTemplate("action://tree/{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const rootActionId = Array.isArray(id) ? id[0] : id;
        
        if (!rootActionId || rootActionId === '{id}') {
          throw new Error("Root action ID is required - URI should be like 'action://tree/123'");
        }
        
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
                  rootActions: [],
                  rootAction: rootActionId
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        console.log('[RESOURCE] Starting getActionTreeResourceScoped', { rootActionId, includeCompleted });
        
        // Add timeout protection for the scoped tree resource
        const timeoutMs = 45000; // 45 seconds, leaving buffer for the 60s maxDuration
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Scoped tree resource timed out after 45 seconds')), timeoutMs);
        });
        
        const result = await Promise.race([
          ActionsService.getActionTreeResourceScoped(rootActionId, includeCompleted),
          timeoutPromise
        ]) as any;
        
        console.log('[RESOURCE] Completed getActionTreeResourceScoped');
        
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
        console.error('Error fetching scoped action tree resource:', error);
        throw new Error(`Failed to fetch scoped action tree: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // action://next/{id} - Get the next actionable task scoped to a specific subtree
  server.resource(
    "Get the next action that should be worked on within a specific subtree, based on dependencies",
    new ResourceTemplate("action://next/{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const scopeActionId = Array.isArray(id) ? id[0] : id;
        
        if (!scopeActionId || scopeActionId === '{id}') {
          throw new Error("Scope action ID is required - URI should be like 'action://next/123'");
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
                  next_action: null,
                  scope: scopeActionId
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const action = await ActionsService.getNextActionScoped(scopeActionId);
        if (!action) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({ 
                  next_action: null,
                  scope: scopeActionId
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        // Get complete action details with metadata for action and all parents
        const actionDetails = await ActionsService.getActionDetailResource(action.id);
        
        // Family summaries are read directly from database columns
        // (they're automatically generated and regenerated by the FamilySummaryService)
        const enhancedActionDetails = {
          ...actionDetails,
          family_context_summary: actionDetails.family_context_summary || 'This action has no family context.',
          family_vision_summary: actionDetails.family_vision_summary || 'This action has no family vision context.',
          scope: scopeActionId
        };
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(enhancedActionDetails, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error getting scoped next action:', error);
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({ 
                error: error instanceof Error ? error.message : "Unknown error",
                scope: Array.isArray(id) ? id[0] : id
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
  "action://list": {
    description: "List all actions with pagination support (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "action://tree": {
    description: "Hierarchical view of actions showing family relationships (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "action://tree/{id}": {
    description: "Hierarchical view of actions within a specific subtree, scoped to the given action ID and its descendants (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "action://dependencies": {
    description: "Dependency graph view showing all action dependencies and dependents (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "action://next": {
    description: "Get the next action that should be worked on based on dependencies, with complete metadata for the action and all family actions",
  },
  "action://next/{id}": {
    description: "Get the next action that should be worked on within a specific subtree, scoped to the given action ID and its descendants",
  },
  "action://item/{id}": {
    description: "Individual action details with relationships",
  },
};