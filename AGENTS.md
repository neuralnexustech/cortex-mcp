# Cortex MCP — Agent Guide

> This file tells AI coding agents how to use Cortex effectively. Read this at session start.

## Quick Start

1. **First call:** `cortex_get_state` — get compressed project context (<200 tokens)
2. **Get next task:** `cortex_get_next_task` — NEVER decide your own next step
3. **Work on the task** — write code, create files
4. **Track progress:**
   - `cortex_tick_file` — when you create/finish a file
   - `cortex_log_progress` — after every significant step
   - `cortex_update_feature` — when a feature milestone is reached
   - `cortex_add_test` / `cortex_update_test` — when you write/run tests
5. **Check health:** `cortex_check_reminders` — handle ALL warnings before continuing
6. **End session:** `cortex_save_snapshot` — compress session to summary

## Session Lifecycle

```
START → cortex_get_state → cortex_get_next_task → WORK → cortex_check_reminders → ... → cortex_save_snapshot → END
```

### Every Session Start
```
cortex_get_state → knows project, stack, goals, open issues, last progress
```

### Every Task
```
cortex_get_next_task → get highest-priority pending todo
  ↓
Work (write code, create files)
  ↓
cortex_tick_file → track each file created
  ↓
cortex_log_progress → log what you did
  ↓
cortex_check_reminders → handle warnings
  ↓
cortex_get_next_task → get next todo (or "ALL TASKS COMPLETE")
```

### Every Session End
```
cortex_save_snapshot → compress everything to summary
```

## Tool Reference (31 tools)

### Core Loop (5 tools)
| Tool | When | Purpose |
|------|------|---------|
| `cortex_get_state` | Session start | Compressed project context |
| `cortex_get_next_task` | Before each task | Highest-priority pending todo |
| `cortex_log_progress` | After each step | Log completed work |
| `cortex_check_reminders` | After each task | 6 safety checks |
| `cortex_save_snapshot` | Session end | Compress session summary |

### Project Setup (3 tools)
| Tool | Purpose |
|------|---------|
| `cortex_init` | Initialize project (ask 10 questions first!) |
| `cortex_set_active_project` | Switch between projects |
| `cortex_health` | DB integrity + auto-repair |

### Features & Files (5 tools)
| Tool | Purpose |
|------|---------|
| `cortex_add_feature` | Register a feature |
| `cortex_update_feature` | Update feature status |
| `cortex_tick_file` | Track file creation (auto-checkpoints) |
| `cortex_get_files` | List all tracked files |
| `cortex_rollback_file` | Restore file from checkpoint |

### Tests (2 tools)
| Tool | Purpose |
|------|---------|
| `cortex_add_test` | Register a test |
| `cortex_update_test` | Mark test passed/failed |

### Issues (2 tools)
| Tool | Purpose |
|------|---------|
| `cortex_log_issue` | Log a bug or blocker |
| `cortex_resolve_issue` | Mark issue resolved with fix |

### Knowledge Base (6 tools)
| Tool | Purpose |
|------|---------|
| `cortex_write_dictionary` | Document a file/feature (key → summary) |
| `cortex_get_detail` | Retrieve full dictionary entry |
| `cortex_add_snippet` | Save reusable code snippet |
| `cortex_add_research` | Log library research notes |
| `cortex_add_decision` | Record architectural decision |
| `cortex_search` | FTS5 + vector search across all tables |

### Human Interaction (2 tools)
| Tool | Purpose |
|------|---------|
| `cortex_ask_human` | Pause, ask question, wait for answer |
| `cortex_confirm_destructive` | Red confirmation modal for dangerous ops |

### V2 Advanced (5 tools)
| Tool | Purpose |
|------|---------|
| `cortex_log_tokens` | Track token usage per action |
| `cortex_get_token_budget` | Check remaining budget (180k default) |
| `cortex_set_role` | Set agent role (researcher/builder/reviewer/orchestrator) |
| `cortex_get_role` | Get agent permissions |
| `cortex_list_agents` | List all connected agents |

### Knowledge Graph (2 tools)
| Tool | Purpose |
|------|---------|
| `cortex_add_relationship` | Link entities (feature→file, file→test, etc.) |
| `cortex_check_contradictions` | Find conflicting dictionary entries |

### Skills (2 tools)
| Tool | Purpose |
|------|---------|
| `cortex_get_skill` | Load SKILL.md guide |
| `cortex_list_skills` | List available skills |

### MCP Resources (10 read-only endpoints)
| URI | Purpose |
|-----|---------|
| `cortex://project` | Project config, features, todos |
| `cortex://features` | All features with status |
| `cortex://files` | All tracked files |
| `cortex://tests` | All tests |
| `cortex://issues` | All issues |
| `cortex://dictionary` | File documentation |
| `cortex://progress` | Recent activity |
| `cortex://todos` | Pending tasks |
| `cortex://relationships` | Knowledge graph edges |
| `cortex://snapshots` | Session summaries |

### MCP Prompts (5 templates)
| Prompt | Purpose |
|--------|---------|
| `start-session` | Full session lifecycle guide |
| `debug-issue` | Structured debugging workflow |
| `review-code` | Code review checklist |
| `init-project` | 10-question onboarding |
| `end-session` | Snapshot + final check |

## Important Rules

1. **NEVER decide your own next step** — always call `cortex_get_next_task`
2. **ALWAYS call `cortex_get_state` first** — know the project context
3. **ALWAYS call `cortex_check_reminders` after each task** — handle warnings
4. **ALWAYS call `cortex_save_snapshot` at session end** — preserve context
5. **Log progress immediately** — don't batch, log after each step
6. **Track every file** — use `cortex_tick_file` for every file you create
7. **Use dictionary** — document files with `cortex_write_dictionary`
8. **Create relationships** — link files→features→tests with `cortex_add_relationship`

## Dashboard

Live at `http://localhost:3001` — shows all project data in real-time via WebSocket.

- **Ctrl+K** — Global search across all tables
- **Graph tab** — D3 force-directed knowledge graph
- **LIVE indicator** — WebSocket connection status in top-right

## Database

SQLite at `.cortex/cortex.db` with WAL mode. 15+ tables, FTS5 search, triggers for auto-sync.

Key tables: `project`, `features`, `file_tree`, `todos`, `tests`, `issues`, `dictionary`, `progress_log`, `relationships`, `embeddings`.
