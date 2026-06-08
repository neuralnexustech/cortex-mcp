export const SCHEMA = `
CREATE TABLE IF NOT EXISTS project (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  stack TEXT NOT NULL,
  ui_style TEXT,
  preferred_libs TEXT,
  forbidden_libs TEXT,
  file_structure TEXT,
  existing_codebase TEXT,
  complexity TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  linked_files TEXT,
  linked_tests TEXT,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS file_tree (
  id INTEGER PRIMARY KEY,
  file_path TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  feature_id INTEGER,
  test_id INTEGER,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(feature_id) REFERENCES features(id)
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY,
  task TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',
  feature_id INTEGER,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY(feature_id) REFERENCES features(id)
);

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  feature_id INTEGER,
  file_id INTEGER,
  status TEXT DEFAULT 'pending',
  error_output TEXT,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(feature_id) REFERENCES features(id)
);

CREATE TABLE IF NOT EXISTS progress_log (
  id INTEGER PRIMARY KEY,
  task TEXT NOT NULL,
  file_path TEXT,
  notes TEXT,
  agent TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  cause TEXT,
  fix_applied TEXT,
  status TEXT DEFAULT 'open',
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS dictionary (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  short_summary TEXT NOT NULL,
  full_description TEXT,
  changes TEXT,
  errors TEXT,
  fixes TEXT,
  status TEXT DEFAULT 'active',
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS snippets (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT,
  tags TEXT,
  description TEXT,
  source_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research (
  id INTEGER PRIMARY KEY,
  library_name TEXT NOT NULL,
  version TEXT,
  notes TEXT,
  source_url TEXT,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  reason TEXT,
  alternatives TEXT,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS human_questions (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT DEFAULT 'pending',
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answered_at DATETIME
);

CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_nodes (
  id INTEGER PRIMARY KEY,
  workflow_id INTEGER NOT NULL,
  parent_id INTEGER,
  label TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES workflow_nodes(id) ON DELETE CASCADE
);
`;
