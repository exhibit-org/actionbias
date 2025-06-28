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
import { getWorkableActionsOptimized } from "../services/actions-optimized";
import { getBlockingDependencies, getActionsWithNoDependencies } from "../services/blocking-dependencies";

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
        
        // Return result directly - let the client handle placeholder text
        const enhancedResult = result;
        
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

  // action://log - Recent completion logs with pagination
  server.resource(
    "Recent completion logs showing how actions were implemented, their impact, and learnings",
    "action://log",
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

  // action://log/{id} - Individual action's completion log
  server.resource(
    "Completion log for a specific action showing implementation details, impact, and learnings",
    new ResourceTemplate("action://log/{id}", { list: undefined }),
    async (uri: any, { id }: { id: string | string[] }) => {
      try {
        // Handle id parameter which can be string or string[]
        const actionId = Array.isArray(id) ? id[0] : id;
        
        if (!actionId || actionId === '{id}') {
          throw new Error("Action ID is required - URI should be like 'action://log/123'");
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
        
        // Get recently completed actions from database
        if (process.env.DATABASE_URL) {
          try {
            const recentCompletions = await getDb()
              .select({
                actionId: completionContexts.actionId,
                actionTitle: actions.title,
                completionTimestamp: completionContexts.completionTimestamp,
                impactStory: completionContexts.impactStory,
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

  // action://workable - Get all workable actions (leaf nodes with dependencies met)
  server.resource(
    "Get all workable actions (leaf nodes with all dependencies completed)",
    "action://workable",
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
                  workable: [],
                  total: 0
                }, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }
        
        const startTime = Date.now();
        console.log('[WORKABLE] Starting to get workable actions');
        
        // Get all workable actions using optimized query
        const workableActions = await getWorkableActionsOptimized(1000);
        
        const duration = Date.now() - startTime;
        console.log(`[WORKABLE] Found ${workableActions.length} workable actions in ${duration}ms`);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({
                workable: workableActions,
                total: workableActions.length,
                queryDuration: duration,
                generatedAt: new Date().toISOString()
              }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching workable actions:', error);
        throw new Error(`Failed to fetch workable actions: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );

  // action://blockers - Get blocking dependencies
  server.resource(
    "Get incomplete dependencies that are blocking other work",
    "action://blockers",
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

  // action://no-dependencies - Get actions with no dependencies
  server.resource(
    "Get incomplete actions that have no dependencies blocking them",
    "action://no-dependencies",
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
  "action://list": {
    description: "List all actions with pagination support (excludes completed actions by default, use ?includeCompleted=true to include them)",
  },
  "action://workable": {
    description: "Get all workable actions (leaf nodes with all dependencies completed)",
  },
  "action://blockers": {
    description: "Get incomplete dependencies that are blocking other work",
  },
  "action://no-dependencies": {
    description: "Get incomplete actions that have no dependencies blocking them",
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
  "action://log": {
    description: "Recent completion logs showing how actions were implemented, their impact, and learnings. Supports pagination (?limit=20&offset=0) and visibility filtering (?visibility=public|team|private)",
  },
  "action://log/{id}": {
    description: "Completion log for a specific action showing implementation details, impact, and learnings",
  },
  "context://vision": {
    description: "Project vision and strategic documents (VISION.md, CLAUDE.md) that guide development priorities",
  },
  "context://momentum": {
    description: "Recent activity including git commits, completed actions, and work patterns to understand current development momentum",
  },
};