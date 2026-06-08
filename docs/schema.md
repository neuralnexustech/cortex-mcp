# Cortex MCP — Database Schema Reference

> **All 13 tables. Always run WAL mode immediately after opening the DB.**

```js
db.pragma('journal_mode=WAL');
```

---

## Tables

### 1. `project`
Stores the single active project configuration (one row).

```sql
CREATE TABLE IF NOT EXISTS project (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  goal         TEXT NOT NULL,
  stack        TEXT NOT NULL,
  ui_style     TEXT,
  preferred_libs  TEXT,
  forbidden_libs  TEXT,
  complexity   TEXT,
  status       TEXT DEFAULT 'active',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `features`
High-level project features. Each feature groups files, todos, and tests.

```sql
CREATE TABLE IF NOT EXISTS features (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  priority     TEXT DEFAULT 'medium',   -- high | medium | low
  status       TEXT DEFAULT 'pending',  -- pending | in-progress | done | blocked
  linked_files TEXT,
  linked_tests TEXT,
  agent        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

### 3. `file_tree`
Every file the agent creates or touches. Unique per file_path.

```sql
CREATE TABLE IF NOT EXISTS file_tree (
  id         INTEGER PRIMARY KEY,
  file_path  TEXT NOT NULL UNIQUE,
  status     TEXT DEFAULT 'pending',    -- pending | in-progress | done
  feature_id INTEGER,
  test_id    INTEGER,
  agent      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(feature_id) REFERENCES features(id)
);
```

### 4. `todos`
Task queue. Priority 1 = highest. Agent ALWAYS reads next task from here.

```sql
CREATE TABLE IF NOT EXISTS todos (
  id           INTEGER PRIMARY KEY,
  task         TEXT NOT NULL,
  priority     INTEGER DEFAULT 5,
  status       TEXT DEFAULT 'pending',  -- pending | in-progress | done
  feature_id   INTEGER,
  agent        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY(feature_id) REFERENCES features(id)
);
```

### 5. `tests`
Test tracking. Each test links to a feature and/or file.

```sql
CREATE TABLE IF NOT EXISTS tests (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  feature_id   INTEGER,
  file_id      INTEGER,
  status       TEXT DEFAULT 'pending',  -- pending | passed | failed
  error_output TEXT,
  agent        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(feature_id) REFERENCES features(id)
);
```

### 6. `progress_log`
Append-only log of every completed step. Never update, only insert.

```sql
CREATE TABLE IF NOT EXISTS progress_log (
  id         INTEGER PRIMARY KEY,
  task       TEXT NOT NULL,
  file_path  TEXT,
  notes      TEXT,
  agent      TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 7. `issues`
Bug/issue tracker. Open issues block new feature work (reminder check #4).

```sql
CREATE TABLE IF NOT EXISTS issues (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  file_path   TEXT,
  cause       TEXT,
  fix_applied TEXT,
  status      TEXT DEFAULT 'open',      -- open | in-progress | resolved
  agent       TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);
```

### 8. `dictionary`
Key-value store for file/feature knowledge. Key = file path or feature name.

```sql
CREATE TABLE IF NOT EXISTS dictionary (
  id               INTEGER PRIMARY KEY,
  key              TEXT NOT NULL UNIQUE,
  short_summary    TEXT NOT NULL,
  full_description TEXT,
  changes          TEXT,
  errors           TEXT,
  fixes            TEXT,
  status           TEXT DEFAULT 'active',  -- active | done | broken
  agent            TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9. `snippets`
Reusable code snippets library.

```sql
CREATE TABLE IF NOT EXISTS snippets (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  code        TEXT NOT NULL,
  language    TEXT,
  tags        TEXT,
  description TEXT,
  source_url  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 10. `research`
Library/dependency research notes.

```sql
CREATE TABLE IF NOT EXISTS research (
  id           INTEGER PRIMARY KEY,
  library_name TEXT NOT NULL,
  version      TEXT,
  notes        TEXT,
  source_url   TEXT,
  agent        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 11. `decisions`
Architecture and design decisions log.

```sql
CREATE TABLE IF NOT EXISTS decisions (
  id           INTEGER PRIMARY KEY,
  title        TEXT NOT NULL,
  reason       TEXT,
  alternatives TEXT,
  agent        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 12. `snapshots`
Session summaries saved to DB and disk.

```sql
CREATE TABLE IF NOT EXISTS snapshots (
  id         INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  summary    TEXT NOT NULL,
  agent      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 13. `checkpoints`
File content backups for rollback support.

```sql
CREATE TABLE IF NOT EXISTS checkpoints (
  id         INTEGER PRIMARY KEY,
  file_path  TEXT NOT NULL,
  content    TEXT NOT NULL,
  agent      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Verification

After `cortex_init`, confirm all 13 tables exist:

```js
db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
// Expected: checkpoints, decisions, dictionary, features, file_tree,
//           issues, progress_log, project, research, snapshots,
//           snippets, tests, todos
```

---

## Status Enums Reference

| Table      | Column   | Valid values                          |
|------------|----------|---------------------------------------|
| project    | status   | `active` \| `archived`               |
| features   | priority | `high` \| `medium` \| `low`          |
| features   | status   | `pending` \| `in-progress` \| `done` \| `blocked` |
| file_tree  | status   | `pending` \| `in-progress` \| `done` |
| todos      | status   | `pending` \| `in-progress` \| `done` |
| tests      | status   | `pending` \| `passed` \| `failed`    |
| issues     | status   | `open` \| `in-progress` \| `resolved`|
| dictionary | status   | `active` \| `done` \| `broken`       |

---

## WAL Mode Note

WAL (Write-Ahead Logging) must be set immediately after opening any connection:
```js
db.pragma('journal_mode=WAL');
```
This allows concurrent reads during writes and prevents `SQLITE_BUSY` errors when multiple agents access the same DB.
