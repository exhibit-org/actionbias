import { createMcpHandler } from "@vercel/mcp-adapter";
import { authenticatedHandler } from "../../../lib/mcp/auth";
import { registerResources, resourceCapabilities } from "../../../lib/mcp/resources";
import { registerTools, toolCapabilities } from "../../../lib/mcp/tools";

const handler = createMcpHandler(
  (server) => {
    registerResources(server);
    registerTools(server);
  },
  {
    capabilities: {
      resources: resourceCapabilities,
      tools: toolCapabilities,
    },
  },
  {
    redisUrl: process.env.REDIS_URL,
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  },
);

export async function GET(request: Request) {
  return authenticatedHandler('GET', request, handler);
}

export async function POST(request: Request) {
  return authenticatedHandler('POST', request, handler);
}

export async function DELETE(request: Request) {
  return authenticatedHandler('DELETE', request, handler);
}
