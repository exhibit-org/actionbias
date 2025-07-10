# Organize Action Tool Implementation

## Overview
Implemented the `organize_action` tool and REST API endpoint that provides AI-powered suggestions for better organizing actions within the task hierarchy.

## What Was Built

### 1. MCP Tool: `organize_action`
- **Location**: `lib/mcp/tools.ts:1249-1377`
- **Purpose**: Analyze an action and provide suggestions for better organization
- **Parameters**:
  - `action_id` (required): UUID of the action to analyze
  - `scope`: Analysis scope (`action_only`, `include_siblings`, `include_subtree`)
  - `limit`: Maximum suggestions to return (1-10, default: 5)
  - `confidence_threshold`: Minimum confidence for suggestions (0-100, default: 40)

### 2. Service Method: `ActionsService.organizeAction`
- **Location**: `lib/services/actions.ts:2431-2646`
- **Features**:
  - Analyzes action context based on scope
  - Uses vector search to find similar actions
  - Leverages AI (GPT-4o-mini) to generate suggestions
  - Returns typed suggestions with confidence scores

### 3. REST API Endpoint
- **Endpoint**: `POST /api/actions/[id]/organize`
- **Location**: `app/api/actions/[id]/organize/route.ts`
- **Request Body**:
  ```json
  {
    "scope": "action_only" | "include_siblings" | "include_subtree",
    "limit": 1-10,
    "confidence_threshold": 0-100
  }
  ```
- **Response**: Organization suggestions with metadata

## Suggestion Types

The tool can suggest five types of organizational improvements:

1. **Move**: Relocate action to a more appropriate parent
2. **Rename**: Improve action title for clarity
3. **Split**: Break action into multiple smaller actions
4. **Merge**: Combine with similar/duplicate actions
5. **Reorder**: Change position among siblings

## Testing

- **Unit Tests**: `__tests__/lib/mcp/organize-action.test.ts`
  - Schema validation tests
  - Tool functionality tests
  
- **Integration Tests**: `__tests__/api/actions-organize.test.ts`
  - API endpoint tests
  - Error handling validation
  - Response format verification

## Usage Examples

### MCP Tool Usage:
```bash
mcp organize_action --action_id "bbc773a2-7d67-4f34-8b97-58c1b745babe" --scope "include_siblings"
```

### API Usage:
```bash
curl -X POST http://localhost:3000/api/actions/bbc773a2-7d67-4f34-8b97-58c1b745babe/organize \
  -H "Content-Type: application/json" \
  -d '{"scope": "include_siblings", "limit": 5}'
```

## Integration

- Integrated with existing MCP infrastructure
- Follows established patterns for tool definition and API endpoints
- Uses existing services (ActionsService, ActionSearchService)
- All tests passing with no breaking changes