Below is a **follow-the-numbers checklist** where **every task—top-level and sub-task—has three fields**:

* **Title ▸** What you’ll tell the agent to do.
* **Description ▸** What the code actually changes or ships.
* **Vision ▸** Why this matters; what “good” looks like when it’s done.

---

### 1 ▸ Scaffold semantic fields

**Description ▸** Add the raw data structures the rest of the system needs.
**Vision ▸** Every action can now carry a vector and two summaries without breaking existing CRUD flows.

| #   | Title                  | Description                                                                                     | Vision                                                           |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1.1 | Extend `actions` table | Add `embedding vector`, `node_summary text`, `subtree_summary text` columns.                    | Schema holds semantic artefacts; migrations succeed in all envs. |
| 1.2 | Install vector index   | Enable pgvector (or alternative) and create IVFFLAT index on `embedding`.                       | Fast, index-backed similarity search in < 50 ms for 50 k rows.   |
| 1.3 | Embed-and-store worker | Background job listens for “action.created/updated”, calls OpenAI embeddings API, saves vector. | Any new or edited action receives its vector within seconds.     |

---

### 2 ▸ Back-fill existing data

**Description ▸** Retrofit semantic data onto historical actions.
**Vision ▸** Legacy items behave identically to new ones in retrieval and summaries.

| #   | Title                      | Description                                                    | Vision                                               |
| --- | -------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| 2.1 | Batch-embed legacy actions | Iterate all rows, compute embeddings, store.                   | 100 % of rows now have non-null vectors.             |
| 2.2 | Generate node summaries    | One-sentence GPT-3.5 call per action; store in `node_summary`. | Each summary < 25 tokens; captures action’s essence. |
| 2.3 | Persist semantic data      | Write vectors and summaries back via bulk update.              | No orphaned rows; can re-run idempotently.           |

---

### 3 ▸ Parent-suggestion retrieval API

**Description ▸** First half of “categorise” flow: find likely parents.
**Vision ▸** Endpoint returns ≤ 15 high-similarity candidates in < 100 ms.

| #   | Title                               | Description                                                                                    | Vision                                                             |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3.1 | `/actions/suggest-parents` endpoint | Accept `{title, description}`, embed, K-NN search, return list with similarity scores & paths. | Stable JSON schema; monitored latency < 100 ms P95.                |
| 3.2 | Path-builder helper                 | Given an `action_id`, traverse to root and stringify the breadcrumb path.                      | Paths render correctly in UI (“Product > Marketing > Launch Ads”). |
| 3.3 | Configurable thresholds             | Expose `SIM_PARENT` and `SIM_ROOT` in env/config.                                              | Can tune recall/precision without redeploying code.                |

---

### 4 ▸ LLM classification & tree mutation

**Description ▸** Second half of “categorise”: reason over candidates and update DB.
**Vision ▸** One call → action inserted, re-parented or rooted with zero manual clicks.

