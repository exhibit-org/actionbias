import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { nodes, nodeDataSchema } from '../../db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "echo",
      "Echo a message",
      { message: z.string() },
      async ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }],
      })
    );

    server.tool(
      "create_node",
      "Create a new node in the database",
      {
        type: z.string().optional().describe("The type of the node"),
        title: z.string().min(1).describe("The title for the node"),
      },
      async ({ type, title }) => {
        try {
          const newNode = await db.insert(nodes).values({
            type,
            data: { title },
          }).returning();
          
          return {
            content: [{ 
              type: "text", 
              text: `Created node with ID: ${newNode[0].id}\nType: ${newNode[0].type || 'undefined'}\nTitle: ${newNode[0].data.title}` 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error creating node: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message",
        },
        create_node: {
          description: "Create a new node in the database",
        },
      },
    },
  },
  {
    redisUrl: process.env.REDIS_URL,
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
