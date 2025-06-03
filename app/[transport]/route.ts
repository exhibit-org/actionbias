import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { actions, actionDataSchema } from "../../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const handler = createMcpHandler(
  (server) => {
    console.log('MCP server initialized with dynamic transport');
    
    server.tool(
      "create_action",
      "Create a new action in the database",
      {
        title: z.string().min(1).describe("The title for the action"),
      },
      async ({ title }) => {
        try {
          console.log(`Creating action with title: ${title}`);
          
          const newAction = await db
            .insert(actions)
            .values({
              id: crypto.randomUUID(),
              data: { title },
            })
            .returning();

          console.log(`Created action:`, newAction[0]);

          return {
            content: [
              {
                type: "text",
                text: `Created action with ID: ${newAction[0].id}\nTitle: ${newAction[0].data?.title || "untitled"}\nCreated: ${newAction[0].createdAt}`,
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
  },
  {
    capabilities: {
      tools: {
        create_action: {
          description: "Create a new action in the database",
        },
        list_actions: {
          description: "List all actions in the database",
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