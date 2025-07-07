import { createMcpHandler } from "@vercel/mcp-adapter";
import { authenticatedHandler } from "../../../lib/mcp/auth";
import { registerResources, resourceCapabilities } from "../../../lib/mcp/resources";
import { registerTools, toolCapabilities } from "../../../lib/mcp/tools";
import { registerPrompts, promptCapabilities } from "../../../lib/mcp/prompts";

const handler = createMcpHandler(
  (server) => {
    console.log('[MCP HANDLER] Registering MCP server components...');
    registerResources(server);
    console.log('[MCP HANDLER] Resources registered');
    registerTools(server);
    console.log('[MCP HANDLER] Tools registered');
    registerPrompts(server);
    console.log('[MCP HANDLER] Prompts registered');
    console.log('[MCP HANDLER] All components registered successfully');
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
    maxDuration: 30,
  },
);

export async function GET(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  await params;
  return authenticatedHandler('GET', request, handler);
}

export async function POST(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  const resolvedParams = await params;
  console.log(`[MCP ROUTE] POST handler called for transport: ${resolvedParams.transport}`);
  console.log(`[MCP ROUTE] Request URL: ${request.url}`);
  
  const result = await authenticatedHandler('POST', request, handler);
  console.log(`[MCP ROUTE] Handler completed with status: ${result.status}`);
  return result;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  await params;
  return authenticatedHandler('DELETE', request, handler);
}
