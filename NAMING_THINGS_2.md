# Naming Things: From Programmer‑to‑Programmer to Programmer‑to‑LLM Communication

## 1. Introduction
- Karlton’s joke and why it still stings in 2025
- Preview: how *cache invalidation* became *context engineering* and how *naming* became a runtime control surface for AI

## 2. The Historical Hard Problems
### 2.1 Cache Invalidation in Traditional Systems
### 2.2 Naming for Human Collaboration
- Why these two persisted despite frameworks, ORMs, and code generators

## 3. Evolution #1 — Cache Invalidation → Context Engineering
### 3.1 What “Context” Means in LLM Workflows
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
- “Rename‑and‑recontextualize” refactors
- Instrumentation to detect stale or missing context

## 6. Looking Forward
### 6.1 Co‑evolving with AI Feedback Loops
- LLMs suggesting better names, flagging ambiguous context
### 6.2 What Happens When We Solve (or Sidestep) These Two Problems
- Speculative future of adaptive schemas and self‑healing context

## 7. Conclusion
- Re‑state the thesis: the two hard things haven’t disappeared—just leveled up
- Invitation for readers to share their own war stories or try ActionBias

*Side‑bar: “How ActionBias Implements This”*
A boxed call‑out (≈150 words) summarizing: event ingestion → semantic distillation → context packets → name‑rich action objects. Place it near §3.3.
