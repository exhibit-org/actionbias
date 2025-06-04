import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import postgres from "postgres";
import { actions, actionDataSchema, edges } from "../../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Helper function to get all descendants of given action IDs
async function getAllDescendants(actionIds: string[]): Promise<string[]> {
  if (actionIds.length === 0) return [];
  
  const descendants = new Set<string>(actionIds);
  let toProcess = [...actionIds];
  
  while (toProcess.length > 0) {
    const currentLevel = [...toProcess];
    toProcess = [];
    
    for (const actionId of currentLevel) {
      const childEdges = await db.select().from(edges).where(
        and(eq(edges.src, actionId), eq(edges.kind, "child"))
      );
      
      for (const edge of childEdges) {
        if (edge.dst && !descendants.has(edge.dst)) {
          descendants.add(edge.dst);
          toProcess.push(edge.dst);
        }
      }
    }
  }
  
  return Array.from(descendants);
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
          
          // Validate parent exists if provided
          if (parent_id) {
            const parentAction = await db.select().from(actions).where(eq(actions.id, parent_id)).limit(1);
            if (parentAction.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Error: Parent action with ID ${parent_id} not found`,
                  },
                ],
              };
            }
          }

          // Validate dependencies exist if provided
          if (depends_on_ids && depends_on_ids.length > 0) {
            for (const depId of depends_on_ids) {
              const depAction = await db.select().from(actions).where(eq(actions.id, depId)).limit(1);
              if (depAction.length === 0) {
                return {
                  content: [
                    {
                      type: "text",
                      text: `Error: Dependency action with ID ${depId} not found`,
                    },
                  ],
                };
              }
            }
          }
          
          const newAction = await db
            .insert(actions)
            .values({
              id: crypto.randomUUID(),
              data: { title },
            })
            .returning();

          console.log(`Created action:`, newAction[0]);

          // Create parent relationship if specified
          if (parent_id) {
            await db.insert(edges).values({
              src: parent_id,
              dst: newAction[0].id,
              kind: "child",
            });
          }

          // Create dependency relationships if specified
          if (depends_on_ids && depends_on_ids.length > 0) {
            for (const depId of depends_on_ids) {
              await db.insert(edges).values({
                src: depId,
                dst: newAction[0].id,
                kind: "depends_on",
              });
            }
          }

          let message = `Created action: ${title}\nID: ${newAction[0].id}\nCreated: ${newAction[0].createdAt}`;
          
          if (parent_id) {
            const parent = await db.select().from(actions).where(eq(actions.id, parent_id)).limit(1);
            message += `\nParent: ${parent[0].data?.title}`;
          }
          
          if (depends_on_ids && depends_on_ids.length > 0) {
            message += `\nDependencies: ${depends_on_ids.length} actions`;
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
          
          const actionList = await db
            .select()
            .from(actions)
            .limit(limit)
            .offset(offset)
            .orderBy(actions.createdAt);

          console.log(`Found ${actionList.length} actions`);

          const formattedActions = actionList.map(action => 
            `${action.data?.title || 'untitled'} (ID: ${action.id}, Created: ${action.createdAt})`
          ).join('\n');

          return {
            content: [
              {
                type: "text",
                text: `Found ${actionList.length} actions:\n\n${formattedActions}`,
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
          
          // Check that parent exists
          const parentAction = await db.select().from(actions).where(eq(actions.id, parent_id)).limit(1);
          
          if (parentAction.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: Parent action with ID ${parent_id} not found`,
                },
              ],
            };
          }
          
          // Create new action
          const newAction = await db
            .insert(actions)
            .values({
              id: crypto.randomUUID(),
              data: { title },
            })
            .returning();

          // Create parent-child relationship
          const newEdge = await db
            .insert(edges)
            .values({
              src: parent_id,
              dst: newAction[0].id,
              kind: "child",
            })
            .returning();

          console.log(`Created child action:`, newAction[0]);
          console.log(`Created parent relationship:`, newEdge[0]);

          return {
            content: [
              {
                type: "text",
                text: `Created child action: ${title}\nID: ${newAction[0].id}\nParent: ${parentAction[0].data?.title}\nCreated: ${newAction[0].createdAt}`,
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
          
          // Create dependency directly without validation for now
          // (validation queries seem to be causing timeouts)
          
          const newEdge = await db
            .insert(edges)
            .values({
              src: depends_on_id,
              dst: action_id,
              kind: "depends_on",
            })
            .returning();

          console.log(`Created dependency:`, newEdge[0]);

          return {
            content: [
              {
                type: "text",
                text: `Created dependency: ${action_id} depends on ${depends_on_id}\nCreated: ${newEdge[0].createdAt}`,
              },
            ],
          };
        } catch (error) {
          console.error('Error creating dependency:', error);
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          return {
            content: [
              {
                type: "text",
                text: `Error creating dependency: ${error instanceof Error ? error.message : "Unknown error"}\nStack: ${error instanceof Error ? error.stack?.substring(0, 200) : 'No stack'}`,
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
          
          // Check that action exists
          const actionToDelete = await db.select().from(actions).where(eq(actions.id, action_id)).limit(1);
          
          if (actionToDelete.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: Action with ID ${action_id} not found`,
                },
              ],
            };
          }

          // Find all children (actions where this action is the parent)
          const childEdges = await db.select().from(edges).where(
            and(eq(edges.src, action_id), eq(edges.kind, "child"))
          );

          const childIds = childEdges.map(edge => edge.dst).filter((id): id is string => id !== null);
          
          // Handle children based on strategy
          if (child_handling === "delete_recursive" && childIds.length > 0) {
            // Recursively delete all children by deleting their edges first, then the actions
            // This is simpler than true recursion and avoids call stack issues
            const allDescendants = await getAllDescendants(childIds);
            
            // Delete all descendant actions (edges will cascade delete)
            for (const descendantId of allDescendants) {
              await db.delete(actions).where(eq(actions.id, descendantId));
            }
          } else if (child_handling === "reparent" && childIds.length > 0) {
            if (!new_parent_id) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Error: new_parent_id is required when child_handling is 'reparent'`,
                  },
                ],
              };
            }
            
            // Check that new parent exists
            const newParent = await db.select().from(actions).where(eq(actions.id, new_parent_id)).limit(1);
            if (newParent.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Error: New parent action with ID ${new_parent_id} not found`,
                  },
                ],
              };
            }

            // Update all child edges to point to new parent
            for (const childId of childIds) {
              if (childId) {
                await db.insert(edges).values({
                  src: new_parent_id,
                  dst: childId,
                  kind: "child",
                });
              }
            }
          }
          // For "orphan", we just delete the action and let cascade delete handle the edges

          // Delete the action (this will cascade delete all edges due to foreign key constraints)
          const deletedAction = await db.delete(actions).where(eq(actions.id, action_id)).returning();

          console.log(`Deleted action:`, deletedAction[0]);

          let message = `Deleted action: ${actionToDelete[0].data?.title}\nID: ${action_id}`;
          
          if (childIds.length > 0) {
            message += `\nChildren handled via ${child_handling}: ${childIds.length} child actions`;
            if (child_handling === "reparent" && new_parent_id) {
              const newParent = await db.select().from(actions).where(eq(actions.id, new_parent_id)).limit(1);
              message += `\nNew parent: ${newParent[0]?.data?.title}`;
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
          
          // Check that both actions exist
          const action = await db.select().from(actions).where(eq(actions.id, action_id)).limit(1);
          const dependsOn = await db.select().from(actions).where(eq(actions.id, depends_on_id)).limit(1);
          
          if (action.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: Action with ID ${action_id} not found`,
                },
              ],
            };
          }
          
          if (dependsOn.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: Dependency action with ID ${depends_on_id} not found`,
                },
              ],
            };
          }

          // Check if dependency exists
          const existingEdge = await db.select().from(edges).where(
            and(
              eq(edges.src, depends_on_id),
              eq(edges.dst, action_id),
              eq(edges.kind, "depends_on")
            )
          ).limit(1);

          if (existingEdge.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No dependency found: ${action[0].data?.title} does not depend on ${dependsOn[0].data?.title}`,
                },
              ],
            };
          }
          
          // Delete the dependency edge
          const deletedEdge = await db.delete(edges).where(
            and(
              eq(edges.src, depends_on_id),
              eq(edges.dst, action_id),
              eq(edges.kind, "depends_on")
            )
          ).returning();

          console.log(`Removed dependency:`, deletedEdge[0]);

          return {
            content: [
              {
                type: "text",
                text: `Removed dependency: ${action[0].data?.title} no longer depends on ${dependsOn[0].data?.title}\nRemoved: ${deletedEdge[0].createdAt}`,
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

    server.tool(
      "test_db_connection",
      "Test database connection and schema",
      {},
      async () => {
        try {
          console.log('Testing database connection...');
          
          // Try to query the actions table to see what columns exist
          const result = await db.select().from(actions).limit(1);
          
          return {
            content: [
              {
                type: "text",
                text: `Database connection successful. Found ${result.length} actions in database.`,
              },
            ],
          };
        } catch (error) {
          console.error('Database test error:', error);
          return {
            content: [
              {
                type: "text",
                text: `Database error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "test_simple_dependency",
      "Simple test to create a dependency without validation",
      {
        action_id: z.string().uuid(),
        depends_on_id: z.string().uuid(),
      },
      async ({ action_id, depends_on_id }) => {
        try {
          console.log('Simple dependency test starting...');
          
          const newEdge = await db
            .insert(edges)
            .values({
              src: depends_on_id,
              dst: action_id,
              kind: "depends_on",
            })
            .returning();

          console.log('Simple dependency created:', newEdge[0]);

          return {
            content: [
              {
                type: "text",
                text: `Simple dependency created successfully: ${depends_on_id} → ${action_id}`,
              },
            ],
          };
        } catch (error) {
          console.error('Simple dependency error:', error);
          return {
            content: [
              {
                type: "text",
                text: `Simple dependency error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        test_db_connection: {
          description: "Test database connection and schema",
        },
        test_simple_dependency: {
          description: "Simple test to create a dependency without validation",
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