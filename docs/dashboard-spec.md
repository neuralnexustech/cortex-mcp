# Cortex Dashboard — Complete Specification

## Tech Stack
- React + Vite + Tailwind CSS
- Framer Motion (animations)
- D3.js (Overview flow diagram)
- Lucide React (icons)
- Port: `localhost:4759`
- Polls REST API on `localhost:3001` every 5 seconds

## Visual Design

| Token | Value |
|---|---|
| Background | `#0a0a0f` |
| Panel style | Deep navy, glassmorphism with colored border glow |
| Heading font | Syne |
| Code/data font | JetBrains Mono |
| Done / success | Cyan `#00f5d4` |
| In-progress | Yellow `#f5c400` |
| Issues / errors | Red `#ff3a3a` |
| Pending | Gray `#444466` |
| Agent activity | Green `#39ff14` |
| Animations | Framer Motion — slide-ins, accordion expands, pulse on live updates |

## Layout
- **Sidebar** (left, fixed): navigation icons + labels for all 10 tabs
- **TopBar** (top): project name + ACTIVE/IDLE status badge
- **Main content area**: tab content

---

## Tab 1 — Overview

### Stats Row (4 cards)
| Card | Color | Format |
|---|---|---|
| Files Created | Cyan | Plain number |
| Features Done | Yellow | X / Y format |
| Open Issues | Red | Plain number |
| Tests Passed | Green | Plain number |

### Flow Diagram ← Critical Section
Four stage cards in a horizontal row connected by arrows:

```
FILE TREE  →  FEATURES  →  TESTS  →  DONE
```

Each card must contain:
1. **Header row** — stage name (left) + colored status badge (right): `ACTIVE` / `PENDING` / `BLOCKED` / `DONE`
2. **Progress bar** — horizontal, shows X/Y fraction + percentage label
3. **Checklist** — scrollable list of individual items:
   - Checkbox (☑/☐) + item name + status badge
   - Done: green ✓ icon + strikethrough text
   - In-progress: yellow dot indicator
   - Pending: dimmed/muted text
   - Failed/blocked: red text + ✗ icon
4. **Footer** — `"X done · X in-progress · X pending"` in muted text

Arrow connectors between cards: `→` with label `"passes to →"`
Card border glow color matches stage status color.
All data comes from LIVE API calls — no hardcoded values.

### Recent Activity Feed
Live scrolling log: `[Claude] Created auth.py — 2 min ago`
Color-coded by agent name.

---

## Tab 2 — Features

- Table: Name | Priority | Status | Linked Files | Linked Tests | Agent | Actions
- Priority badges: 🔴 High / 🟡 Medium / 🟢 Low
- Status: Pending / In Progress / Done / Blocked
- Click row → accordion expands with full description + change history + linked issues
- "Add Feature" button → inline form (calls `POST /api/features` if writable, or instructs agent)
- Filter bar: by status, priority, agent

---

## Tab 3 — File Tree (labeled "Files" in sidebar)

- Visual folder/file tree with checkboxes
- Each file: path | status badge | linked feature | agent who created it
- Click file → side panel with dictionary entry (short + full toggle)
- Checkbox tick animation: green burst on completion
- Color coding:
  - Green = done
  - Yellow = in-progress
  - Red = has open issue
  - Gray = pending
- Search bar to filter

---

## Tab 4 — Tests

- Table: Test Name | Linked Feature | Status | Error Output | Agent
- Status: ✅ Pass / ❌ Fail / ⏳ Pending
- Fail rows expand to show full error output
- "Run All Tests" button (V2)
- Summary bar: X passed / X failed / X pending

---

## Tab 5 — Progress

- Vertical timeline, newest first
- Each entry: timestamp | agent | task description | file affected
- Grouped by session (collapsible)
- Session header: date, duration, active agents, summary
- New entries slide in from bottom with animation

---

## Tab 6 — Issues

- Table: Title | File | Status | Cause | Fix Applied | Agent | Date
- Status: 🔴 Open / 🟡 In Progress / ✅ Resolved
- Click row → full detail panel
- "New Issue" button (logs via agent)
- Filter: open only / all / resolved
- Search bar
- Open issue count badge on sidebar icon

---

## Tab 7 — Library

Two sections:
- **Snippets**: Card grid — title | language badge | tags | first 3 lines preview. Click → full code + copy button.
- **Skill MDs**: List of skills. Each shows name + first line description + source (bundled / user). Click → full SKILL.md content rendered as markdown.

---

## Tab 8 — Research

- Table: Library | Version | Notes | Source URL | Agent | Date
- Click → expand full notes
- "Add Research" inline form (via agent instruction)
- Search by library name
- Clickable URLs open in new tab

---

## Tab 9 — Dictionary

- Two columns: key list (left) | detail panel (right)
- Key list: all file/feature names with colored status dot
- Detail panel: short summary always visible, "Show Full" toggle, changes timeline, errors, fixes, agent tags
- Search bar across all keys
- "Export Dictionary" → downloads JSON

---

## Tab 10 — Settings

- Editable fields: project name, goal, tech stack
- Active agents toggle: Claude / Gemini / OpenCode / Codex / Cursor
- `.cortexignore` editor (textarea, saves on blur)
- Token budget warning threshold slider
- "Export Project State" → full DB as JSON download

**V2 ONLY — do not build in V1:**
- Reset Project button (requires `cortex_confirm_destructive`)
- Delete `.cortex` folder (requires double confirmation)

---

## REST API Endpoints the Dashboard Reads

All on port `3001`. All read-only GET (except `human-answer`). All return JSON.

| Endpoint | Returns |
|---|---|
| `GET /api/state` | project row + todo counts + issues count |
| `GET /api/features` | all features rows |
| `GET /api/files` | all file_tree rows |
| `GET /api/tests` | all tests rows |
| `GET /api/progress` | all progress_log rows (last 100) |
| `GET /api/issues` | all issues rows |
| `GET /api/snippets` | all snippets rows |
| `GET /api/research` | all research rows |
| `GET /api/dictionary` | all dictionary rows (short_summary only for list) |
| `GET /api/settings` | project row |
| `POST /api/human-answer` | receives `{ question_id, answer }` → unblocks `cortex_ask_human` |

All endpoints return `[]` or `{}` on empty, never `404` or `500` when the server is healthy.

---

## Data Rules

- **No hardcoded values.** The dashboard must never render placeholder/dummy data.
- **Poll every 5 seconds** via `setInterval`. Show a "live" pulsing green dot in the TopBar when connected.
- **Show loading state** (skeleton cards) on first render before data arrives.
- **Error state** if API is unreachable: show red banner "Dashboard cannot reach API on :3001".
- **All numbers come from live DB** via REST API.

---

## Animation Guidelines

| Interaction | Animation |
|---|---|
| Tab switch | Slide-in from right (Framer Motion) |
| New activity entry | Slide up from bottom |
| Issue resolved | Green flash + row fades out |
| Stats update | Number counter animation |
| Feature status change | Accordion expand/collapse |
| File tick | Checkbox burst + strikethrough |
| Live data poll | TopBar dot pulses green |
