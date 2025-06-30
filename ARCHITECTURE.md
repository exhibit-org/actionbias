# ARCHITECTURE.md

**Proposed High‑Level Architecture (v0.1)**

---

## 1. Surface Layer

| Component         | Purpose                                                | Key Notes                                                                      |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Task Composer** | Turn raw ideas into graph nodes (tasks, notes, goals). | Shows "related context" sidebar powered by the Context Engine.                 |
| **Agent Runner**  | Dispatch an LLM‑powered agent to execute a task.       | Assembles a prompt from the Context Engine, streams a full execution log back. |
| **Story Builder** | Generate audience‑specific reports after execution.    | Pulls task, full log, and neighbouring context → fills Markdown templates.     |

---

## 2. Context Engine (thin service)

* **Input:** `node_id`, `mode = authoring | execution`
* **Process:**

  1. Always include the focal node.
  2. Add **all** direct neighbours (edge types: *functional*, *temporal*, *topic*). Defer setting hard limits until context‑window or latency issues emerge.
  3. Recursively traverse the chains to include **all** ancestors and descendants, continuing until no further parent or child tasks remain.
* **Output:** Ordered list of full‑text `NodePayloads` (no summarisation yet).

---

## 3. Persistence (Postgres, no compression)

```sql
CREATE TABLE nodes (
    id         UUID PRIMARY KEY,
    type       TEXT,      -- task, note, result, report …
    title      TEXT,
    body       TEXT,      -- full, unabridged markdown
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE edges (
    src        UUID,
    dst        UUID,
    type       TEXT,      -- functional | temporal | topic
    created_at TIMESTAMPTZ,
    PRIMARY KEY (src, dst, type)
);

CREATE TABLE logs (
    task_id    UUID,
    ts         TIMESTAMPTZ,
    role       TEXT,
    content    TEXT        -- raw agent trace
);
```

*Future‑proofing:* `pgvector` or `ltree` columns can be added later without rewrites.

---

## 4. Authoring Flow (Task Composer)

1. **Draft** – User opens "New Task"; background call `ContextEngine.fetch(tmp_id, "authoring")` fills a sidebar with:

   * Parent goals ("Why")
   * Recently completed sibling tasks ("What we just learned")
   * Domain cheat‑sheets by topic ("Design", "Security", …)
2. **Realtime helpers** while typing:

   * Mention `#NODE‑123` → suggest explicit link
   * Detect domain keywords → suggest topic edges
   * Highlight bullet lists like *TODO*, acceptance criteria
3. **Save** – Persist node (`type='task'`) and create/update edges:

   * *Functional* – parent/child chosen by user
   * *Temporal*   – auto‑edge to last completed related task
   * *Topic*      – edges to accepted tags
4. Sidebar & other drafts refresh automatically as the new node enters the graph.

---

## 5. Execution Flow (happy path)

```
User clicks "Run Agent"
        ↓
ctx   = ContextEngine.fetch(task_id, "execution")
prompt = PromptBuilder(ctx, task)
answer, log = LLM.run(prompt)
store(log)                        -- full trace saved to logs table
(Optional) StoryBuilder.generate(task_id, "executive")
```

---

## 6. Reporting Flow

```
StoryBuilder
  ├─ load Context (same engine)
  ├─ load full Execution Log
  ├─ condense_log() → high‑level steps
  ├─ template = select(audience)
  └─ LLM(template.format(...)) → Markdown / PDF / email
```

* Output stored as a child `report` node linked back to the task.

---

## 7. Guiding Principles

1. **No premature summarisation** – ship with full text; compress only once context‑window or latency pain appears.
2. **Thin abstraction boundaries** – `ContextEngine` & `StoryBuilder` are helpers that query Postgres; storage swaps or compression stay internal.
3. **Everything is a node** – tasks, results, and reports are uniform objects linked by typed edges.
4. **Logs are immutable** – keep the complete agent trace; higher‑level stories are additive child nodes.

---

*This architecture realises the three‑leg stool: planning (Task Composer), execution (Agent Runner), and reporting (Story Builder) while deferring optimisation until genuinely necessary.*