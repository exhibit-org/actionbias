# Naming Strategy

This document clarifies the naming conventions used throughout the done.engineering project.

## Current Naming Structure

### User-Facing Brand
- **Primary Name**: `done.engineering`
- **Short Name**: `done`
- **Tagline**: "Done is the engine of more"
- **Description**: "The context layer for AI development"

### Technical Identifiers
- **MCP Server Name**: `done` (appears in Claude's MCP server list)
- **Package Name**: `next.js-mcp-server` (npm package.json)
- **GitHub Repository**: `exhibit-org/actionbias` (legacy - to be migrated)

### Configuration
All naming is centralized in `/lib/config/brand.ts`:

```typescript
export const BRAND = {
  name: 'done.engineering',        // Main brand name
  shortName: 'done',               // Short version
  fullName: 'done.engineering Intelligence Unit',
  mcpServerName: 'done',           // MCP server identifier
  technicalName: 'done',           // Technical references
  legacyName: 'ActionBias',        // Legacy support
}
```

## Usage Guidelines

1. **In UI Components**: Use `BRAND.name` for display
2. **In MCP Configuration**: Use `BRAND.mcpServerName`
3. **In Technical Contexts**: Use `BRAND.technicalName`
4. **For Formal Documents**: Use `BRAND.fullName`

## Migration Path

1. ✅ UI has been migrated to done.engineering
2. ✅ MCP server configuration uses consistent naming
3. ⏳ GitHub repository migration pending (actionbias → done-engineering)
4. ⏳ Package name update pending

## Rationale

The consolidation to "done.engineering" as the primary brand:
- Creates consistency across all touchpoints
- Aligns with the actual domain name
- Reduces confusion for users and developers
- Maintains backward compatibility through legacy references