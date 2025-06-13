# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js MCP (Model Context Protocol) server that uses the `@vercel/mcp-adapter` to expose MCP tools via HTTP endpoints. The server implements a simple echo tool as an example and can be extended with additional tools, prompts, and resources.

## Architecture

- **Core MCP Handler**: `app/[transport]/route.ts` contains the main MCP server setup using the Vercel adapter
- **Transport Support**: The `[transport]` dynamic route supports multiple MCP transport methods (SSE, HTTP streaming)
- **Tool Definition**: Tools are defined using Zod schemas for input validation and registered with the MCP server
- **Redis Integration**: SSE transport requires Redis (configured via `REDIS_URL` environment variable)

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Test MCP server with SSE transport
node scripts/test-client.mjs http://localhost:3000

# Test MCP server with HTTP streaming transport
node scripts/test-streamable-http-client.mjs http://localhost:3000
```

## Key Implementation Details

### MCP Server Configuration
- Tools are defined in the `createMcpHandler` callback in `app/[transport]/route.ts`
- Server capabilities must be declared in the second parameter
- Configuration options include Redis URL, base path, verbose logging, and max duration

### Adding New Tools
1. Define tool schema using Zod in the server setup
2. Implement the tool handler function
3. Add tool capability declaration
4. Export the handler for GET, POST, and DELETE methods

### Transport Endpoints
- SSE: `/sse` endpoint for Server-Sent Events transport
- HTTP Streaming: `/mcp` endpoint for streamable HTTP transport

### Vercel Deployment Notes
- Requires Fluid compute enabled for efficient execution
- Set `maxDuration` to 800 for Pro/Enterprise accounts
- SSE transport requires Redis attachment via `REDIS_URL`

## Deployment Workflow
- To test out a change we've made to the actionbias MCP server, we have to push the code to the main branch and wait about 60 seconds for Vercel to deploy the new version of the code