import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ActionsService } from "../services/actions";
import { CompletionContextService } from "../services/completion-context";
import { getDb } from "../db/adapter";
import { actions, edges, completionContexts } from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getUnblockedActionsOptimized } from "../services/actions-optimized";
import { getBlockingDependencies, getActionsWithNoDependencies } from "../services/blocking-dependencies";

export function registerResources(server: any) {
  // actions://list - List all work items with pagination support
  server.resource(
    "List all work items with pagination support (excludes completed items by default)", 
    "actions://list",
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

  // actions://tree - Hierarchical view of work items
  server.resource(
    "Hierarchical view of work items showing family relationships (excludes completed items by default)",
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

  // actions://dependencies - Dependency graph view
  server.resource(
    "Dependency graph view showing all work item dependencies and dependents (excludes completed items by default)",
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

  // actions://{id} - Individual work item core data
  server.resource(
    "Individual work item core data",
    new ResourceTemplate("actions://{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const actionId = Array.isArray(id) ? id[0] : id;
        
        if (!actionId || actionId === '{id}') {
          throw new Error("Work item ID is required - URI should be like 'actions://123'");
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
        
        const result = await ActionsService.getWorkItemCoreData(actionId);
        
        // Return core data only - no relationships, no AI summaries
        const coreData = result;
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(coreData, null, 2),
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

  // actions://context/{id} - Rich context for agents to begin work
  server.resource(
    "Rich relationship context for agents to begin work on a specific item",
    new ResourceTemplate("actions://context/{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const actionId = Array.isArray(id) ? id[0] : id;
        
        if (!actionId || actionId === '{id}') {
          throw new Error("Work item ID is required - URI should be like 'actions://context/123'");
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
                  context: null
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        // Use the full detail resource for agent context (all relationships and data)
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
        console.error('Error fetching work context:', error);
        throw new Error(`Failed to fetch work context: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://tree/{id} - Hierarchical view of work items scoped to a specific subtree
  server.resource(
    "Hierarchical view of work items showing family relationships within a specific subtree (excludes completed items by default)",
    new ResourceTemplate("actions://tree/{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const rootActionId = Array.isArray(id) ? id[0] : id;
        
        if (!rootActionId || rootActionId === '{id}') {
          throw new Error("Root work item ID is required - URI should be like 'actions://tree/123'");
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

  // actions://done - Recent completion logs with pagination
  server.resource(
    "Recent completion logs showing how work items were implemented, their impact, and learnings",
    "actions://done",
    async (uri: any) => {
      try {
        // Parse URI parameters
        let limit = 20;
        let offset = 0;
        let visibility: string | undefined;
        
        const uriString = uri.toString();
        if (uriString.includes('?')) {
          try {
            const url = new URL(uriString);
            limit = parseInt(url.searchParams.get('limit') || '20');
            offset = parseInt(url.searchParams.get('offset') || '0');
            visibility = url.searchParams.get('visibility') || undefined;
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
                  logs: [],
                  total: 0
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        // Get completion contexts with joined action data
        const query = getDb()
          .select({
            id: completionContexts.id,
            actionId: completionContexts.actionId,
            actionTitle: actions.title,
            actionDescription: actions.description,
            implementationStory: completionContexts.implementationStory,
            impactStory: completionContexts.impactStory,
            learningStory: completionContexts.learningStory,
            changelogVisibility: completionContexts.changelogVisibility,
            completionTimestamp: completionContexts.completionTimestamp,
          })
          .from(completionContexts)
          .innerJoin(actions, eq(completionContexts.actionId, actions.id));
        
        if (visibility) {
          query.where(eq(completionContexts.changelogVisibility, visibility));
        }
        
        const logs = await query
          .limit(limit)
          .offset(offset)
          .orderBy(desc(completionContexts.completionTimestamp));
        
        // Get total count
        const countQuery = getDb()
          .select({ count: sql<number>`count(*)` })
          .from(completionContexts);
        
        if (visibility) {
          countQuery.where(eq(completionContexts.changelogVisibility, visibility));
        }
        
        const countResult = await countQuery;
        const count = countResult?.[0]?.count || 0;
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({
                logs,
                total: Number(count),
                limit,
                offset
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching log feed:', error);
        throw new Error(`Failed to fetch log feed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://done/{id} - Individual work item's completion log
  server.resource(
    "Completion log for a specific work item showing implementation details, impact, and learnings",
    new ResourceTemplate("actions://done/{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const actionId = Array.isArray(id) ? id[0] : id;
        
        if (!actionId || actionId === '{id}') {
          throw new Error("Work item ID is required - URI should be like 'actions://done/123'");
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
                  log: null
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        // Get completion context with joined action data
        const result = await getDb()
          .select({
            id: completionContexts.id,
            actionId: completionContexts.actionId,
            actionTitle: actions.title,
            actionDescription: actions.description,
            actionVision: actions.vision,
            implementationStory: completionContexts.implementationStory,
            impactStory: completionContexts.impactStory,
            learningStory: completionContexts.learningStory,
            changelogVisibility: completionContexts.changelogVisibility,
            completionTimestamp: completionContexts.completionTimestamp,
          })
          .from(completionContexts)
          .innerJoin(actions, eq(completionContexts.actionId, actions.id))
          .where(eq(completionContexts.actionId, actionId))
          .limit(1);
        
        if (result.length === 0) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify({
                  log: null,
                  message: `No completion log found for action ${actionId}`
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({
                log: result[0]
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching action log:', error);
        throw new Error(`Failed to fetch action log: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // context://vision - Project vision and strategic documents
  server.resource(
    "Project vision and strategic documents (VISION.md, CLAUDE.md) that guide development priorities",
    "context://vision",
    async (uri: any) => {
      try {
        const documents: any = {};
        
        // Read VISION.md if it exists
        const visionPath = join(process.cwd(), 'VISION.md');
        if (existsSync(visionPath)) {
          documents.vision = readFileSync(visionPath, 'utf-8');
        }
        
        // Read CLAUDE.md if it exists
        const claudePath = join(process.cwd(), 'CLAUDE.md');
        if (existsSync(claudePath)) {
          documents.claude = readFileSync(claudePath, 'utf-8');
        }
        
        // Read README.md for additional context
        const readmePath = join(process.cwd(), 'README.md');
        if (existsSync(readmePath)) {
          documents.readme = readFileSync(readmePath, 'utf-8');
        }
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({
                documents,
                paths: {
                  vision: existsSync(visionPath) ? visionPath : null,
                  claude: existsSync(claudePath) ? claudePath : null,
                  readme: existsSync(readmePath) ? readmePath : null,
                }
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error reading vision documents:', error);
        throw new Error(`Failed to read vision documents: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // context://momentum - Recent development activity
  server.resource(
    "Recent activity including git commits, completed actions, and work patterns to understand current development momentum",
    "context://momentum",
    async (uri: any) => {
      try {
        const momentum: any = {};
        
        // Git integration not available in production yet
        // TODO: This will be populated via GitHub/GitLab integration
        momentum.recentCommits = [];
        momentum.recentlyChangedFiles = [];
        momentum.currentBranch = 'main'; // Default assumption
        momentum.gitIntegrationPending = true;
        momentum.note = 'Git history will be available after GitHub/GitLab integration is implemented';
        
        // Get recent action activity (both completed and in-progress with completion contexts)
        if (process.env.DATABASE_URL) {
          try {
            const recentCompletions = await getDb()
              .select({
                actionId: completionContexts.actionId,
                actionTitle: actions.title,
                completionTimestamp: completionContexts.completionTimestamp,
                impactStory: completionContexts.impactStory,
                isCurrentlyComplete: actions.done,
              })
              .from(completionContexts)
              .innerJoin(actions, eq(completionContexts.actionId, actions.id))
              .orderBy(desc(completionContexts.completionTimestamp))
              .limit(10);
            
            momentum.recentCompletions = recentCompletions;
          } catch (dbError) {
            console.log('Could not get recent completions:', dbError);
            momentum.recentCompletions = [];
          }
        } else {
          momentum.recentCompletions = [];
        }
        
        // Analysis timestamp
        momentum.analyzedAt = new Date().toISOString();
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(momentum, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error analyzing momentum:', error);
        throw new Error(`Failed to analyze momentum: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://count - Get counts of work items by status
  server.resource(
    "Get counts of work items by status (total, incomplete, completed)",
    "actions://count",
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
                  total: 0,
                  incomplete: 0,
                  completed: 0
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const result = await ActionsService.getActionCounts();
        
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
        console.error('Error fetching action counts:', error);
        throw new Error(`Failed to fetch action counts: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://unblocked - Get all unblocked work items (leaf nodes with dependencies met)
  server.resource(
    "Get all unblocked work items (leaf nodes with all dependencies completed)",
    "actions://unblocked",
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
                  unblocked: [],
                  total: 0
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const startTime = Date.now();
        console.log('[UNBLOCKED] Starting to get unblocked actions');
        
        // Get all unblocked actions using optimized query
        const unblockedActions = await getUnblockedActionsOptimized(1000);
        
        const duration = Date.now() - startTime;
        console.log(`[UNBLOCKED] Found ${unblockedActions.length} unblocked actions in ${duration}ms`);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({
                unblocked: unblockedActions,
                total: unblockedActions.length,
                queryDuration: duration,
                generatedAt: new Date().toISOString()
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching unblocked actions:', error);
        throw new Error(`Failed to fetch unblocked actions: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://blockers - Get blocking dependencies
  server.resource(
    "Get incomplete dependencies that are blocking other work",
    "actions://blockers",
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
                  blockers: [],
                  total: 0
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const startTime = Date.now();
        const blockers = await getBlockingDependencies();
        const duration = Date.now() - startTime;
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({
                blockers,
                total: blockers.length,
                totalBlocked: blockers.reduce((sum, b) => sum + b.blockCount, 0),
                queryDuration: duration,
                generatedAt: new Date().toISOString()
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching blocking dependencies:', error);
        throw new Error(`Failed to fetch blockers: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // actions://no-dependencies - Get work items with no dependencies
  server.resource(
    "Get incomplete work items that have no dependencies blocking them",
    "actions://no-dependencies",
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
                  actions: [],
                  total: 0
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const startTime = Date.now();
        const actionsNoDeps = await getActionsWithNoDependencies();
        const duration = Date.now() - startTime;
        
        const formattedActions = actionsNoDeps.map((a: any) => ({
          id: a.id,
          data: a.data,
          done: a.done,
          version: a.version,
          createdAt: new Date(a.created_at).toISOString(),
          updatedAt: new Date(a.updated_at).toISOString()
        }));
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({
                actions: formattedActions,
                total: formattedActions.length,
                queryDuration: duration,
                generatedAt: new Date().toISOString()
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching no-dependency actions:', error);
        throw new Error(`Failed to fetch actions: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

}

export const resourceCapabilities = {
  "actions://list": {
    description: "List all work items with pagination support (excludes completed items by default, use ?includeCompleted=true to include them)",
  },
  "actions://count": {
    description: "Get counts of work items by status (total, incomplete, completed)",
  },
  "actions://unblocked": {
    description: "Get all unblocked work items (leaf nodes with all dependencies completed)",
  },
  "actions://blockers": {
    description: "Get incomplete dependencies that are blocking other work",
  },
  "actions://no-dependencies": {
    description: "Get incomplete work items that have no dependencies blocking them",
  },
  "actions://tree": {
    description: "Hierarchical view of work items showing family relationships (excludes completed items by default, use ?includeCompleted=true to include them)",
  },
  "actions://tree/{id}": {
    description: "Hierarchical view of work items within a specific subtree, scoped to the given work item ID and its descendants (excludes completed items by default, use ?includeCompleted=true to include them)",
  },
  "actions://dependencies": {
    description: "Dependency graph view showing all work item dependencies and dependents (excludes completed items by default, use ?includeCompleted=true to include them)",
  },
  "actions://{id}": {
    description: "Individual work item core data",
  },
  "actions://context/{id}": {
    description: "Rich relationship context for agents to begin work on a specific item",
  },
  "actions://done": {
    description: "Recent completion logs showing how work items were implemented, their impact, and learnings. Supports pagination (?limit=20&offset=0) and visibility filtering (?visibility=public|team|private)",
  },
  "actions://done/{id}": {
    description: "Completion log for a specific work item showing implementation details, impact, and learnings",
  },
  "context://vision": {
    description: "Project vision and strategic documents (VISION.md, CLAUDE.md) that guide development priorities",
  },
  "context://momentum": {
    description: "Recent activity including git commits, completed actions, and work patterns to understand current development momentum",
  },
  "actions://next": {
    description: "Get the next recommended action to work on based on dependencies and priority",
  },
  "actions://next/{id}": {
    description: "Get the next recommended action to work on within a specific subtree or project scope",
  },
};