| #   | Title                          | Description                                                        | Vision                                                   |                       |                                      |
| --- | ------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------- | --------------------- | ------------------------------------ |
| 4.1 | JSON-mode prompt template      | Craft system/user messages that yield \`ADD\_AS\_CHILD             | CREATE\_PARENT                                           | ADD\_AS\_ROOT\` JSON. | Always parses; no hallucinated keys. |
| 4.2 | `/actions/categorise` endpoint | Call 3.1, feed prompt to GPT-4o, parse JSON, execute DB mutations. | End-to-end latency < 6 s P95; atomic DB writes.          |                       |                                      |
| 4.3 | Trigger semantic refresh       | Queue worker from Step 1 for any node touched.                     | Vectors & summaries stay consistent after moves/creates. |                       |                                      |

---

### 5 ▸ Subtree-summary maintenance

**Description ▸** Keep high-level summaries current as the tree changes.
**Vision ▸** Every branch’s `subtree_summary` reflects its children within 5 min.

| #   | Title                    | Description                                                             | Vision                                           |
| --- | ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------ |
| 5.1 | Recursive summary worker | Walk ancestors of changed node; regenerate summaries from child titles. | Updates amortised; no infinite loops.            |
| 5.2 | Event triggers           | Fire worker on create, rename, move, delete.                            | No stale summaries visible in UI.                |
| 5.3 | Debounce strategy        | Batch sibling changes inside 5-min window.                              | Worker load stays < X jobs/min under peak edits. |

---

### 6 ▸ Duplicate detection & merge suggestion

**Description ▸** Identify near-identical siblings and help users merge.
**Vision ▸** UI flags obvious dupes; merges executed with audit trail.

| #   | Title                    | Description                                                         | Vision                                       |
| --- | ------------------------ | ------------------------------------------------------------------- | -------------------------------------------- |
| 6.1 | Nightly similarity scan  | For each sibling pair, if cosine > 0.90, create `merge_suggestion`. | Job completes nightly in < 30 min.           |
| 6.2 | Merge accept/reject flow | API/UI to combine children, close duplicate, record action.         | One-click merge; historical links preserved. |

---

### 7 ▸ Automatic epic creation

**Description ▸** Create umbrella “epic” nodes for dense clusters of related tasks.
**Vision ▸** Large unstructured leaves reorganise themselves under meaningful parents.

| #   | Title                      | Description                                                      | Vision                                               |
| --- | -------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| 7.1 | Offline clustering job     | Run HDBSCAN (or similar) across embeddings; detect clusters ≥ N. | Clusters logged with member IDs; job idempotent.     |
| 7.2 | Create epic node           | Insert new parent, inherit project/owner metadata.               | Tree depth grows only where needed.                  |
| 7.3 | Name epic via GPT-3.5      | Prompt with child titles to generate concise epic name.          | Names < 6 words, descriptive, unique among siblings. |
| 7.4 | Re-parent cluster children | Move nodes under new epic; log old→new parent mapping.           | No dangling references; UI reflects instantly.       |
| 7.5 | Audit relationship log     | Persist mapping in `parent_change_log`.                          | Traceability for retro and rollback.                 |

---

### 8 ▸ Dependency inference & critical-path analysis

**Description ▸** Learn blockers automatically and surface schedule risks.
**Vision ▸** Critical path visualised; hidden blockers exposed early.

| #   | Title                       | Description                                                        | Vision                                     |
| --- | --------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| 8.1 | Pairwise dependency check   | For sibling pairs with time gap + similarity, GPT judges relation. | Accuracy > 80 % on sample set.             |
| 8.2 | `action_dependencies` table | Store `from_id`, `to_id`, `type`.                                  | Acyclic graph enforced by constraint/test. |
| 8.3 | Critical-path endpoint      | Traverse DAG; return longest path details.                         | JSON length < 500 nodes; < 200 ms latency. |
| 8.4 | UI path overlay             | Highlight critical chain in tree view.                             | Users identify slip risk in one glance.    |

---

### 9 ▸ Communication & reporting features

**Description ▸** Turn raw changes into human-readable updates.
**Vision ▸** Stakeholders consume digestible summaries without digging.

| #   | Title                        | Description                                                           | Vision                                                    |
| --- | ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| 9.1 | Daily stand-up digest        | Cron query “updated in last 24 h”, GPT-3.5 summarises, post to Slack. | Message under 200 words; arrives by 09:05 local.          |
| 9.2 | Progress bar API             | Compute closed/total leaves for any branch.                           | ≤ 50 ms for branches ≤ 1 k leaves.                        |
| 9.3 | Risk log extractor           | Regex TBD/unknown; GPT-3.5 clusters → risk list.                      | Dashboard shows up-to-date open risks.                    |
| 9.4 | Retrospective pack generator | On milestone close, gather nodes & changes; GPT-4o drafts retro.      | Doc includes wins, misses, lessons; exportable to MD/PDF. |

---

### 10 ▸ Operational excellence & continuous improvement

**Description ▸** Instrument, verify, and refine the automation.
**Vision ▸** High trust in auto-moves; LLM cost and latency continuously drop.

| #    | Title                            | Description                                                       | Vision                                             |
| ---- | -------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| 10.1 | End-to-end logging               | Capture prompt, response, diff, latency for every LLM call.       | Searchable logs; P99 latencies alarmed.            |
| 10.2 | Human-review queue               | Require approval on auto-moves until 95 % accepted.               | Quality gate prevents bad refactors.               |
| 10.3 | Fine-tune lightweight classifier | Train on approved decisions; route high-confidence cases locally. | Cuts GPT-4o calls by > 70 % without accuracy loss. |

---

### 11 ▸ Optional advanced utilities

**Description ▸** Add-on capabilities that reuse the same semantic backbone.
**Vision ▸** Extend value surface area with minimal new plumbing.

| #    | Title                        | Description                                                          | Vision                                                      |
| ---- | ---------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| 11.1 | Template mining              | Cluster past tasks, generalise into reusable checklists.             | Library of “release”, “on-call”, etc. templates auto-grows. |
| 11.2 | Effort & duration prediction | Fine-tune model on historical estimates vs. actuals.                 | Create vs. actual variance narrows over time.               |
| 11.3 | Workload balancing           | Aggregate predicted hours per assignee; LLM proposes re-assignments. | Even distribution; over-allocated users flagged early.      |
| 11.4 | Semantic bookmarks           | Save search embedding + filters as a live view.                      | Users open a bookmark and always see the updated slice.     |

---
