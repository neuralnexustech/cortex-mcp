---
name: cortex
description: >
  Cortex MCP is a persistent brain, memory, task loop controller, and reminder
  engine for AI coding agents. It gives any agent (Claude, Gemini, Codex,
  Cursor, OpenCode) a SQLite-backed project state that survives context
  compaction, session resets, and agent switches. Always call cortex_get_state
  at session start. Never decide the next task yourself — call cortex_get_next_task.
---

# Cortex MCP — Agent Skill Guide

> **Works with:** Claude Code · Gemini · Codex · Cursor · OpenCode · Antigravity · Any MCP client
> **Use via:** `npx cortex-mcp` · `npm install -g cortex-mcp` · Local install

---

## Section 1 — The Two Laws (Read First)

### Law 1: Always recover state before doing anything
```
Session start  →  cortex_get_state        (MANDATORY, every time)
Context reset  →  cortex_get_state        (MANDATORY, every time)
After compaction → cortex_get_state       (MANDATORY, every time)
```

### Law 2: Never decide the next task yourself
```
Need next task  →  cortex_get_next_task   (NEVER skip this)
All done?       →  response will say "ALL TASKS COMPLETE" (exact string, not JSON)
```

Violating either law causes the agent to duplicate work, miss context, or build features out of order.

---

## Section 2 — Required File Layout

```
<project-root>/
├── .cortex/
│   ├── cortex.db               ← SQLite DB, WAL mode
│   ├── .cortexignore           ← glob patterns to block (like .gitignore)
│   ├── error.log               ← server error log (must stay clean in production)
│   ├── library/
│   │   ├── skills/             ← user-added SKILL.md files
│   │   └── snippets/           ← user-added code snippets
│   └── snapshots/
│       └── session-<ts>.md     ← written by cortex_save_snapshot

<cortex-mcp-package>/
├── skills/
│   └── SKILL.md                ← this file, bundled with npm
├── docs/
│   ├── schema.md               ← all 13 DB tables
│   ├── tools.md                ← all 20 tool contracts
│   ├── audit-checklist.md      ← 18 checks + 8-step smoke test
│   └── dashboard-spec.md       ← React dashboard spec
├── src/
│   ├── server.js               ← MCP server entrypoint, registers all tools
│   ├── db/
│   │   ├── init.js             ← opens DB, sets WAL, creates tables, creates dirs
│   │   ├── schema.js           ← all 13 CREATE TABLE statements
│   │   └── queries.js          ← all DB query helpers
│   └── tools/
│       ├── init.js             ← cortex_init
│       ├── state.js            ← cortex_get_state
│       ├── tasks.js            ← cortex_get_next_task
│       ├── features.js         ← cortex_add_feature, cortex_update_feature
│       ├── files.js            ← cortex_tick_file (checks .cortexignore)
│       ├── tests.js            ← cortex_add_test, cortex_update_test
│       ├── issues.js           ← cortex_log_issue, cortex_resolve_issue
│       ├── dictionary.js       ← cortex_write_dictionary, cortex_get_detail
│       ├── library.js          ← cortex_add_snippet
│       ├── research.js         ← cortex_add_research
│       ├── decisions.js        ← cortex_add_decision
│       ├── reminders.js        ← cortex_check_reminders (6 rules)
│       ├── snapshots.js        ← cortex_save_snapshot
│       ├── rollback.js         ← cortex_rollback
│       ├── human.js            ← cortex_ask_human
│       ├── health.js           ← cortex_health
│       ├── project.js          ← cortex_set_active_project
│       └── skills.js           ← cortex_get_skill, cortex_list_skills
└── bin/
    └── cortex.js               ← CLI: cortex start | status | init | dashboard
```

---

## Section 3 — The Agent Loop (Canonical Pattern)

**Follow this pattern exactly. Every session. Every task.**

```
┌─────────────────────────────────────────────────────────────────┐
│  SESSION START                                                   │
│  1. cortex_get_state          ← recover full project context   │
│  2. cortex_health             ← check DB integrity             │
│  3. cortex_check_reminders    ← handle any blockers first      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  TASK LOOP                                                       │
│  4. cortex_get_next_task      ← get next pending todo          │
│     → "ALL TASKS COMPLETE"?  → jump to SESSION END             │
│  5. Do the actual work        ← write code, edit files, etc.   │
│  6. cortex_tick_file          ← mark each file touched         │
│  7. cortex_write_dictionary   ← document what the file does    │
│  8. cortex_log_progress       ← log what was completed         │
│  9. cortex_check_reminders    ← handle any new blockers        │
│     → missing test warning?  → cortex_add_test immediately     │
│     → open issue warning?    → cortex_resolve_issue first      │
│  10. Back to step 4           ← loop                           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION END                                                     │
│  11. cortex_save_snapshot     ← always save before stopping    │
│  12. cortex_get_state         ← verify state looks correct     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 4 — All 20 Tools (Quick Reference)

### Session & State
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_get_state` | Session start, after compaction | _(none)_ |
| `cortex_get_next_task` | Before every task | _(none)_ |
| `cortex_check_reminders` | After every task | _(none)_ |
| `cortex_health` | Session start, debugging | _(none)_ |

