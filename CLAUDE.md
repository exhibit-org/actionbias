# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js MCP (Model Context Protocol) server implementing actions.engineering - an AI-forward planning platform for persistent task management. Uses `@vercel/mcp-adapter` to expose action management tools via HTTP endpoints with hierarchical task organization and dependency tracking.

## Architecture

- **Core MCP Handler**: `app/mcp/[transport]/route.ts` - main MCP server setup
- **Database**: PostgreSQL with Drizzle ORM for action storage and hierarchy management
- **AI Services**: LLM-powered semantic analysis using Vercel AI SDK
- **Tool Definition**: MCP tools defined using Zod schemas in `lib/mcp/tools.ts`
- **Redis Integration**: Required for SSE transport (`REDIS_URL` environment variable)

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

# Production
pnpm build             # Build for production (includes safe migration)
pnpm start             # Start production server

# MCP Server Testing
node scripts/test-client.mjs http://localhost:3000
node scripts/test-streamable-http-client.mjs http://localhost:3000
```

## Key Implementation Details

### MCP Tools
- **create_action**: Create actions with optional parent and dependencies (auto-creates parent→child dependency)
- **update_action**: Update action properties including completion status
- **delete_action**: Delete actions with configurable child handling
- **add_dependency/remove_dependency**: Manage dependency relationships
- **join_family**: Move actions within hierarchy (auto-manages dependencies)

### Adding New Tools
1. Define tool schema using Zod in `lib/mcp/tools.ts`
2. Implement handler function using ActionsService
3. Add tool capability declaration in `toolCapabilities`
4. Register the tool in `registerTools()` function

### MCP Resources
- **action://list**: List all actions with pagination (excludes completed by default)
- **action://tree**: Complete action hierarchy tree visualization
- **action://tree/{id}**: Hierarchical view within specific subtree
- **action://dependencies**: Dependency graph showing all dependencies and dependents
- **action://item/{id}**: Individual action details with relationships
- **action://log**: Recent completion logs with pagination and visibility filtering
- **action://log/{id}**: Completion log for specific action

### Core Services Architecture
- **ActionsService** (`actions.ts`): Core action CRUD operations and hierarchical management
- **EmbeddingsService** (`embeddings.ts`): Vector embedding generation for semantic search
- **VectorService** (`vector.ts`): Similarity search and semantic matching
- **CompletionContextService** (`completion-context.ts`): Rich completion stories with editorial content
- **ContextService** (`context.ts`): Assembles comprehensive relationship context for actions

### Database Schema (Drizzle ORM)
- **actions**: Core action data with embedded vectors and AI-generated summaries
- **edges**: Relationship graph for dependencies and hierarchies (src, dst, kind)
- **completionContexts**: Rich completion stories with editorial content

### Testing Architecture
- Jest with custom setup for different environments
- Database tests use PGlite for lightweight PostgreSQL compatibility
- React component tests use jsdom environment
- Jest configured with limited workers (`maxWorkers: 2`) to prevent crashes

## Deployment Workflow
- Repository: `exhibit-org/actionbias` on GitHub
- To test changes: push to main branch and wait ~60 seconds for Vercel deployment
- **Push Policy**: Push liberally as long as tests pass and commit frequently for incremental progress
- Pre-commit hooks run tests automatically to ensure code quality

## Development Guidelines for Claude

### Core Philosophy
**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every single line of production code must be written in response to a failing test.

Follow Red-Green-Refactor strictly:
1. **Red**: Write a failing test for the desired behavior. NO PRODUCTION CODE until you have a failing test.
2. **Green**: Write the MINIMUM code to make the test pass.
3. **Refactor**: Assess code for improvement opportunities. Only refactor if it adds clear value.

### Key Principles
- Write tests first (TDD)
- Test behavior, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always
- Use real schemas/types in tests, never redefine them

### TypeScript Guidelines
- **No `any`** - ever. Use `unknown` if type is truly unknown
- **No type assertions** (`as SomeType`) unless absolutely necessary with clear justification
- **Prefer `type` over `interface`** in all cases
- Use Zod schemas first, then derive types from them

### Schema-First Development
Always define schemas first, then derive types:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});

type User = z.infer<typeof UserSchema>;
```

### Code Style
- **No data mutation** - work with immutable data structures
- **Pure functions** wherever possible
- **No nested if/else statements** - use early returns or guard clauses
- **No comments in code** - code should be self-documenting
- **Prefer options objects** for function parameters (except single-parameter functions)

### Test Data Pattern
Use factory functions with optional overrides:

```typescript
const getMockUser = (overrides?: Partial<User>): User => {
  return {
    id: "user_123",
    email: "test@example.com", 
    name: "Test User",
    ...overrides,
  };
};
```

### Refactoring Guidelines
- Always commit working code before refactoring
- Only abstract when code shares semantic meaning (not just structural similarity)
- DRY is about knowledge, not code structure
- Maintain external APIs during refactoring
- Run all tests after refactoring - they must pass without modification

### Common Anti-patterns to Avoid
```typescript
// Avoid: Mutation
const addItem = (items: Item[], newItem: Item) => {
  items.push(newItem); // Mutates array
  return items;
};

// Prefer: Immutable update
const addItem = (items: Item[], newItem: Item): Item[] => {
  return [...items, newItem];
};

// Avoid: Nested conditionals
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// Prefer: Early returns
if (!user || !user.isActive || !user.hasPermission) {
  return;
}
// do something
```

### Working with Claude Expectations
1. **ALWAYS FOLLOW TDD** - No production code without a failing test
2. **Start with a failing test** - always. No exceptions.
3. After making tests pass, always assess refactoring opportunities
4. Respect existing patterns and conventions
5. Keep changes small and incremental
6. Ensure all TypeScript strict mode requirements are met

**If you find yourself writing production code without a failing test, STOP immediately and write the test first.**

## Important Notes
- Use pnpm exclusively for package management
- The project uses TypeScript throughout with strict type checking
- All new code should include appropriate tests
- MCP protocol compliance is critical - test with provided scripts
- AI services require OpenAI API key for semantic features