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