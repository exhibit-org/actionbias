import { createMcpHandler } from "@vercel/mcp-adapter";
import { authenticatedHandler } from "../../../lib/mcp/auth";
import { registerResources, resourceCapabilities } from "../../../lib/mcp/resources";
import { registerTools, toolCapabilities } from "../../../lib/mcp/tools";
import { registerPrompts, promptCapabilities } from "../../../lib/mcp/prompts";

const handler = createMcpHandler(
  (server) => {
    registerResources(server);
    registerTools(server);
    registerPrompts(server);
  },
  {
    capabilities: {
      resources: resourceCapabilities,
      tools: toolCapabilities,
      prompts: promptCapabilities,
    },
  },
  {
    redisUrl: process.env.REDIS_URL,
    basePath: "/mcp",
    verboseLogs: true,
    maxDuration: 800,
  },
);

export async function GET(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  await params;
  return authenticatedHandler('GET', request, handler);
}

export async function POST(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  await params;
  return authenticatedHandler('POST', request, handler);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  await params;
  return authenticatedHandler('DELETE', request, handler);
}
