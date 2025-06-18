# ActionBias MCP Server

A next-generation **AI-forward planning system** that enables persistent, cross-LLM project management through the Model Context Protocol (MCP). ActionBias transforms ephemeral AI conversations into a durable planning platform where any LLM (Claude, ChatGPT, etc.) can understand context, build upon existing plans, and maintain continuity across sessions.

**Core Value**: Turn "Hey, save this to the project plan" into a reality that actually works across different AI tools and conversations.

Built with Next.js, PostgreSQL, Drizzle ORM, and the **Vercel AI SDK** for production-ready scalability and seamless AI integration.

## Features

### Current Capabilities
- **Hierarchical Action Management**: Create, update, and organize actions with parent-child relationships
- **Dependency Tracking**: Define and manage complex action dependencies  
- **Completion Tracking**: Mark actions as done/not done with intelligent filtering
- **Cross-LLM Persistence**: Maintain planning context across different AI conversations
- **MCP Integration**: Standardized interface for AI assistants via Model Context Protocol
- **REST API**: Full HTTP API for programmatic access
- **Authentication**: OAuth-style token authentication for secure access

### AI-Forward Roadmap
- **Auto-Generation**: AI-powered creation of titles, descriptions, and metadata
- **Intelligent Prompts**: Context-aware guidance for LLMs working with plans
- **Multi-Tenancy**: Secure organization-based access control and collaboration
- **Advanced Analytics**: Usage insights and planning optimization recommendations

## Current Roadmap

ActionBias follows a structured development approach moving from single-player validation to production-ready distribution:

### 🎯 Cross-LLM Persistent Planning System
*A planning system where any LLM can understand context, refer to existing plans, add to them intelligently, and maintain continuity across conversations*

#### 🏗️ Single-Player Prototype
- ✅ Core action management with hierarchical relationships  
- ✅ Dependency tracking and completion status
- ✅ MCP server integration with standardized tools
- 🔄 **Understand prompts and integrate into MCP server** (In Progress)
- 📋 Enhanced AI capabilities and user experience improvements

#### 🚀 AI Forward Initiatives  
- 📋 **Auto-generation**: AI-powered titles, descriptions, and metadata via Vercel AI SDK
- 📋 Context-aware prompts for improved LLM interactions
- 📋 Intelligent planning suggestions and optimizations
- 📋 Multi-provider LLM support through Vercel AI SDK unified interface

#### 🏢 Broader Distribution
- 📋 **Authorization & Multi-Tenancy**: JWT authentication, RBAC, organization management
- 📋 Production monitoring, audit logging, and security hardening
- 📋 Billing integration and usage analytics
- 📋 Team collaboration features

*Legend: ✅ Complete | 🔄 In Progress | 📋 Planned*

## Quick Setup

### For Codex/Automated Environments

```bash
# Install dependencies
pnpm install

# Automated database setup (no prompts, no Docker)
pnpm db:setup

# Start development (no migrations needed)
pnpm dev
```

The automated setup uses **PGlite** - PostgreSQL compiled to WebAssembly:
- ✅ **Zero dependencies** - No Docker, no external services
- ✅ **Real PostgreSQL** - Full compatibility with production
- ✅ **In-process** - Runs entirely within your application
- ✅ **Persistent** - Data stored locally in `.pglite/` directory

### Interactive Setup (Manual)

```bash
# Install dependencies  
pnpm install

# Interactive database setup with multiple options
pnpm db:setup-interactive

# Follow prompts to choose from:
# - Neon (free tier with branching)
# - Supabase (free tier)  
# - Railway (free tier)
# - Local PostgreSQL

# Run migrations and start
pnpm db:migrate
pnpm dev
```

### Testing

```bash
# Tests use the same DATABASE_URL (or can use TEST_DATABASE_URL)
pnpm test

# Run tests in watch mode  
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Available Scripts

- `pnpm dev` - Start development server (requires DATABASE_URL)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests (requires DATABASE_URL)
- `pnpm db:migrate` - Run database migrations
- `pnpm db:setup` - Automated PGlite setup (no prompts, no Docker)
- `pnpm db:setup-interactive` - Interactive database setup guide

## MCP Tools

The server provides these MCP tools for AI assistants:

- **`create_action`** - Create actions with optional parent and dependencies
- **`update_action`** - Update action title and/or completion status  
- **`delete_action`** - Delete actions with child handling options
- **`add_dependency`** - Create dependency relationships
- **`remove_dependency`** - Remove dependency relationships

## MCP Resources

- **`action://list`** - List all actions with pagination and filtering
- **`action://tree`** - Hierarchical view of actions and relationships
- **`action://dependencies`** - Dependency graph view
- **`action://{id}`** - Individual action details with relationships

## API Endpoints

- `GET /api/actions` - List actions
- `POST /api/actions` - Create action
- `PUT /api/actions/{id}` - Update action
- `DELETE /api/actions/{id}` - Delete action
- `POST /api/actions/children` - Create child action
- `POST /api/actions/dependencies` - Add dependency
- `DELETE /api/actions/dependencies` - Remove dependency

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for SSE transport (optional)
- `VERCEL_URL` - Deployment URL (auto-set on Vercel)

## Architecture

- **Next.js** - Web framework with API routes, optimized for Vercel deployment
- **Vercel AI SDK** - Unified LLM interface supporting OpenAI, Anthropic, and other providers
- **PostgreSQL** - Primary database (PGlite for dev, cloud for production)
- **PGlite** - PostgreSQL in WebAssembly for development (zero dependencies)
- **Drizzle ORM** - Type-safe database operations
- **@vercel/mcp-adapter** - MCP protocol implementation
- **Zod** - Runtime type validation

## Deployment

ActionBias is **optimized for Vercel deployment** with first-class support for:
- **Vercel Functions** - Serverless API routes with optimal performance
- **Vercel AI SDK** - Native integration for LLM providers and streaming responses
- **PostgreSQL database** - Neon, Supabase, or other Vercel-compatible providers
- **Redis** - Optional for SSE transport (Vercel KV recommended)
- **Automatic migrations** - Database schema updates on deployment
- **Edge Runtime** - Global distribution for low-latency AI interactions

## Sample Client

Test the MCP server using the included client:

```bash
node scripts/test-client.mjs http://localhost:3000
```
