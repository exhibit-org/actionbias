# ActionBias MCP Prompts

ActionBias provides built-in MCP prompts that you can execute directly in Claude Code. These prompts automatically pull in the right resources and perform intelligent analysis.

## Available MCP Prompts

### prioritize-work
Get intelligent work recommendations based on vision, momentum, and dependencies.
```
Use MCP prompt: prioritize-work
```

### next-action
Quickly find the most important next action to work on.
```
Use MCP prompt: next-action
```

### work-overview
Get a comprehensive overview of the current work state.
```
Use MCP prompt: work-overview
```

### analyze-blockers
Understand what dependencies are blocking progress.
```
Use MCP prompt: analyze-blockers
```

### action-context
Get full context on a specific action including dependencies and readiness.
```
Use MCP prompt: action-context
Parameters: action_id (UUID of the action)
```

### analyze-patterns
Analyze completed work patterns to identify process improvements.
```
Use MCP prompt: analyze-patterns
```

### start-session
Quick 3-line summary to start your work session.
```
Use MCP prompt: start-session
```

### find-related
Find actions related to a specific topic.
```
Use MCP prompt: find-related
Parameters: topic (e.g., "UI", "frontend", "API")
```

### claude-code-next-action
Structured prompt for detailed action summary (legacy).
```
Use MCP prompt: claude-code-next-action
Parameters: action_id (UUID of the action)
```

## Manual Prompts

You can also manually construct prompts using the MCP resources directly. Here are some examples:

## Intelligent Work Prioritization

To get intelligent work recommendations using Claude Code's analysis capabilities:

```
I need help prioritizing what to work on next in the ActionBias project. Please:

1. First, read the project vision using the context://vision MCP resource
2. Check recent momentum using the context://momentum MCP resource  
3. Get all workable actions using the action://workable MCP resource
4. Get a count of total incomplete actions using action://list with limit=1

Then analyze the workable actions and recommend the top 5 to work on based on:
- Strategic alignment with the DONE magazine vision
- Building on recent momentum and completed work
- Unlocking future work through dependencies
- Effort vs impact ratio
- Addressing technical debt or critical issues

For each recommendation, provide:
- The action title and description
- A score (0-100) 
- Clear reasoning for the score
- Category (strategic, quick-win, momentum, technical-debt)
- Estimated effort (low, medium, high)

Be selective with scoring - most actions should score 20-80, with 80+ reserved for truly critical work.
```

## Quick Next Action

For a simpler "what should I work on next" query:

```
What's the most important thing I should work on next? Use the action://workable resource to find available tasks and pick the top priority based on the project vision (context://vision).
```

## Understanding Current Work State

To get an overview of the current state:

```
Give me an overview of the current work state:
1. Use action://tree to show the hierarchical structure of incomplete work
2. Use context://momentum to show what's been recently completed
3. Use action://workable to show what's ready to work on
4. Summarize the key insights
```

## Checking Dependencies

To understand what's blocking progress:

```
I want to understand what's blocking progress. Please:
1. Use action://dependencies to see the dependency graph
2. Use action://workable to see what's actually workable
3. Identify the key blockers that would unlock the most work if completed
```

## Action Deep Dive

To get full context on a specific action:

```
I need full context on action [ACTION_ID]. Please:
1. Use action://item/{id} to get the action details
2. Show me the full parent chain and context
3. List all dependencies and dependents
4. Check if it appears in action://workable
5. Give me your assessment of whether this is ready to work on
```

## Work Log Analysis

To analyze completed work patterns:

```
Analyze our completed work patterns:
1. Use action://log to get recent completion logs
2. Use context://momentum to see recent activity
3. Identify patterns in:
   - What types of work we complete successfully
   - How long actions typically take
   - What we learn from completed work
4. Suggest process improvements based on these patterns
```

## Using Resources Efficiently

Remember that you can access multiple resources in parallel for better performance:

```
I'm starting my work session. Please quickly check:
- action://next for the recommended next action
- context://momentum for recent activity  
- action://workable to see all options

Give me a 3-line summary of what I should focus on.
```

## Custom Analysis

The power of this approach is that you can create custom analyses by combining resources:

```
I want to find all actions related to "UI" or "frontend". Please:
1. Get all workable actions from action://workable
2. Filter for ones that mention UI, frontend, or component in their title/description
3. Check context://vision to see if UI work aligns with current priorities
4. Rank them by importance
```

## Notes on Performance

- The `action://workable` resource returns all workable actions without filtering
- Client-side analysis in Claude Code is more flexible than server-side LLM calls
- Resources can be fetched in parallel for better performance
- Combine multiple resources for comprehensive analysis
- MCP prompts provide consistent, optimized queries for common tasks