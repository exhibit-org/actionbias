# MCP Resource System Redesign Proposal

## Executive Summary

This proposal redesigns ActionBias's MCP interface to maximize functionality for MCP clients while maintaining clear separation between tools, resources, and prompts. The design emphasizes predictable URI patterns, progressive disclosure, and efficient navigation.

## Core Design Principles

1. **Resources are for reading, Tools are for writing**
   - Resources: Stateless data retrieval (GET-like operations)
   - Tools: State changes and computations (POST/PUT/DELETE-like operations)

2. **Path parameters define identity, query parameters modify presentation**
   - Path: What resource you want
   - Query: How you want it (filtering, pagination, depth)

3. **Progressive disclosure through URI hierarchy**
   - Start broad: `action://list`
   - Narrow down: `action://list?status=pending`
   - Get specific: `action://item/abc-123`

4. **Tools return resource URIs for client expansion**
   - Tools perform operations and return references
   - Clients can choose to fetch full resource data

## Proposed Resource Structure

### 1. Action Data Resources

```
action://item/{id}
```
- **Purpose**: Comprehensive single action data
- **Returns**: Full action details, family context, dependencies, completion logs
- **Use case**: When you need everything about one action

```
action://summary/{id}
```
- **Purpose**: Lightweight action summary
- **Returns**: Title, status, family path, completion state
- **Use case**: Quick reference without full context

### 2. List Resources

```
action://list?
  status=(pending|completed|all)     # default: pending
  family={id}                        # filter by family
  has_dependencies=(true|false)      # filter by dependency status
  sort=(created|updated|title)       # default: updated
  order=(asc|desc)                   # default: desc
  limit={number}                     # default: 20
  offset={number}                    # default: 0
```
- **Purpose**: Paginated, filterable action lists
- **Returns**: Array of action summaries with pagination metadata
- **Use case**: Browsing, searching, filtering actions

### 3. Tree Resources

```
action://tree?
  depth={number}                     # default: 3, max: 10, 0=unlimited
  include_completed=(true|false)     # default: false
  format=(full|compact)              # default: compact
```
- **Purpose**: Full hierarchical view
- **Returns**: Tree structure with configurable depth
- **Use case**: Understanding overall project structure

```
action://tree/{rootId}?
  depth={number}                     # default: 3, max: 10, 0=unlimited
  include_completed=(true|false)     # default: false
  format=(full|compact)              # default: compact
```
- **Purpose**: Scoped hierarchical view
- **Returns**: Subtree starting from specified root
- **Use case**: Focusing on specific area of project

### 4. Execution Resources

```
action://next?
  limit={number}                     # default: 1, max: 10
  scope={id}                         # optional: limit to subtree
```
- **Purpose**: Get actionable items based on dependencies
- **Returns**: Ordered list of next actions with rationale
- **Use case**: "What should I work on next?"

```
action://parallel?
  limit={number}                     # default: 5
  scope={id}                         # optional: limit to subtree
```
- **Purpose**: Get actions that can be worked on simultaneously
- **Returns**: List of independent actions
- **Use case**: Distributing work across team/agents

### 5. Completion Log Resources

```
action://log?
  limit={number}                     # default: 20
  offset={number}                    # default: 0
  visibility=(public|team|private|all) # default: all
  family={id}                        # filter by family
  since={iso-date}                   # filter by date
```
- **Purpose**: Browse completion history
- **Returns**: Paginated changelog entries
- **Use case**: Understanding project progress

```
action://log/{actionId}
```
- **Purpose**: Get specific completion log
- **Returns**: Full completion context for one action
- **Use case**: Deep dive into how something was done

### 6. Analytics Resources

```
action://stats?
  scope={id}                         # optional: limit to subtree
  period=(day|week|month|all)        # default: all
```
- **Purpose**: Project statistics and velocity
- **Returns**: Completion rates, velocity trends, bottlenecks
- **Use case**: Project health monitoring

## Proposed Tool Adjustments

### Navigation Tools

```typescript
tool: find_actions
input: {
  query: string,           // semantic search
  status?: "pending" | "completed" | "all",
  family_id?: string,
  limit?: number
}
output: {
  actions: Array<{
    id: string,
    title: string,
    resource_uri: string   // e.g., "action://item/abc-123"
  }>,
  total: number
}
```
**Purpose**: Semantic search that returns resource URIs for expansion

```typescript
tool: get_next_actions
input: {
  scope_id?: string,       // optional subtree
  limit?: number           // how many to return
}
output: {
  actions: Array<{
    id: string,
    title: string,
    reason: string,        // why this is next
    resource_uri: string
  }>
}
```
**Purpose**: Compute next actions algorithmically

### State Change Tools

Keep existing tools but enhance responses:
- `create_action` returns `resource_uri: "action://item/{new-id}"`
- `complete_action` returns `log_uri: "action://log/{action-id}"`
- `update_action` returns `resource_uri: "action://item/{id}"`

## MCP Client Usage Patterns

### Pattern 1: Browse and Explore
```
1. Client fetches action://tree?depth=2
2. User clicks on interesting branch
3. Client fetches action://tree/{id}?depth=3
4. User selects specific action
5. Client fetches action://item/{id}
```

### Pattern 2: Task-Oriented
```
1. LLM calls tool: get_next_actions
2. Tool returns URIs for next actions
3. Client fetches action://item/{id} for selected action
4. User works on action
5. LLM calls tool: complete_action
```

### Pattern 3: Search and Filter
```
1. LLM calls tool: find_actions with semantic query
2. Tool returns matching action URIs
3. Client fetches multiple action://summary/{id} for overview
4. Client fetches action://item/{id} for selected item
```

## Migration Strategy

1. **Phase 1**: Implement new resource structure alongside existing
2. **Phase 2**: Update tools to return resource URIs
3. **Phase 3**: Deprecate old resource patterns
4. **Phase 4**: Remove deprecated resources

## Benefits of This Design

1. **Predictable URIs**: Clients can construct URIs without discovery
2. **Progressive Disclosure**: Start broad, drill down as needed
3. **Efficient Navigation**: Multiple ways to find what you need
4. **Clear Separation**: Resources for reading, tools for writing
5. **Scalable**: Pattern extends naturally to new resource types
6. **Cache-Friendly**: Resource URIs can be bookmarked and cached

## Open Questions

1. Should we support content negotiation (JSON vs. markdown)?
2. Should resource URIs include version numbers for stability?
3. How should we handle resource permissions/visibility?
4. Should we add WebSocket resources for real-time updates?

## Next Steps

1. Validate design with MCP client usage patterns
2. Prototype key resources to test ergonomics
3. Build migration plan maintaining backward compatibility
4. Update documentation and examples