### Setup
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_init` | First run, new project | _(none — interactive)_ |
| `cortex_set_active_project` | Multi-project switch | `name`, `project_path` |

### Work Logging
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_tick_file` | Every file created/modified | `file_path` *(req)*, `status`, `feature_id` |
| `cortex_log_progress` | After every completed action | `task` *(req)*, `file_path`, `notes` |
| `cortex_save_snapshot` | End of session | `summary` *(req)* |

### Features & Tasks
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_add_feature` | New feature identified | `name` *(req)*, `priority` |
| `cortex_update_feature` | Feature status changes | `id` *(req)*, `status` *(req)* |

### Tests
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_add_test` | After creating a file (avoid reminder #1) | `name` *(req)*, `feature_id` |
| `cortex_update_test` | After running tests | `id` *(req)*, `status` *(req)* |

### Issues
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_log_issue` | Bug discovered | `title` *(req)*, `description`, `file_path` |
| `cortex_resolve_issue` | Bug fixed | `id` *(req)*, `fix_applied` *(req)* |

### Knowledge Base
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_write_dictionary` | After creating/changing a file | `key` *(req)*, `short_summary` *(req)* |
| `cortex_get_detail` | Need full info on a file/feature | `key` *(req)* |
| `cortex_add_snippet` | Reusable code found | `title` *(req)*, `code` *(req)* |
| `cortex_add_research` | New library used | `library_name` *(req)* |
| `cortex_add_decision` | Architecture decision made | `title` *(req)*, `reason` |

### Rollback & Human
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_rollback` | File corrupted / bad edit | `file_path` *(req)*, `checkpoint_id` *(req)* |
| `cortex_ask_human` | Blocked — need human input | `question` *(req)* |

### Skill Discovery
| Tool | When to call | Key params |
|------|-------------|------------|
| `cortex_get_skill` | New agent reading this for first time | `name` (optional) |
| `cortex_list_skills` | Exploring available guides | _(none)_ |

---

## Section 5 — The 6 Reminder Rules

`cortex_check_reminders` enforces these automatically. You must handle every warning it returns before doing more work.

| # | Rule | Warning message |
|---|------|-----------------|
| 1 | File in `file_tree` has no linked test | `"You created src/X but no test is linked. Add test before continuing."` |
| 2 | Feature marked `done` but linked test is `failed` | `"Feature 'X' is done but test 'Y' is FAILED."` |
| 3 | Library in dictionary with no research entry | `"Library 'X' appears to be used but has no research entry."` |
| 4 | Any open issue exists | `"Open bug on src/X (id:N). Fix before building new features."` |
| 5 | 3+ tasks completed with no snapshot | `"You've completed 3 tasks. Time to save a snapshot."` |
| 6 | No pending todos remain | `"All tasks done. Project complete. Stopping."` |

**Rule 4 is a hard blocker.** Do not start any new feature while an open issue exists.

---

## Section 6 — Parameter Aliases

These aliases are supported to prevent tool failures from minor naming differences:

| Tool | Canonical param | Also accepts |
|------|----------------|-------------|
| `cortex_write_dictionary` | `short_summary` | `short` |
| `cortex_add_research` | `library_name` | `library` |
| `cortex_get_detail` | `key` | `name` |
| `cortex_save_snapshot` | `summary` | `text`, `content` |

---

## Section 7 — .cortexignore

Works like `.gitignore`. Glob patterns supported via `minimatch`.

**Location:** `.cortex/.cortexignore`

**Example:**
```
# Secrets — never track
*.env
*.key
*.pem
secrets/
.env.*

# Dependencies — agent should not touch these
node_modules/
dist/
build/

# Lock files — auto-generated
package-lock.json
yarn.lock
```

Calling `cortex_tick_file` on a blocked path returns:
```json
{ "error": "Path blocked by .cortexignore: secret.env" }
```
The file is NOT written to `file_tree`. No checkpoint is saved.

---

## Section 8 — Database Rules

1. **WAL mode is mandatory.** The server sets it on every connection. Never bypass it.
2. **13 tables exactly.** `cortex_health` will report `broken` if any are missing.
3. **Never write raw SQL** to the DB — always use the MCP tools.
4. **Checkpoints are immutable.** Never delete from `checkpoints`. They are the rollback history.
5. **progress_log is append-only.** Never UPDATE a progress row. Always INSERT.

---

## Section 9 — Dashboard & REST API

The dashboard runs at `http://localhost:4759`.
The REST API runs at `http://localhost:3001`.

Start both with: `cortex start` or `node bin/cortex.js start`

**All API endpoints (GET, read-only):**
```
/api/state       → project + todo counts + issue counts
/api/features    → all features
/api/files       → all file_tree entries
/api/tests       → all tests
/api/progress    → last 100 progress_log entries
/api/issues      → all issues
/api/snippets    → all snippets
/api/research    → all research entries
/api/dictionary  → all dictionary entries (short_summary only)
/api/settings    → project row
```

**POST endpoint:**
```
POST /api/human-answer   body: { question_id, answer }
```
This unblocks `cortex_ask_human`.

---

## Section 10 — Multi-Agent Handoff

When switching between Claude → Gemini → Codex → Cursor, the new agent MUST:

1. Call `cortex_get_state` → reads compressed project context
2. Call `cortex_get_next_task` → gets exact next step
3. Call `cortex_check_reminders` → handles any blockers left by previous agent
4. Continue the task loop without needing human re-briefing

The DB is the single source of truth. The agent changes but the project state never resets.

---

## Section 11 — Context Compaction Recovery

When your context window fills and gets compacted:

```
cortex_get_state    ← call immediately when you wake up
```

The response includes:
- Current project name, goal, tech stack
- Todo counts (total / done / pending)
- Open issue count
- Last snapshot summary (what was done)
- Last 5 progress log entries (what steps were recently taken)
- Active reminders (what to handle first)

This is enough context to resume without human intervention.

---

## Section 12 — Common Mistakes

| Mistake | Correct behavior |
|---------|-----------------|
| Starting work without calling `cortex_get_state` | Always call it first |
| Deciding next task yourself | Call `cortex_get_next_task` |
| Creating a file without calling `cortex_tick_file` | Tick every file you touch |
| Ticking a file without writing to `cortex_write_dictionary` | Always document after ticking |
| Logging progress after every line of code | Log progress after each meaningful completed step |
| Ignoring reminder warnings | Handle ALL warnings before continuing |
| Ending session without snapshot | Always call `cortex_save_snapshot` last |
| Building a new feature while issues are open | Resolve issues first (Rule #4) |
| Using the dashboard as source of truth | DB is source of truth; dashboard just reads it |

---

## Section 13 — Quick Start (New Project)

```
1. cortex_init              ← answer the 10 onboarding questions
2. cortex_get_state         ← verify project was created
3. cortex_health            ← confirm 13 tables, wal_mode: true
4. cortex_add_feature       ← add first feature
5. cortex_get_next_task     ← get first task
... follow the agent loop in Section 3 ...
```

---

## Section 14 — Quick Start (Existing Project, New Session)

```
1. cortex_get_state         ← recover full context
2. cortex_health            ← check DB is healthy
3. cortex_check_reminders   ← handle any open blockers
4. cortex_get_next_task     ← get next pending task
... follow the agent loop in Section 3 ...
```

---

## Section 15 — Skill System

Skills are agent guides bundled with Cortex or added by users.

**Get this full guide programmatically:**
```
cortex_get_skill            ← returns this entire SKILL.md
cortex_get_skill { name: "cortex" }  ← same thing, explicit
```

**List all available skills:**
```
cortex_list_skills          ← returns bundled + user skills
```

**Add your own skills:**
Drop any `.md` file into `.cortex/library/skills/` in your project.
It will appear in `cortex_list_skills` as `source: "user"`.

**Via MCP resources (for hosts that support the resources protocol):**
```
resources/list              ← lists cortex://skills/cortex + any user skills
resources/read uri="cortex://skills/cortex"  ← returns this file
```

---

## Appendix A — Tool Count Verification

Running `cortex_health` should return `tables: 13`.
The server registers exactly **20 tools** (18 core + 2 skill discovery).

Core tools:
`cortex_init` · `cortex_get_state` · `cortex_get_next_task` · `cortex_log_progress` ·
`cortex_tick_file` · `cortex_add_feature` · `cortex_update_feature` · `cortex_add_test` ·
`cortex_update_test` · `cortex_log_issue` · `cortex_resolve_issue` · `cortex_write_dictionary` ·
`cortex_get_detail` · `cortex_add_snippet` · `cortex_add_research` · `cortex_add_decision` ·
`cortex_check_reminders` · `cortex_save_snapshot` · `cortex_rollback` · `cortex_ask_human` ·
`cortex_health` · `cortex_set_active_project`

Skill tools:
`cortex_get_skill` · `cortex_list_skills`

---

## Appendix B — Error Patterns & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'name' of undefined` | No project row in DB | Run `cortex_init` |
| `SQLITE_BUSY` | WAL mode not set | Restart server; it sets WAL on connect |
| `Path blocked by .cortexignore` | File matched a glob pattern | Expected behavior — do not track that file |
| `Checkpoint not found` | Wrong checkpoint_id | Query `checkpoints` table for correct id |
| `Human did not respond in time` | `cortex_ask_human` timed out (5 min) | Call again; human needs to POST `/api/human-answer` |
| `ALL TASKS COMPLETE` | No pending todos | Add more todos or end session |
| `tables: 12` from `cortex_health` | Missing table | Re-run `cortex_init` or restart server |
| Dashboard shows old data | Stale cache | Dashboard polls every 5s; wait or hard refresh |
