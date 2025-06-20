# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js MCP (Model Context Protocol) server that implements ActionBias - an AI-forward planning platform for persistent task management across LLM conversations. The server uses the `@vercel/mcp-adapter` to expose intelligent action management tools via HTTP endpoints, including AI-powered semantic action placement, hierarchical task organization, and dependency tracking.

## Architecture

- **Core MCP Handler**: `app/[transport]/route.ts` contains the main MCP server setup using the Vercel adapter
- **Transport Support**: The `[transport]` dynamic route supports multiple MCP transport methods (SSE, HTTP streaming)
- **Database Layer**: PostgreSQL with Drizzle ORM for action storage and hierarchy management
- **AI Services**: LLM-powered semantic analysis for intelligent action placement using Vercel AI SDK
- **Action Management**: Hierarchical task system with parent-child relationships and dependency tracking
- **Tool Definition**: ActionBias tools are defined using Zod schemas in `lib/mcp/tools.ts`
- **Redis Integration**: SSE transport requires Redis (configured via `REDIS_URL` environment variable)

## Development Commands

```bash
# Setup and Development
pnpm install           # Install dependencies (project uses pnpm exclusively)
pnpm db:setup          # Setup local PGlite database for development
pnpm dev               # Start development server

# Database Management
pnpm db:migrate        # Run database migrations (requires DATABASE_URL)
pnpm db:migrate:safe   # Conditional migration (only if DATABASE_URL exists)

# Testing
pnpm test              # Run all tests
pnpm test:watch        # Run tests in watch mode
pnpm test:ci           # Run tests in CI mode with coverage
pnpm test:pre-commit   # Run pre-commit test suite

# Production
pnpm build             # Build for production (includes safe migration)
pnpm start             # Start production server

# MCP Server Testing
node scripts/test-client.mjs http://localhost:3000
node scripts/test-streamable-http-client.mjs http://localhost:3000
```

## Key Implementation Details

### MCP Server Configuration
- Tools are defined in the `createMcpHandler` callback in `app/[transport]/route.ts`
- ActionBias tools are registered via `registerTools()` from `lib/mcp/tools.ts`
- Server capabilities must be declared in the second parameter
- Configuration options include Redis URL, base path, verbose logging, and max duration

### Available MCP Tools
- **create_action**: Create new actions with optional parent and dependencies
- **update_action**: Update action properties including completion status
- **delete_action**: Delete actions with configurable child handling
- **add_dependency**: Create dependency relationships between actions
- **remove_dependency**: Remove dependency relationships
- **update_parent**: Move actions within the hierarchy
- **suggest_parent**: AI-powered intelligent action placement suggestions

### Adding New Tools
1. Define tool schema using Zod in `lib/mcp/tools.ts`
2. Implement the tool handler function using ActionsService
3. Add tool capability declaration in `toolCapabilities`
4. Register the tool in the `registerTools()` function

### Transport Endpoints
- SSE: `/sse` endpoint for Server-Sent Events transport
- HTTP Streaming: `/mcp` endpoint for streamable HTTP transport

### MCP Resources
- **action://tree**: Complete action hierarchy tree visualization
- **action://[id]**: Individual action details and context
- **action://dependencies/[id]**: Action dependency relationships
- **action://next**: Next recommended action to work on
- **actions://**: List of all actions with filtering options

### AI-Powered Features
- **Semantic Action Placement**: Uses OpenAI GPT-4o-mini for intelligent parent suggestions
- **Quality Analysis**: Automated content analysis and scoring
- **Hierarchy Optimization**: Smart reorganization suggestions
- **Context-Aware Suggestions**: Considers existing project structure and patterns

### Vercel Deployment Notes
- Requires Fluid compute enabled for efficient execution
- Set `maxDuration` to 800 for Pro/Enterprise accounts
- SSE transport requires Redis attachment via `REDIS_URL`
- Production database requires `DATABASE_URL` environment variable

## Deployment Workflow
- Repository: `exhibit-org/actionbias` on GitHub
- To test changes: push to main branch and wait ~60 seconds for Vercel deployment
- **Push Policy**: Push liberally as long as tests pass - don't wait for explicit permission to push changes that build successfully
- Pre-commit hooks run tests automatically to ensure code quality