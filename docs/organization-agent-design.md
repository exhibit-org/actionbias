# Organization Agent Design Document

## Overview

The Organization Agent is an AI-powered assistant designed to continuously improve the structure and organization of action hierarchies in the Done.engineering system. Rather than providing one-shot suggestions, it works iteratively to identify and fix organizational issues throughout the action graph.

## Top-Line Goal

**Enable users to maintain well-organized, semantically coherent action hierarchies through continuous AI-assisted reorganization.**

The agent acts as a "gardener" for the action tree, identifying areas that need attention and proposing specific, actionable improvements that users can approve or reject.

## Success Metrics

### Primary Metrics
1. **Organization Debt Reduction**
   - Decrease in orphan actions (actions with no parent)
   - Reduction in overcrowded parents (>15 children)
   - Fewer instances of very deep nesting (>5 levels)
   - Decrease in stale actions (incomplete for >30 days)

2. **Semantic Coherence**
   - Increase in average semantic similarity between siblings
   - Higher correlation between parent and child action titles/descriptions
   - Reduction in duplicate or near-duplicate actions

3. **User Engagement**
   - Acceptance rate of agent suggestions (target: >60%)
   - Time saved through automated organization
   - Reduction in manual reorganization tasks

### Secondary Metrics
- Average tree depth (target: 3-4 levels)
- Actions per parent (target: 5-10)
- Dependency graph complexity score
- Time to find related actions

## Core Agent Loop

```
1. SCAN: Select starting point
   - User-specified subtree
   - Areas with high "organization debt"
   - Recently modified sections
   - Random sampling for coverage

2. ANALYZE: Gather context and identify issues
   - Use analyze_subtree to get structural metrics
   - Use find_anomalies to identify specific problems
   - Use get_action_metrics to score organization quality
   - Use search_actions to find related/duplicate actions

3. PRIORITIZE: Rank issues by impact
   - Orphan actions (highest priority)
   - Duplicate actions
   - Misplaced actions (wrong parent)
   - Vague or unclear titles
   - Overcrowded parents
   - Stale actions

4. PROPOSE: Generate specific fixes
   - Move action to better parent (join_family)
   - Rename for clarity (update_action)
   - Merge duplicates
   - Split overcrowded parents
   - Create intermediate grouping levels

5. PRESENT: Show proposals to user
   - Clear explanation of the issue
   - Specific proposed fix
   - Reasoning and expected benefits
   - Preview of the new structure

6. EXECUTE: Apply approved changes
   - Make the structural changes
   - Log what was done and why (log_work)
   - Update metrics

7. LEARN: Track effectiveness
   - Monitor if changes stick or get reverted
   - Track which types of suggestions get accepted
   - Adjust thresholds and priorities

8. REPEAT: Move to next area
   - Continue until user stops
   - Or until diminishing returns
```

## Integration with UX

### Agent Activation
- **Manual Trigger**: "Organize this subtree" button in UI
- **Scheduled Runs**: Weekly organization review
- **Event-Driven**: After bulk imports or major changes
- **Continuous Mode**: Background analysis with batched suggestions

### User Interface
1. **Organization Dashboard**
   - Overview of organization health metrics
   - Heat map of areas needing attention
   - History of recent reorganizations

2. **Suggestion Queue**
   - List of pending suggestions
   - Batch approval/rejection
   - Preview before/after states
   - Undo recent changes

3. **Interactive Mode**
   - Chat-like interface for guided reorganization
   - Agent explains reasoning
   - User can request alternatives
   - Collaborative refinement

### Notification Strategy
- Daily digest of organization suggestions
- Real-time alerts for critical issues (orphan actions)
- Weekly organization health report
- Configurable notification preferences

## Implementation Phases

### Phase 1: Foundation (MVP)
- Implement the three analysis tools
- Basic agent loop with manual trigger
- Simple suggestion presentation
- Focus on orphan actions and duplicates

### Phase 2: Intelligence
- Semantic similarity analysis
- Smarter parent suggestions
- Batch operations
- Learning from user feedback

### Phase 3: Automation
- Background scanning
- Predictive organization (suggest structure for new actions)
- Custom organization rules
- Team-wide organization policies

## Example Agent Session

```
Agent: I've analyzed the "Product Development" subtree and found several organization issues:

1. 🔴 5 orphan actions that need parents
2. 🟡 "UI Tasks" has 23 children (recommended: <15)
3. 🟡 3 potential duplicate actions about "authentication"
4. 🔵 8 actions haven't been updated in 45+ days

Shall I start with the orphan actions? They're currently floating without any organizational context.

User: Yes, let's fix the orphan actions first.

Agent: Here are the 5 orphan actions and my suggested parents:

1. "Add user avatar upload" → Move under "User Profile Features"
   (Reason: 3 similar avatar-related tasks are already there)

2. "Fix login timeout bug" → Move under "Authentication / Bug Fixes"
   (Reason: Related to auth system, clearly a bug fix)

3. "Research GraphQL adoption" → Move under "Technical Research"
   (Reason: Matches pattern of other research tasks)

[Accept All] [Review Each] [Skip]

User: Review Each

Agent: "Add user avatar upload" - I suggest moving this under "User Profile Features" because:
- 3 existing avatar tasks are there: "Avatar cropping", "Avatar storage", "Default avatars"
- Semantic similarity score: 0.89
- Would group all avatar work together

[Accept] [Find Alternative] [Skip] [Create New Parent]
```

## Technical Requirements

### New MCP Tools Needed
1. `analyze_subtree` - Structural analysis tool
2. `find_anomalies` - Pattern detection tool  
3. `get_action_metrics` - Quality scoring tool

### Existing Tools Used
- `search_actions` - Find related/duplicate actions
- `suggest_parent` - Get parent recommendations
- `join_family` - Move actions
- `update_action` - Rename actions
- `create_action` / `delete_action` - Split/merge operations
- `log_work` - Track agent activity

### Performance Considerations
- Incremental analysis (don't scan entire tree at once)
- Cache similarity scores
- Batch API calls
- Rate limit agent operations
- Provide progress indicators

## Privacy and Control

### User Control
- Opt-in to agent assistance
- Granular permissions (view-only vs. can-modify)
- Excluded subtrees (mark as "do not organize")
- Approval required for all changes
- Easy undo/rollback

### Transparency
- Clear explanation for every suggestion
- Show confidence scores
- Link to similar past decisions
- Export organization history

## Future Enhancements

1. **Team Patterns**: Learn organization patterns from team behavior
2. **Templates**: Predefined organization structures for common project types
3. **Integration**: Connect with project management tools for auto-organization
4. **Predictive**: Suggest organization as actions are created
5. **Natural Language**: "Organize my actions related to mobile development"