# ActionBias MCP Server

An MCP (Model Context Protocol) server that provides AI assistants with tools and resources to manage hierarchical action items with dependencies and completion tracking. Built with Next.js, PostgreSQL, and Drizzle ORM.

## Features

- **Action Management**: Create, update, and organize actions with hierarchical relationships
- **Dependencies**: Define and manage action dependencies  
- **Completion Tracking**: Mark actions as done/not done with filtering capabilities
- **MCP Integration**: Standardized interface for AI assistants via Model Context Protocol
- **REST API**: Full HTTP API for all operations
- **Authentication**: OAuth-style token authentication

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

- **`actions://list`** - List all actions with pagination and filtering
- **`actions://tree`** - Hierarchical view of actions and relationships
- **`actions://dependencies`** - Dependency graph view
- **`actions://{id}`** - Individual action details with relationships

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

- **Next.js** - Web framework with API routes
- **PostgreSQL** - Primary database (PGlite for dev, cloud for production)
- **PGlite** - PostgreSQL in WebAssembly for development (zero dependencies)
- **Drizzle ORM** - Type-safe database operations
- **@vercel/mcp-adapter** - MCP protocol implementation
- **Zod** - Runtime type validation

## Deployment

The app is designed to deploy on Vercel with:
- PostgreSQL database (Neon, Supabase, etc.)
- Optional Redis for SSE transport
- Automatic migrations on build

## Sample Client

Test the MCP server using the included client:

```bash
node scripts/test-client.mjs http://localhost:3000
```
