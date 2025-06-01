import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { actions, actionDataSchema } from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "create_action",
      "Create a new action in the database",
      {
        title: z.string().min(1).describe("The title for the action"),
      },
      async ({ title }) => {
        try {
          const newAction = await db
            .insert(actions)
            .values({
              id: crypto.randomUUID(),
              data: { title },
            })
            .returning();

          return {
            content: [
              {
                type: "text",
                text: `Created action with ID: ${newAction[0].id}\nTitle: ${newAction[0].data?.title || "untitled"}\nCreated: ${newAction[0].createdAt}`,
              },
            ],
          };
        } catch (error) {
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
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
