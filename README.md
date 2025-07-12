# actions.engineering

**Your context, everywhere. Never start over again.**

The context layer for AI development that keeps your entire project history alive across Claude Code, Gemini CLI, and every AI tool. Stop losing context when switching between AI conversations. Actions are the engine of more.

## Core Value Propositions

- **Your context, everywhere** - Never lose progress between AI conversations
- **Works seamlessly** - Native integration with Claude Code, Gemini CLI, and all MCP-enabled tools
- **AI-powered intelligence** - Automatic task organization and dependency tracking
- **Actions are the engine of more** - Track completions, build momentum, share your journey

## Key Features

### Planning & Organization
- **Hierarchical Action Management**: Organize actions with family relationships that mirror real project structure
- **Intelligent Dependency Tracking**: Define what needs to happen before what - AI agents always know the right order
- **Cross-LLM Persistence**: Your project context works seamlessly across all AI assistants
- **MCP Integration**: Industry-standard Model Context Protocol for AI tool integration

### AI-Powered Intelligence
- **Semantic Action Placement**: AI suggests the perfect family for new actions based on project context
- **Context-Rich Prompt Generation**: Captures both vertical (family) and lateral (dependency) relationships
- **Quality Analysis**: Automated scoring and optimization suggestions
- **Smart Reorganization**: AI-powered hierarchy optimization recommendations

### Execution & Sharing
- **Completion Tracking**: Rich completion stories with implementation details, impact, and learnings
- **Shareable Changelogs**: Beautiful, viral-ready pages for individual completed actions
- **Public/Team/Private Visibility**: Control who sees your completion stories
- **Early Access Signup**: Landing page with email capture for building your waitlist

## Quick Start

### Development Setup

```bash
# Install dependencies
pnpm install

# Automated database setup (uses PGlite - no Docker required)
pnpm db:setup

# Start development server
pnpm dev
```

The automated setup uses **PGlite** - PostgreSQL compiled to WebAssembly:
- ✅ **Zero dependencies** - No Docker, no external services
- ✅ **Real PostgreSQL** - Full compatibility with production
- ✅ **In-process** - Runs entirely within your application
- ✅ **Persistent** - Data stored locally in `.pglite/` directory

### Production Deployment

actions.engineering is optimized for **Vercel deployment**:

1. Fork the repository
2. Connect to Vercel
3. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection (Neon, Supabase, etc.)
   - `REDIS_URL` - Optional, for SSE transport
   - `OPENAI_API_KEY` - For AI-powered features
4. Deploy!

## MCP Tools Available

actions.engineering exposes these tools via Model Context Protocol:

- **`create_action`** - Create actions with AI-suggested family placement
- **`update_action`** - Update action properties
- **`delete_action`** - Delete with configurable child handling
- **`add_dependency`** - Create dependency relationships
- **`remove_dependency`** - Remove dependencies
- **`complete_action`** - Mark complete with rich context stories
- **`uncomplete_action`** - Reopen completed actions
- **`join_family`** - Move actions between families
- **`search_actions`** - Semantic + keyword hybrid search

## MCP Resources

actions.engineering exposes these resources via Model Context Protocol:

### Action Management
- **`actions://list`** - List all actions
  - Query params: `?includeCompleted=true` (default: false)
- **`actions://tree`** - Hierarchical view of actions showing family relationships
  - Query params: `?includeCompleted=true` (default: false)
- **`actions://tree/{id}`** - Hierarchical view scoped to a specific subtree
  - Query params: `?includeCompleted=true` (default: false)
- **`actions://{id}`** - Individual action core data
- **`actions://context/{id}`** - Rich relationship context for agents

### Execution & Planning
- **`actions://next`** - Get the next action to work on based on dependencies
- **`actions://next/{id}`** - Get the next action within a specific subtree
- **`actions://dependencies`** - Dependency graph view
  - Query params: `?includeCompleted=true` (default: false)

### Completion Logs
- **`actions://done`** - Recent completion logs with pagination
  - Query params: `?limit=20&offset=0&visibility=public|team|private`
- **`actions://done/{id}`** - Completion log for a specific action

## Architecture

- **Next.js 15** - Modern web framework with App Router
- **Vercel AI SDK** - Unified interface for all LLM providers
- **PostgreSQL** - Battle-tested relational database with pgvector
- **Drizzle ORM** - Type-safe database operations
- **React Server Components** - Optimal performance and SEO
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - End-to-end type safety

## Development Workflow

```bash
# Run tests
pnpm test
pnpm test:watch

# Database migrations
pnpm db:migrate

# Type checking & linting
pnpm typecheck
pnpm lint

# Build for production
pnpm build
```

## API Endpoints

### Actions
- `GET /api/actions` - List actions with filtering
- `POST /api/actions` - Create new action
- `PUT /api/actions/[id]` - Update action
- `DELETE /api/actions/[id]` - Delete action

### Completion & Changelog
- `POST /api/actions/[id]/complete` - Complete with stories
- `POST /api/actions/[id]/uncomplete` - Reopen action
- `GET /api/changelog/[id]` - Get changelog item
- `GET /api/feed` - List changelog feed

### AI Features
- `POST /api/actions/search` - Semantic + keyword hybrid search

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...

# Optional
REDIS_URL=redis://...              # For SSE transport
OPENAI_API_KEY=sk-...             # For AI features
VERCEL_URL=https://...            # Auto-set on Vercel
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT - see [LICENSE](LICENSE) for details.

## Links

- [Homepage](https://actions.engineering)
- [GitHub](https://github.com/exhibit-org/actionbias)
- [Documentation](https://github.com/exhibit-org/actionbias/blob/main/README.md)

---

Built by engineers who ship. For engineers who ship.