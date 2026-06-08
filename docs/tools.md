# Cortex MCP — Tool Contracts (V2)

> Every tool is registered in `src/server.js`. Returns `{ error: '...' }` on failure. Never throws. Never crashes the server.

**Total tools: 31** (18 V1 + 13 V2)

---

## Session Management

### `cortex_get_state`
**Call this FIRST at every session start and after every context compaction.**

- **Input:** `{ "session_id"?: "<string>" }`
- **Output (≤200 tokens):**
```json
{
  "project": "<name>",
  "goal": "<short goal>",
  "stack": "<stack>",
  "todos": { "total": 5, "done": 2, "pending": 3 },
  "open_issues": 0,
  "last_snapshot": "<ISO timestamp or null>",
  "snapshot_summary": "<last snapshot plain text summary>",
  "last_progress": ["<last 5 progress_log entries as short strings>"],
  "reminders": ["<any active reminder strings>"],
  "token_budget": { "used": 45000, "budget": 180000, "percent": 25, "warning_level": "ok" }
}
```

---

### `cortex_get_next_task`
**Agent NEVER decides next step — always calls this.**

- **Input:** `{}`
- **Output (task exists):** `{ "id": 3, "task": "Build login form", "priority": 1, "feature_id": 2 }`
- **Output (no pending todos):** Exactly the string `ALL TASKS COMPLETE` (not JSON, not wrapped)
- **DB query:** `SELECT * FROM todos WHERE status='pending' ORDER BY priority ASC LIMIT 1`

---

## Project Setup

### `cortex_init`
**Initialize project. MUST ask 10 questions via cortex_ask_human first.**

- **Input:**
  - `project_name` *(required)*: From human answer
  - `goal` *(required)*: From human answer
  - `stack` *(required)*: From human answer
  - `ui_style` *(optional)*: From human answer
  - `preferred_libs` *(optional)*: From human answer
  - `forbidden_libs` *(optional)*: From human answer
  - `file_structure` *(optional)*: From human answer
  - `existing_codebase` *(optional)*: From human answer
  - `core_features` *(required)*: Comma-separated from human answer
  - `complexity` *(optional)*: From human answer
- **Behavior:** Creates DB, project record, features from `core_features`, initial todo list
- **Output:** `{ "success": true, "project_id": 1, "features_added": 8, "todos_created": 11 }`

---

### `cortex_set_active_project`
**Switch active project (multi-project support).**

- **Input:** `{ "project_path": "<string>" }`
- **Behavior:** Switch active DB path to `<project_path>/.cortex/cortex.db`
- **Output:** `{ "success": true, "active_project": "<name>" }`

---

### `cortex_health`
**Check DB integrity + auto-repair.**

- **Input:** `{ "auto_repair"?: true }`
- **Checks:** FTS sync, orphaned embeddings, failed tests, broken files, missing tests
- **Output:** `{ "status": "ok", "tables": {...}, "repaired": [...], "warnings": [...] }`

---

## Progress & Logging

### `cortex_log_progress`
**Log a completed step. Call after every significant action.**

- **Input:**
  - `task` *(required)*: What was done
  - `file_path` *(optional)*: Affected file
  - `notes` *(optional)*: Additional context
  - `agent` *(optional)*: Agent name
- **Output:** `{ "success": true, "id": 7 }`

---

### `cortex_save_snapshot`
**Save session summary to DB AND disk. Call at end of every session.**

- **Input:**
  - `summary` *(required)*: Plain-English session summary
  - `session_id` *(optional)*: Auto-generated if not provided
  - `agent` *(optional)*: Agent name
- **Output:** `{ "success": true, "session_id": "...", "file": ".cortex/snapshots/..." }`

---

## Features

### `cortex_add_feature`
- **Input:** `name` (required), `description`, `priority` (high/medium/low), `linked_files`, `linked_tests`, `agent`
- **Output:** `{ "success": true, "id": 3 }`

### `cortex_update_feature`
- **Input:** `id` (required), `status` (required: pending/in-progress/done/blocked)
- **Output:** `{ "success": true }`

---

## File Tracking

### `cortex_tick_file`
**Mark a file as created/done. Auto-checkpoints if file exists on disk. Respects .cortexignore.**

