# Naming Things: From Programmer‑to‑Programmer to Programmer‑to‑LLM Communication

## 1. Introduction
- Karlton's joke and why it still stings in 2025
- Preview: how *cache invalidation* became *context engineering* and how *naming* became a runtime control surface for AI

## 2. The Historical Hard Problems
### 2.1 Cache Invalidation in Traditional Systems
### 2.2 Naming for Human Collaboration
- Why these two persisted despite frameworks, ORMs, and code generators

## 3. Evolution #1 — Cache Invalidation → Context Engineering
### 3.1 What "Context" Means in LLM Workflows
### 3.2 The Property Trap
- Old world: data decorated with properties
- New world: context streams that reshape meaning
- **Code vignette:** from `project.deadline` to `urgencySignals`
### 3.3 Case Study: ActionBias at done.engineering
- How it captures, distills, and re‑injects context to steer next actions

## 4. Evolution #2 — Naming → Real‑Time AI Decision‑Making
### 4.1 Why Names Now Steer Execution Paths
- Variable, function, and endpoint names as hints to the agent
### 4.2 Failure modes when names mislead the model
### 4.3 Success patterns: lexical common‑sense, domain glossaries, intent‑rich verbs

## 5. Practical Playbook
### 5.1 Naming Principles for the AI Era
- Optimize for human *and* model comprehension
- Prefer intent verbs over container nouns
### 5.2 Context‑Engineering Techniques
- Sliding‑window memory, semantic pointers, summarization checkpoints
### 5.3 Migration Strategies for Existing Codebases
- "Rename‑and‑recontextualize" refactors
- Instrumentation to detect stale or missing context

## 6. Looking Forward
### 6.1 Co‑evolving with AI Feedback Loops
- LLMs suggesting better names, flagging ambiguous context
### 6.2 What Happens When We Solve (or Sidestep) These Two Problems
- Speculative future of adaptive schemas and self‑healing context

## 7. Conclusion
- Re‑state the thesis: the two hard things haven't disappeared—just leveled up
- Invitation for readers to share their own war stories or try ActionBias

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

---

*Note: The insights about properties vs. context were added based on a conversation about how semantic programming changes our approach to task management and naming conventions.*