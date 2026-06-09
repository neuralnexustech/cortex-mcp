# Cortex MCP

> Persistent brain, memory, loop controller, and reminder engine for AI coding agents.

[![npm version](https://img.shields.io/npm/v/@neuralnexustech/cortex-mcp.svg)](https://www.npmjs.com/package/@neuralnexustech/cortex-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

---

## What is Cortex?

Cortex is a local MCP server that gives AI coding agents **persistent memory**, **task management**, **knowledge graphs**, and a **live dashboard**. It runs on your machine, stores everything in SQLite, and never sends data to the cloud.

```
Agent starts → cortex_get_state → knows everything → works → cortex_save_snapshot → done
```

## Features

### 31 MCP Tools
- **Core Loop** — get_state, get_next_task, log_progress, check_reminders, save_snapshot
- **Project Setup** — init (10-question onboarding), health check with auto-repair
- **Features & Files** — track features, files, checkpoints, rollback
- **Tests & Issues** — register tests, log bugs, resolve issues
- **Knowledge Base** — dictionary, snippets, research, decisions, FTS5 search
- **Human Interaction** — ask_human (pause for input), confirm_destructive (red modal)
- **V2 Advanced** — token budget (180k), agent roles (4 levels), contradiction detection
- **Knowledge Graph** — relationships between features, files, tests, issues

### Live Dashboard
- **12 tabs** — Overview, Pipeline, Features, FileTree, Tests, Progress, Issues, Library, Research, Dictionary, Graph, Settings
- **Pipeline tab** — Start a goal, watch tasks execute live with progress bar, pause/resume/cancel
- **D3 Knowledge Graph** — force-directed visualization with 27+ nodes, drag/zoom/pan
- **WebSocket Live Push** — dashboard updates instantly when data changes
- **Ctrl+K Search** — global search across all tables
- **shadcn/ui** — modern React 19 + Tailwind CSS interface

### MCP Resources (10 endpoints)
Read project data without tool calls via `cortex://` URIs:
`cortex://project`, `cortex://features`, `cortex://files`, `cortex://tests`, `cortex://issues`, `cortex://dictionary`, `cortex://progress`, `cortex://todos`, `cortex://relationships`, `cortex://snapshots`

### MCP Prompts (5 templates)
Pre-built session workflows: `start-session`, `debug-issue`, `review-code`, `init-project`, `end-session`

### V2.4 Modules — Autonomous Pipeline
- **Planner** — natural language goal → ordered DAG of tasks with dependency resolution
- **Executor** — auto-executes tasks (agent/command/test/verify), retries failures up to 3×
- **Loop Controller** — pause/resume/cancel with WebSocket live push to dashboard
- **Auto-Heal** — detects broken files (restores from checkpoint), resets failed tests

### V2.1 Modules
- **Audit Trail** — structured logging for every tool call
- **Episodic Memory** — timestamped events with importance scoring
- **Context Compilation** — full project state in 2ms

## Quick Start

### Option 1: npx (Recommended)

Add to your `opencode.json`:

```json
{
  "mcp": {
    "cortex": {
      "type": "local",
      "command": ["npx", "-y", "@neuralnexustech/cortex-mcp@latest", "start", "--project", "."],
      "enabled": true,
      "env": {
        "CORTEX_PROJECT_PATH": "."
      }
    }
  }
}
```

### Option 2: Local Install

```bash
npm install -g @neuralnexustech/cortex-mcp@latest
```

Then add to `opencode.json`:

```json
{
  "mcp": {
    "cortex": {
      "type": "local",
      "command": ["cortex", "start", "--project", "/path/to/your/project"],
      "enabled": true,
      "env": {
        "CORTEX_PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

### Option 3: Clone & Run

```bash
git clone https://github.com/neuralnexustech/cortex-mcp.git
cd cortex-mcp
npm install
cd dashboard && npm install && npm run build && cd ..
node src/server.js
```

## Autonomous Pipeline (V2.4)

Cortex Pipeline is a **goal-driven autonomous execution engine**. Give it a goal, and it plans, executes, tests, and heals itself — no step-by-step prompting required.

```
Goal → Planner → DAG Tasks → Executor → Test → Auto-Heal → Done
                              ↕
                    pause / resume / cancel
                         (WebSocket live)
```

### How It Works

```
You type: "Build authentication system"
    ↓
Planner breaks goal into ordered DAG:
  [1] Scaffold routes        → [2] Create User model
  → [3] JWT middleware       → [4] Login endpoint
  → [5] Register endpoint    → [6] Password hashing
  → [7] Run tests            → [8] Verify security
    ↓
Executor auto-runs each task:
  ✓ Scaffold routes      (1.2s)
  ✓ Create User model    (0.8s)
  ✗ JWT middleware       → retry #1 → ✓  (2.1s)
  ✓ Login endpoint       (0.5s)
  ...
    ↓
Auto-Heal detects broken files → restores from checkpoint
Auto-Heal resets failed tests   → retries with new approach
    ↓
Done. Pipeline history saved. Dashboard updated via WebSocket.
```

### 8 Pipeline MCP Tools

| Tool | Purpose |
|------|---------|
| `cortex_pipeline_start` | Give a goal → DAG planned + executed |
| `cortex_pipeline_status` | Check progress, task states, retry counts |
| `cortex_pipeline_pause` | Pause mid-execution |
| `cortex_pipeline_resume` | Resume from where it paused |
| `cortex_pipeline_cancel` | Cancel remaining tasks |
| `cortex_pipeline_plan` | Preview task breakdown (dry run) |
| `cortex_auto_heal` | Fix broken files, reset failed tests |
| `cortex_pipeline_history` | List all past pipeline runs |

### Why This Is Different

| Traditional AI Assistants | Cortex Pipeline |
|---|---|
| Wait for your next prompt | Executes autonomously toward a goal |
| You give step-by-step instructions | You give a goal, it plans the steps |
| You babysit each action | Auto-retry on failure (up to 3×) |
| No memory of past runs | Full pipeline history + checkpoints |
| Single-threaded Q&A | Multi-task DAG with priority ordering |
| You fix broken files | Auto-heal restores from checkpoints |

**In short:** Most AI tools are *reactive* — you drive. Cortex Pipeline is *proactive* — it drives itself, and you just set the destination.

## Session Lifecycle

```
START
  ↓
cortex_get_state        → project context (<200 tokens)
  ↓
cortex_get_next_task    → highest-priority pending todo
  ↓
WORK                    → write code, create files
  ↓
cortex_tick_file        → track each file created
  ↓
cortex_log_progress     → log completed work
  ↓
cortex_check_reminders  → handle warnings
  ↓
cortex_get_next_task    → next todo (or "ALL TASKS COMPLETE")
  ↓
...repeat...
  ↓
cortex_save_snapshot    → compress session to summary
  ↓
END
```

## Tool Reference

### Core Loop (5)
| Tool | Purpose |
|------|---------|
| `cortex_get_state` | Compressed project context |
| `cortex_get_next_task` | Highest-priority pending todo |
| `cortex_log_progress` | Log completed work |
| `cortex_check_reminders` | 6 safety checks |
| `cortex_save_snapshot` | Compress session summary |

### Project Setup (3)
| Tool | Purpose |
|------|---------|
| `cortex_init` | Initialize project (10-question onboarding) |
| `cortex_set_active_project` | Switch between projects |
| `cortex_health` | DB integrity + auto-repair |

### Features & Files (5)
| Tool | Purpose |
|------|---------|
| `cortex_add_feature` | Register a feature |
| `cortex_update_feature` | Update feature status |
| `cortex_tick_file` | Track file creation (auto-checkpoints) |
| `cortex_get_files` | List all tracked files |
| `cortex_rollback_file` | Restore file from checkpoint |

### Tests (2)
| Tool | Purpose |
|------|---------|
| `cortex_add_test` | Register a test |
| `cortex_update_test` | Mark test passed/failed |

### Issues (2)
| Tool | Purpose |
|------|---------|
| `cortex_log_issue` | Log a bug or blocker |
| `cortex_resolve_issue` | Mark issue resolved with fix |

### Knowledge Base (6)
| Tool | Purpose |
|------|---------|
| `cortex_write_dictionary` | Document a file/feature |
| `cortex_get_detail` | Retrieve full dictionary entry |
| `cortex_add_snippet` | Save reusable code snippet |
| `cortex_add_research` | Log library research notes |
| `cortex_add_decision` | Record architectural decision |
| `cortex_search` | FTS5 + vector hybrid search |

### Human Interaction (2)
| Tool | Purpose |
|------|---------|
| `cortex_ask_human` | Pause, ask question, wait for answer |
| `cortex_confirm_destructive` | Red confirmation modal for dangerous ops |

### V2 Advanced (5)
| Tool | Purpose |
|------|---------|
| `cortex_log_tokens` | Track token usage per action |
| `cortex_get_token_budget` | Check remaining budget (180k default) |
| `cortex_set_role` | Set agent role |
| `cortex_get_role` | Get agent permissions |
| `cortex_list_agents` | List all connected agents |

### Knowledge Graph (3)
| Tool | Purpose |
|------|---------|
| `cortex_add_relationship` | Link entities |
| `cortex_check_contradictions` | Find conflicting data |
| `cortex_resolve_contradiction` | Resolve conflicts |

### Skills (2)
| Tool | Purpose |
|------|---------|
| `cortex_get_skill` | Load SKILL.md guide |
| `cortex_list_skills` | List available skills |

## Database

SQLite at `.cortex/cortex.db` with:
- **WAL mode** — concurrent reads while writing
- **FTS5** — full-text search across all tables
- **15+ tables** — project, features, files, tests, issues, dictionary, progress, relationships, etc.
- **Triggers** — auto-sync FTS index on insert/update/delete

## Dashboard

Live at `http://localhost:3001` when the server runs.

- **Ctrl+K** — Global search overlay
- **Graph tab** — D3 force-directed knowledge graph
- **LIVE indicator** — WebSocket connection status
- **12 tabs** — Overview, Pipeline, Features, FileTree, Tests, Progress, Issues, Library, Research, Dictionary, Graph, Settings

## REST API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/data` | All project data |
| `GET /api/graph` | Knowledge graph (nodes + edges) |
| `GET /api/search?q=<query>` | Search across tables |
| `GET /api/audit` | Audit trail entries |
| `GET /api/episodic` | Episodic memory events |
| `GET /api/context` | Compiled project state |
| `GET /ws-status` | WebSocket status |
| `POST /api/pipeline/start` | Start a pipeline from a goal |
| `GET /api/pipeline/:id` | Get pipeline run status + tasks |
| `GET /api/pipeline-history` | List past pipeline runs |
| `POST /api/pipeline/pause` | Pause active pipeline |
| `POST /api/pipeline/resume` | Resume paused pipeline |
| `POST /api/pipeline/cancel` | Cancel active pipeline |
| `POST /human-answer` | Submit answer to pending question |

## MCP Resources

Read project data without tool calls:

| URI | Data |
|-----|------|
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

## Architecture

```
cortex-mcp/
├── bin/cortex.js              # CLI entry point
├── src/
│   ├── server.js              # MCP server (main entry)
│   ├── api/server.js          # Express REST API + dashboard
│   ├── db/
│   │   ├── schema.js          # Table definitions + FTS5
│   │   ├── init.js            # DB connection (WAL mode)
│   │   ├── queries.js         # Read/write functions
│   │   └── cortex_v2.sql      # V2 migration
│   ├── pipeline/              # V2.4 Autonomous pipeline
│   │   ├── planner.js         # Goal → DAG task breakdown
│   │   ├── executor.js        # Auto-execute + retry
│   │   ├── loop.js            # Pause/resume/cancel controller
│   │   └── index.js           # 8 MCP tool registration
│   ├── tools/                 # 31 MCP tools
│   │   ├── state.js           # cortex_get_state
│   │   ├── tasks.js           # cortex_get_next_task
│   │   ├── search.js          # FTS5 + hybrid search
│   │   ├── contradictions.js  # Contradiction detection
│   │   ├── tokens.js          # Token budget
│   │   ├── roles.js           # Agent roles
│   │   ├── relationships.js   # Knowledge graph
│   │   ├── health.js          # Auto-repair
│   │   └── ...
│   ├── embeddings/            # ONNX vector engine
│   ├── websocket/server.js    # WebSocket live push
│   ├── audit/index.js         # Audit trail
│   ├── memory/
│   │   ├── episodic.js        # Episodic memory
│   │   └── compiler.js        # Context compiler
│   ├── resources/project.js   # MCP Resources
│   └── prompts/index.js       # MCP Prompts
├── dashboard/                 # React 19 + shadcn/ui
│   ├── src/
│   │   ├── App.jsx            # Main app + routing
│   │   ├── components/
│   │   │   ├── tabs/          # 11 tab components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── Graph.jsx      # D3 knowledge graph
│   │   │   └── GlobalSearch.jsx
│   │   └── styles/globals.css # Tailwind + shadcn vars
│   └── dist/                  # Built dashboard
├── skills/                    # Agent skill files
├── docs/                      # Documentation
└── AGENTS.md                  # Agent guide
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CORTEX_PROJECT_PATH` | `.` | Project root directory |
| `CORTEX_API_PORT` | `3001` | REST API port |
| `CORTEX_PORT` | `4759` | Dashboard port |
| `CORTEX_SYNC_ENABLED` | `false` | Enable cloud sync |

## Requirements

- Node.js ≥ 18.0.0
- Works on Windows, macOS, Linux

## Links

| Platform | URL |
|----------|-----|
| Website | https://neuralnexustech.com/ |
| GitHub | https://github.com/neuralnexustech/cortex-mcp |
| npm | https://www.npmjs.com/package/@neuralnexustech/cortex-mcp |

## License

MIT © [neuralnexustech](https://neuralnexustech.com/)