- **Input:** `file_path` (required), `status` (done/in-progress/pending), `feature_id`, `agent`
- **Output:** `{ "success": true, "file_path": "src/auth.js" }`

### `cortex_get_files`
- **Input:** `{}`
- **Output:** Array of all tracked files

### `cortex_rollback_file`
**Restore file from checkpoint.**
- **Input:** `file_path` (required), `checkpoint_id` (optional, latest if not provided)
- **Output:** `{ "success": true, "restored_to_checkpoint": 12 }`

---

## Tests

### `cortex_add_test`
- **Input:** `name` (required), `feature_id`, `agent`
- **Output:** `{ "success": true, "id": 5 }`

### `cortex_update_test`
- **Input:** `id` (required), `status` (required: pending/passed/failed), `error_output`
- **Output:** `{ "success": true }`

---

## Issues

### `cortex_log_issue`
- **Input:** `title` (required), `description`, `file_path`, `cause`, `agent`
- **Output:** `{ "success": true, "id": 2 }`

### `cortex_resolve_issue`
- **Input:** `id` (required), `fix` (required)
- **Output:** `{ "success": true }`

---

## Knowledge Base

### `cortex_write_dictionary`
**Write or update a dictionary entry. Use for documenting files and features.**

- **Input:** `key` (required), `short_summary` or `short` (required), `full_description` or `full`, `status` (active/broken/archived), `agent`
- **Output:** `{ "success": true, "entry": {...} }`

### `cortex_get_detail`
- **Input:** `{ "key": "<string>" }`
- **Output:** Full dictionary row

### `cortex_add_snippet`
- **Input:** `title` (required), `code` (required), `language`, `tags`, `description`, `source_url`
- **Output:** `{ "success": true, "id": 8 }`

### `cortex_add_research`
- **Input:** `library_name` or `library` (required), `version`, `notes`, `source_url`, `agent`
- **Output:** `{ "success": true, "id": 4 }`

### `cortex_add_decision`
- **Input:** `title` (required), `reason`, `alternatives`, `agent`
- **Output:** `{ "success": true, "id": 6 }`

### `cortex_search`
**FTS5 + vector hybrid search across all tables.**

- **Input:** `query` (required), `mode` (keyword/semantic/hybrid, default: hybrid), `tables` (optional array)
- **Output:** `{ "query": "...", "results": [{ table, id, title, snippet, score }] }`
- **Modes:**
  - `keyword`: FTS5 full-text search
  - `semantic`: ONNX embedding similarity (requires bge-micro-v2)
  - `hybrid`: RRF fusion of both (k=60)

---

## Human Interaction

### `cortex_ask_human`
**Pause agent, queue question for human, block until answered.**

- **Input:** `question` (required), `agent`
- **Behavior:** Polls POST /api/human-answer every 2s, 60s timeout
- **Output:** `{ "answer": "<human's response>" }`

### `cortex_confirm_destructive`
**Red confirmation modal for dangerous operations.**

- **Input:** `action` (required), `target`
- **Behavior:** WebSocket modal → terminal fallback → POST fallback
- **Output:** `{ "confirmed": true/false }`

---

## V2 Advanced

### `cortex_log_tokens`
**Track token usage per action. Call after every tool call.**

- **Input:** `session_id` (required), `input_tokens` (required), `output_tokens` (required)
- **Output:** `{ "success": true, "session_total": 45000 }`

### `cortex_get_token_budget`
**Check remaining token budget.**

- **Input:** `session_id` (required), `budget` (optional, default: 180000)
- **Output:** `{ "used": 45000, "budget": 180000, "percent": 25, "warning_level": "ok|caution|danger|critical" }`

### `cortex_set_role`
**Set agent role controlling tool permissions.**

- **Input:** `agent_name` (required), `role` (required: researcher/builder/reviewer/orchestrator)
- **Permissions:**
  - `researcher`: read-only + search + dictionary + research
  - `builder`: full CRUD + files + tests + snapshots
  - `reviewer`: issues + decisions + tests
  - `orchestrator`: all tools
- **Output:** `{ "success": true, "role": "builder", "permissions": [...] }`

