# Naming Things: From Programmer-to-Programmer to Programmer-to-LLM Communication

## Thesis Statement

**Phil Karlton's classic programming joke—"There are only two hard things in computer science: cache invalidation and naming things"—has proven prophetic in the AI era. These remain the only two hard things, but their nature has fundamentally transformed:**

1. **Cache invalidation has become Context Engineering**: What we once called caching is now about maintaining coherent context across LLM interactions. Systems like ActionBias capture idea context and distill it into actionable steps, ensuring the right context flows through each phase of development and summarization.

2. **Naming things now directly impacts software execution**: Names no longer just affect code evolution and human understanding—they actively influence AI decision-making and workflow execution in real-time. Poor naming breaks AI systems; good naming enables them.

**The joke endures because we've discovered these aren't just development challenges—they're the fundamental problems of information systems working with intelligent agents.**

## Outline

### I. The Enduring Truth: Why These Two Problems Persist
- Phil Karlton's prescient observation and why it remains accurate
- The fundamental nature of cache invalidation and naming as information management problems
- How these challenges scale with system complexity
- Why no amount of tooling has eliminated either challenge

### II. Evolution 1: Cache Invalidation → Context Engineering
- Traditional caching: data freshness and consistency
- Modern challenge: maintaining coherent context across AI interactions
- Context Engineering as a discipline: capturing, distilling, and propagating semantic meaning
- Case study: ActionBias as a context engineering system
- The shift from "Is this data current?" to "Is this context sufficient for decision-making?"

#### The Property Trap: Why We No Longer Decorate Tasks with Data

In the heuristic programming era, we encoded decision-making data as properties:
- `task.priority = "high"`
- `project.deadline = "2024-12-19"`
- `milestone.status = "at-risk"`

This forced us to:
1. Constantly update these properties as circumstances changed
2. Build complex cache invalidation logic when properties became stale
3. Create rigid schemas that couldn't adapt to new types of context

**The semantic shift**: In AI-driven systems, we recognize that "Ralph moved the deadline to Dec 12th" isn't a property of the project—it's a property of the context the project lives within. The deadline didn't change; our understanding of urgency did.

Instead of:
```javascript
// Old paradigm: Properties as data
project.updateDeadline("2024-12-12");
cache.invalidate(project.id);
tasks.reprioritize();
```

We now have:
```javascript
// New paradigm: Context as input
const urgencyContext = [
  "Ralph moved the deadline for Project ABC to Dec 12th",
  "Customer reported critical bug in production",
  "Team velocity decreased due to illness"
];
const nextAction = await ai.determineNextAction(allActions, urgencyContext);
```

This fundamentally changes naming from nouns (properties) to concepts (contexts):
- ❌ `task.priority`, `project.deadline`, `issue.severity`
- ✅ `urgencySignals`, `contextualConstraints`, `environmentalFactors`

### III. Evolution 2: Naming Things → Runtime AI Decision-Making
- Traditional challenge: Programmer-to-programmer communication
- Historical focus on human readability and maintainability
- Modern reality: names directly impact AI execution paths
- Examples of naming conventions designed for human cognition vs. AI comprehension

### IV. The Convergence: Why We Almost Have Nothing Else
- Most traditional programming challenges have been abstracted away by frameworks and tools
- Cache invalidation/Context Engineering and Naming remain irreducible
- The AI era has amplified rather than solved these core problems
- Why these challenges become more critical, not less, as systems become more intelligent

### V. Practical Implications: The New Reality
- When poor naming breaks AI workflows
- Examples of how descriptive names improve AI decision-making:
  - API endpoint naming affecting AI route selection
  - Variable names guiding AI refactoring decisions  
  - Function names enabling AI to understand intent
- The difference between "Done" vs "ActionBias" vs "Tasks" in AI context

### IV. New Naming Principles for the AI Era
- Optimize for both human and machine understanding
- Lexical common-sense as a design principle
- Domain-specific terminology that AI can map to concepts
- Avoiding ambiguous or context-dependent names

#### From Properties to Contexts: A Naming Revolution

The shift from heuristic to semantic programming demands new naming conventions:

**Old World (Properties as Nouns)**:
- `task.priority` - suggests a fixed attribute
- `project.deadline` - implies ownership by the project
- `user.permissions` - static assignment

**New World (Contexts as Concepts)**:
- `workPressureSignals` - dynamic environmental input
- `temporalConstraints` - fluid time-based considerations  
- `accessContext` - situational authorization factors

This isn't just stylistic—it reflects a fundamental truth: **In semantic systems, the context IS the data**. When we name things as if they own their properties, we create brittle systems that require constant maintenance. When we name things as contextual inputs, we create flexible systems that adapt to changing circumstances without code changes.

### V. Practical Guidelines
- Naming conventions that enhance AI comprehension
- Tools and practices for evaluating semantic clarity
- Balancing brevity with descriptiveness in the AI context
- Migration strategies for existing codebases

### VI. The Future: Co-evolution of Human and AI Understanding
- How AI feedback can improve our naming choices
- The potential for AI-assisted naming suggestions
- Long-term implications for software architecture and design

---

*This represents a fundamental shift in how we think about code as communication—not just between humans across time, but between humans and AI in real-time collaboration.*