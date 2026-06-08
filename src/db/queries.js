// All DB read/write functions using better-sqlite3 (synchronous).
// better-sqlite3 API: db.prepare(sql).all(params) / .get(params) / .run(params)

// ─── Project ────────────────────────────────────────────────────────────────

export function createProject(db, data) {
  try {
    db.prepare(
      'INSERT INTO project (name, goal, stack, ui_style, preferred_libs, forbidden_libs, file_structure, existing_codebase, complexity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      data.name, data.goal, data.stack,
      data.ui_style ?? null, data.preferred_libs ?? null,
      data.forbidden_libs ?? null, data.file_structure ?? null,
      data.existing_codebase ?? null, data.complexity ?? null
    );
    return db.prepare('SELECT * FROM project ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getProject(db) {
  return db.prepare('SELECT * FROM project WHERE status = ? ORDER BY id DESC LIMIT 1').get('active') ?? null;
}

export function updateProject(db, id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE project SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
}

// ─── Features ───────────────────────────────────────────────────────────────

export function addFeature(db, data) {
  try {
    db.prepare(
      'INSERT INTO features (name, description, priority, linked_files, linked_tests, agent) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      data.name, data.description ?? null, data.priority ?? 'medium',
      data.linked_files ?? null, data.linked_tests ?? null, data.agent ?? null
    );
    return db.prepare('SELECT * FROM features ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getFeatures(db) {
  return db.prepare('SELECT * FROM features ORDER BY id').all();
}

export function getFeature(db, id) {
  return db.prepare('SELECT * FROM features WHERE id = ?').get(id) ?? null;
}

export function updateFeature(db, id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (key === 'status' && value === 'done') {
        fields.push('completed_at = CURRENT_TIMESTAMP');
      }
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE features SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM features WHERE id = ?').get(id);
}

// ─── File Tree ──────────────────────────────────────────────────────────────

export function tickFile(db, data) {
  const existing = db.prepare('SELECT * FROM file_tree WHERE file_path = ?').get(data.file_path);
  if (existing) {
    db.prepare('UPDATE file_tree SET status = ?, feature_id = ?, agent = ? WHERE file_path = ?')
      .run(data.status ?? 'done', data.feature_id ?? null, data.agent ?? null, data.file_path);
  } else {
    db.prepare(
      'INSERT INTO file_tree (file_path, status, feature_id, test_id, agent) VALUES (?, ?, ?, ?, ?)'
    ).run(
      data.file_path, data.status ?? 'done',
      data.feature_id ?? null, data.test_id ?? null, data.agent ?? null
    );
  }
  return db.prepare('SELECT * FROM file_tree WHERE file_path = ?').get(data.file_path);
}

export function getFiles(db) {
  return db.prepare('SELECT * FROM file_tree ORDER BY id').all();
}

// ─── Todos ──────────────────────────────────────────────────────────────────

export function addTodo(db, data) {
  try {
    db.prepare(
      'INSERT INTO todos (task, priority, status, feature_id, agent) VALUES (?, ?, ?, ?, ?)'
    ).run(
      data.task, data.priority ?? 5, data.status ?? 'pending',
      data.feature_id ?? null, data.agent ?? null
    );
    return db.prepare('SELECT * FROM todos ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getTodos(db) {
  return db.prepare('SELECT * FROM todos WHERE status = ? ORDER BY priority ASC, id ASC').all('pending');
}

export function getNextTask(db) {
  return db.prepare('SELECT * FROM todos WHERE status = ? ORDER BY priority ASC, id ASC LIMIT 1').get('pending') ?? null;
}

export function completeTodo(db, id) {
  db.prepare('UPDATE todos SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', id);
}

export function logProgress(db, data) {
  try {
    db.prepare(
      'INSERT INTO progress_log (task, file_path, notes, agent, session_id) VALUES (?, ?, ?, ?, ?)'
    ).run(
      data.task, data.file_path ?? null, data.notes ?? null,
      data.agent ?? null, data.session_id ?? null
    );
    return db.prepare('SELECT * FROM progress_log ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getProgress(db) {
  return db.prepare('SELECT * FROM progress_log ORDER BY id DESC').all();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

export function addTest(db, data) {
  try {
    db.prepare(
      'INSERT INTO tests (name, feature_id, file_id, agent) VALUES (?, ?, ?, ?)'
    ).run(data.name, data.feature_id ?? null, data.file_id ?? null, data.agent ?? null);
    return db.prepare('SELECT * FROM tests ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getTests(db) {
  return db.prepare('SELECT * FROM tests ORDER BY id').all();
}

export function updateTest(db, id, data) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE tests SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM tests WHERE id = ?').get(id);
}

// ─── Issues ─────────────────────────────────────────────────────────────────

export function logIssue(db, data) {
  try {
    db.prepare(
      'INSERT INTO issues (title, description, file_path, cause, agent) VALUES (?, ?, ?, ?, ?)'
    ).run(
      data.title, data.description ?? null, data.file_path ?? null,
      data.cause ?? null, data.agent ?? null
    );
    return db.prepare('SELECT * FROM issues ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getIssues(db) {
  return db.prepare('SELECT * FROM issues ORDER BY id DESC').all();
}

export function resolveIssue(db, id, fix) {
  db.prepare(
    'UPDATE issues SET status = ?, fix_applied = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run('resolved', fix ?? null, id);
  return db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
}

// ─── Dictionary ─────────────────────────────────────────────────────────────

export function writeDictionary(db, data) {
  try {
    const existing = db.prepare('SELECT * FROM dictionary WHERE key = ?').get(data.key);
    if (existing) {
      let changes = [];
      try { changes = JSON.parse(existing.changes || '[]'); } catch (_) {}
      changes.push({ date: new Date().toISOString(), description: data.change_description || 'Updated' });
      db.prepare(
        'UPDATE dictionary SET short_summary = ?, full_description = ?, changes = ?, status = ?, agent = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
      ).run(
        data.short_summary, data.full_description ?? null,
        JSON.stringify(changes), data.status ?? 'active',
        data.agent ?? null, data.key
      );
    } else {
      db.prepare(
        'INSERT INTO dictionary (key, short_summary, full_description, changes, status, agent) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        data.key, data.short_summary, data.full_description ?? null,
        JSON.stringify([]), data.status ?? 'active', data.agent ?? null
      );
    }
    return db.prepare('SELECT * FROM dictionary WHERE key = ?').get(data.key);
  } catch (e) {
    return { error: e.message };
  }
}

export function getDictionary(db) {
  return db.prepare('SELECT * FROM dictionary ORDER BY key').all();
}

export function getDictionaryEntry(db, key) {
  return db.prepare('SELECT * FROM dictionary WHERE key = ?').get(key) ?? null;
}

// ─── Snippets ────────────────────────────────────────────────────────────────

export function addSnippet(db, data) {
  try {
    db.prepare(
      'INSERT INTO snippets (title, code, language, tags, description, source_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      data.title, data.code, data.language ?? null, data.tags ?? null,
      data.description ?? null, data.source_url ?? null
    );
    return db.prepare('SELECT * FROM snippets ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getSnippets(db) {
  return db.prepare('SELECT * FROM snippets ORDER BY id DESC').all();
}

// ─── Research ────────────────────────────────────────────────────────────────

export function addResearch(db, data) {
  try {
    db.prepare(
      'INSERT INTO research (library_name, version, notes, source_url, agent) VALUES (?, ?, ?, ?, ?)'
    ).run(
      data.library_name, data.version ?? null, data.notes ?? null,
      data.source_url ?? null, data.agent ?? null
    );
    return db.prepare('SELECT * FROM research ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getResearch(db) {
  return db.prepare('SELECT * FROM research ORDER BY id DESC').all();
}

// ─── Decisions ───────────────────────────────────────────────────────────────

export function addDecision(db, data) {
  try {
    db.prepare(
      'INSERT INTO decisions (title, reason, alternatives, agent) VALUES (?, ?, ?, ?)'
    ).run(data.title, data.reason ?? null, data.alternatives ?? null, data.agent ?? null);
    return db.prepare('SELECT * FROM decisions ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getDecisions(db) {
  return db.prepare('SELECT * FROM decisions ORDER BY id DESC').all();
}

// ─── Snapshots ───────────────────────────────────────────────────────────────

export function saveSnapshot(db, data) {
  try {
    db.prepare(
      'INSERT INTO snapshots (session_id, summary, agent) VALUES (?, ?, ?)'
    ).run(data.session_id, data.summary, data.agent ?? null);
    return db.prepare('SELECT * FROM snapshots ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getLatestSnapshot(db) {
  return db.prepare('SELECT * FROM snapshots ORDER BY id DESC LIMIT 1').get() ?? null;
}

export function getSnapshots(db) {
  return db.prepare('SELECT * FROM snapshots ORDER BY id DESC').all();
}

// ─── Checkpoints ─────────────────────────────────────────────────────────────

export function saveCheckpoint(db, data) {
  try {
    db.prepare(
      'INSERT INTO checkpoints (file_path, content, agent) VALUES (?, ?, ?)'
    ).run(data.file_path, data.content, data.agent ?? null);
    return db.prepare('SELECT * FROM checkpoints ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function getCheckpoints(db, filePath) {
  return db.prepare('SELECT * FROM checkpoints WHERE file_path = ? ORDER BY id DESC').all(filePath);
}

export function getCheckpoint(db, id) {
  return db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(id) ?? null;
}

// ─── Human Questions ─────────────────────────────────────────────────────────

export function createHumanQuestion(db, data) {
  try {
    db.prepare(
      'INSERT INTO human_questions (question, agent) VALUES (?, ?)'
    ).run(data.question, data.agent ?? null);
    return db.prepare('SELECT * FROM human_questions ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return { error: e.message };
  }
}

export function answerHumanQuestion(db, id, answer) {
  db.prepare(
    'UPDATE human_questions SET answer = ?, status = ?, answered_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(answer, 'answered', id);
  return db.prepare('SELECT * FROM human_questions WHERE id = ?').get(id);
}

export function getHumanQuestion(db, id) {
  return db.prepare('SELECT * FROM human_questions WHERE id = ?').get(id) ?? null;
}

export function getPendingHumanQuestions(db) {
  return db.prepare('SELECT * FROM human_questions WHERE status = ? ORDER BY id ASC').all('pending');
}

// ─── Health Check ────────────────────────────────────────────────────────────

export function healthCheck(db) {
  const tables = [
    'project', 'features', 'file_tree', 'todos', 'tests',
    'progress_log', 'issues', 'dictionary', 'snippets',
    'research', 'decisions', 'snapshots', 'checkpoints'
  ];

  const tableCounts = {};
  for (const table of tables) {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    tableCounts[table] = row ? row.count : 0;
  }

  const openIssues = db.prepare('SELECT COUNT(*) as count FROM issues WHERE status = ?').get('open');
  const pendingTests = db.prepare('SELECT COUNT(*) as count FROM tests WHERE status = ?').get('pending');
  const brokenFiles = db.prepare("SELECT COUNT(*) as count FROM file_tree WHERE status = 'broken'").get();
  const missingTests = db.prepare(
    "SELECT COUNT(*) as count FROM file_tree WHERE status = 'done' AND test_id IS NULL"
  ).get();

  return {
    status: 'ok',
    tables: tableCounts,
    table_count: tables.length,
    open_issues: openIssues?.count ?? 0,
    pending_tests: pendingTests?.count ?? 0,
    broken_files: brokenFiles?.count ?? 0,
    files_missing_tests: missingTests?.count ?? 0,
    wal_mode: db.pragma('journal_mode', { simple: true }) === 'wal'
  };
}