### `cortex_get_role`
- **Input:** `{ "agent_name": "<string>" }`
- **Output:** `{ "agent_name": "...", "role": "builder", "permissions": [...] }`

### `cortex_list_agents`
- **Input:** `{}`
- **Output:** Array of `{ agent_name, role, last_seen }`

---

## Knowledge Graph

### `cortex_add_relationship`
**Link two entities in the knowledge graph.**

- **Input:**
  - `source_type` (required): feature/file/test/issue/decision
  - `source_id` (required): Entity ID
  - `target_type` (required): feature/file/test/issue/decision
  - `target_id` (required): Entity ID
  - `relationship` (required): creates/tests/affects/blocks/resolves
- **Output:** `{ "success": true, "id": 1, "source": "feature:1", "target": "file:3" }`

### `cortex_check_contradictions`
**Find conflicting data in dictionary or features.**

- **Input:** `{ "key"?: "<optional specific key>" }`
- **Output:** Array of `{ key, old_value, new_value, status }`

---

## Reminders

### `cortex_check_reminders`
**Run all 6 reminder checks. Call after every task.**

- **Input:** `{}`
- **The 6 rules:**
  1. File done but no test linked → warning
  2. Feature done but test failing → block
  3. Open issues blocking progress → warning
  4. No activity in 24h → warning
  5. Todo priority drift (>5 high-priority pending) → warning
  6. Feature/file/test inconsistencies → warning
- **Output:** Array of `{ type: "warning"|"block", rule: 1-6, message: "..." }`

---

## Skills

### `cortex_get_skill`
**Load SKILL.md guide.**

- **Input:** `{ "name"?: "<skill name>" }` — omit for main Cortex skill
- **Output:** `{ "name": "cortex", "content": "<full text>", "source": "bundled" }`

### `cortex_list_skills`
- **Input:** `{}`
- **Output:** Array of `{ name, source, description }`

---

## Dashboard

- **URL:** `http://localhost:3001`
- **WebSocket:** `ws://localhost:3001/ws` — live push events
- **Ctrl+K:** Global search overlay
- **Graph tab:** D3 force-directed knowledge graph
- **LIVE indicator:** Top-right corner shows connection status

---

## MCP Resources (10 read-only endpoints)

These are available via the MCP `resources/read` protocol — agents can access project data without tool calls.

| URI | Data Returned |
|-----|---------------|
| `cortex://project` | Project config, features, todos |
| `cortex://features` | All features with status |
| `cortex://files` | All tracked files |
| `cortex://tests` | All tests |
| `cortex://issues` | All issues |
| `cortex://dictionary` | File documentation |
| `cortex://progress` | Recent activity (last 20) |
| `cortex://todos` | Pending tasks |
| `cortex://relationships` | Knowledge graph edges |
| `cortex://snapshots` | Session summaries |

---

## MCP Prompts (5 templates)

Pre-built session templates available via the MCP `prompts/get` protocol.

| Prompt | Purpose |
|--------|---------|
| `start-session` | Full session lifecycle guide with tool reference |
| `debug-issue` | Structured debugging workflow (reproduce → isolate → fix → verify) |
| `review-code` | Code review checklist (security, quality, testing) |
| `init-project` | 10-question onboarding workflow |
| `end-session` | Session end checklist (snapshot, health, reminders) |

---

## Audit Trail

- **Table:** `audit_log`
- **Logged:** tool_name, agent, session_id, input_summary, output_status, duration_ms, error_message
- **API:** `GET /audit?limit=50` — entries + stats
- **Stats:** total calls, errors, avg duration, per-tool breakdown

---

## Episodic Memory

- **Table:** `episodic_memory`
- **Events:** feature_created, file_modified, issue_resolved, test_passed, etc.
- **Fields:** event_type, event_name, entity_type, entity_id, entity_name, context, importance (0-100), session_id, agent
- **API:** `GET /episodic?limit=30` — recent events + timeline + important events

---

## Context Compilation

- **API:** `GET /context?session_id=<id>`
- **Compile time:** ~2ms (pre-built state from all tables)
- **Returns:** project, features, files, tests, todos, issues, decisions, relationships, token_budget, audit_stats, episodic_events, graph_stats, warnings
