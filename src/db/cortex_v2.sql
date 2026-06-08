-- Cortex MCP V2 Migration
-- Safe to run multiple times (all use IF NOT EXISTS)

-- FTS5 search tables
CREATE VIRTUAL TABLE IF NOT EXISTS dictionary_fts
  USING fts5(key, short_summary, full_description, content=dictionary, content_rowid=id);
CREATE VIRTUAL TABLE IF NOT EXISTS issues_fts
  USING fts5(title, description, cause, fix_applied, content=issues, content_rowid=id);
CREATE VIRTUAL TABLE IF NOT EXISTS snippets_fts
  USING fts5(title, code, tags, description, content=snippets, content_rowid=id);
CREATE VIRTUAL TABLE IF NOT EXISTS research_fts
  USING fTS5(library_name, notes, content=research, content_rowid=id);
CREATE VIRTUAL TABLE IF NOT EXISTS progress_fts
  USING fts5(task, notes, content=progress_log, content_rowid=id);

-- FTS sync triggers: dictionary
CREATE TRIGGER IF NOT EXISTS dictionary_ai AFTER INSERT ON dictionary BEGIN
  INSERT INTO dictionary_fts(rowid, key, short_summary, full_description)
  VALUES (new.id, new.key, new.short_summary, new.full_description);
END;
CREATE TRIGGER IF NOT EXISTS dictionary_au AFTER UPDATE ON dictionary BEGIN
  INSERT INTO dictionary_fts(dictionary_fts, rowid, key, short_summary, full_description)
  VALUES ('delete', old.id, old.key, old.short_summary, old.full_description);
  INSERT INTO dictionary_fts(rowid, key, short_summary, full_description)
  VALUES (new.id, new.key, new.short_summary, new.full_description);
END;
CREATE TRIGGER IF NOT EXISTS dictionary_ad AFTER DELETE ON dictionary BEGIN
  INSERT INTO dictionary_fts(dictionary_fts, rowid, key, short_summary, full_description)
  VALUES ('delete', old.id, old.key, old.short_summary, old.full_description);
END;

-- FTS sync triggers: issues
CREATE TRIGGER IF NOT EXISTS issues_ai AFTER INSERT ON issues BEGIN
  INSERT INTO issues_fts(rowid, title, description, cause, fix_applied)
  VALUES (new.id, new.title, new.description, new.cause, new.fix_applied);
END;
CREATE TRIGGER IF NOT EXISTS issues_au AFTER UPDATE ON issues BEGIN
  INSERT INTO issues_fts(issues_fts, rowid, title, description, cause, fix_applied)
  VALUES ('delete', old.id, old.title, old.description, old.cause, old.fix_applied);
  INSERT INTO issues_fts(rowid, title, description, cause, fix_applied)
  VALUES (new.id, new.title, new.description, new.cause, new.fix_applied);
END;
CREATE TRIGGER IF NOT EXISTS issues_ad AFTER DELETE ON issues BEGIN
  INSERT INTO issues_fts(issues_fts, rowid, title, description, cause, fix_applied)
  VALUES ('delete', old.id, old.title, old.description, old.cause, old.fix_applied);
END;

-- FTS sync triggers: snippets
CREATE TRIGGER IF NOT EXISTS snippets_ai AFTER INSERT ON snippets BEGIN
  INSERT INTO snippets_fts(rowid, title, code, tags, description)
  VALUES (new.id, new.title, new.code, new.tags, new.description);
END;
CREATE TRIGGER IF NOT EXISTS snippets_au AFTER UPDATE ON snippets BEGIN
  INSERT INTO snippets_fts(snippets_fts, rowid, title, code, tags, description)
  VALUES ('delete', old.id, old.title, old.code, old.tags, old.description);
  INSERT INTO snippets_fts(rowid, title, code, tags, description)
  VALUES (new.id, new.title, new.code, new.tags, new.description);
END;
CREATE TRIGGER IF NOT EXISTS snippets_ad AFTER DELETE ON snippets BEGIN
  INSERT INTO snippets_fts(snippets_fts, rowid, title, code, tags, description)
  VALUES ('delete', old.id, old.title, old.code, old.tags, old.description);
END;

-- FTS sync triggers: research
CREATE TRIGGER IF NOT EXISTS research_ai AFTER INSERT ON research BEGIN
  INSERT INTO research_fts(rowid, library_name, notes)
  VALUES (new.id, new.library_name, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS research_au AFTER UPDATE ON research BEGIN
  INSERT INTO research_fts(research_fts, rowid, library_name, notes)
  VALUES ('delete', old.id, old.library_name, old.notes);
  INSERT INTO research_fts(rowid, library_name, notes)
  VALUES (new.id, new.library_name, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS research_ad AFTER DELETE ON research BEGIN
  INSERT INTO research_fts(research_fts, rowid, library_name, notes)
  VALUES ('delete', old.id, old.library_name, old.notes);
END;

-- FTS sync triggers: progress_log
CREATE TRIGGER IF NOT EXISTS progress_ai AFTER INSERT ON progress_log BEGIN
  INSERT INTO progress_fts(rowid, task, notes)
  VALUES (new.id, new.task, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS progress_au AFTER UPDATE ON progress_log BEGIN
  INSERT INTO progress_fts(progress_fts, rowid, task, notes)
  VALUES ('delete', old.id, old.task, old.notes);
  INSERT INTO progress_fts(rowid, task, notes)
  VALUES (new.id, new.task, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS progress_ad AFTER DELETE ON progress_log BEGIN
  INSERT INTO progress_fts(progress_fts, rowid, task, notes)
  VALUES ('delete', old.id, old.task, old.notes);
END;

-- Vector embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  embedding BLOB NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_table, source_id);

-- Contradiction tracking
CREATE TABLE IF NOT EXISTS contradictions (
  id INTEGER PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- Token tracking
CREATE TABLE IF NOT EXISTS token_log (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_token_log_session ON token_log(session_id);

-- Agent roles
CREATE TABLE IF NOT EXISTS agent_roles (
  id INTEGER PRIMARY KEY,
  agent_name TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'builder',
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge graph relationships
CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  relationship TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_type, target_id);

-- Populate FTS tables from existing data
INSERT OR IGNORE INTO dictionary_fts(rowid, key, short_summary, full_description)
  SELECT id, key, short_summary, full_description FROM dictionary;
INSERT OR IGNORE INTO issues_fts(rowid, title, description, cause, fix_applied)
  SELECT id, title, description, cause, fix_applied FROM issues;
INSERT OR IGNORE INTO snippets_fts(rowid, title, code, tags, description)
  SELECT id, title, code, tags, description FROM snippets;
INSERT OR IGNORE INTO research_fts(rowid, library_name, notes)
  SELECT id, library_name, notes FROM research;
INSERT OR IGNORE INTO progress_fts(rowid, task, notes)
  SELECT id, task, notes FROM progress_log;
