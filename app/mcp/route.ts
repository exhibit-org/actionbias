import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { actions, actionDataSchema } from "../../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const handler = createMcpHandler(
  (server) => {
    console.log('MCP server initialized at /mcp');
    
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
  },
  {
    capabilities: {
      tools: {
        create_action: {
          description: "Create a new action in the database",
        },
      },
    },
  },
  {
    redisUrl: process.env.REDIS_URL,
    basePath: "", // No basePath since we're at /mcp
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
  console.log(`[MCP Auth] ${method} request received`);
  
  if (!validateAuth(request)) {
    console.log('[MCP Auth] Authentication failed');
    return new Response('Unauthorized', { status: 401 });
  }
  
  console.log('[MCP Auth] Authentication successful');
  
  // Handle GET requests for MCP initialization/discovery
  if (method === 'GET') {
    console.log('[MCP Auth] Handling GET request for MCP initialization');
    return new Response(JSON.stringify({
      capabilities: {
        tools: {
          create_action: {
            description: "Create a new action in the database"
          }
        }
      },
      serverInfo: {
        name: "ActionBias MCP Server", 
        version: "0.1.0"
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
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