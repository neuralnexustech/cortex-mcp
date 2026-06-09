import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/init.js';
import * as queries from '../db/queries.js';
import { initWebSocket, emitEvent } from '../websocket/server.js';
import { createAuditLogger } from '../audit/index.js';
import { createEpisodicMemory } from '../memory/episodic.js';
import { createContextCompiler } from '../memory/compiler.js';
import { pausePipeline as pipelinePause, resumePipeline as pipelineResume, cancelPipeline as pipelineCancel, runPipelineLoop } from '../pipeline/loop.js';
import { planGoal, createPipelineFromPlan } from '../pipeline/planner.js';
import { createExecutor } from '../pipeline/executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Dashboard port: 4759 (serves static files + API)
// Phase 4 verification expects REST API on 3001 — we support both.
const API_PORT = process.env.CORTEX_API_PORT || 3001;
const DASHBOARD_PORT = process.env.CORTEX_PORT || 4759;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PROJECT_PATH = process.env.CORTEX_PROJECT_PATH || process.cwd();

function getDatabase() {
  return getDb(PROJECT_PATH);
}

function handleRoute(res, fn) {
  try {
    const db = getDatabase();
    const result = fn(db);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Routes (both with and without /api/ prefix) ─────────────────────────

function registerRoutes(router) {
  // GET /state
  router.get('/state', (req, res) => {
    handleRoute(res, (db) => ({
      project: queries.getProject(db),
      features: queries.getFeatures(db),
      todos: queries.getTodos(db),
      issues: queries.getIssues(db),
      files: queries.getFiles(db),
      dictionary: queries.getDictionary(db),
      tests: queries.getTests(db),
      progress: queries.getProgress(db),
      snippets: queries.getSnippets(db),
      research: queries.getResearch(db),
      decisions: queries.getDecisions(db),
      snapshots: queries.getSnapshots(db),
      pipelines: queries.getPipelineRuns(db).slice(0, 5),
      pipeline_active: queries.getActivePipelineRun(db)
    }));
  });

  router.get('/features', (req, res) => {
    handleRoute(res, (db) => queries.getFeatures(db));
  });

  router.get('/files', (req, res) => {
    handleRoute(res, (db) => queries.getFiles(db));
  });

  router.patch('/files/:id/link-test', (req, res) => {
    const { test_id } = req.body;
    if (!test_id) return res.status(400).json({ error: 'Missing test_id' });
    handleRoute(res, (db) => {
      db.prepare('UPDATE file_tree SET test_id = ? WHERE id = ?').run(test_id, req.params.id);
      return { success: true, file: db.prepare('SELECT * FROM file_tree WHERE id = ?').get(req.params.id) };
    });
  });

  router.get('/tests', (req, res) => {
    handleRoute(res, (db) => queries.getTests(db));
  });

  router.get('/progress', (req, res) => {
    handleRoute(res, (db) => queries.getProgress(db));
  });

  router.get('/issues', (req, res) => {
    handleRoute(res, (db) => queries.getIssues(db));
  });

  router.get('/snippets', (req, res) => {
    handleRoute(res, (db) => queries.getSnippets(db));
  });

  router.get('/research', (req, res) => {
    handleRoute(res, (db) => queries.getResearch(db));
  });

  router.get('/dictionary', (req, res) => {
    handleRoute(res, (db) => queries.getDictionary(db));
  });

  router.get('/decisions', (req, res) => {
    handleRoute(res, (db) => queries.getDecisions(db));
  });

  router.get('/snapshots', (req, res) => {
    handleRoute(res, (db) => queries.getSnapshots(db));
  });

  router.get('/settings', (req, res) => {
    handleRoute(res, (db) => {
      const project = queries.getProject(db);
      return {
        project_name: project?.name || '',
        goal: project?.goal || '',
        stack: project?.stack || '',
        ui_style: project?.ui_style || '',
        preferred_libs: project?.preferred_libs || '',
        forbidden_libs: project?.forbidden_libs || '',
        file_structure: project?.file_structure || '',
        existing_codebase: project?.existing_codebase || 'no',
        complexity: project?.complexity || 'medium'
      };
    });
  });

  router.get('/health', (req, res) => {
    handleRoute(res, (db) => queries.healthCheck(db));
  });

  // V2: Search endpoint
  router.get('/search', (req, res) => {
    const { q, mode, tables } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
    handleRoute(res, (db) => {
      const searchTables = tables ? tables.split(',') : ['features', 'dictionary', 'issues', 'snippets', 'progress_log'];
      const results = [];

      try {
        // Keyword search across FTS5 tables
        if (searchTables.includes('features')) {
          const rows = db.prepare("SELECT id, name as title, description as snippet, 'feature' as source_table FROM features WHERE name LIKE ? OR description LIKE ?").all(`%${q}%`, `%${q}%`);
          rows.forEach(r => results.push({ ...r, source_table: 'features' }));
        }
        if (searchTables.includes('dictionary')) {
          const rows = db.prepare("SELECT id, key as title, short_summary as snippet, 'dictionary' as source_table FROM dictionary WHERE key LIKE ? OR short_summary LIKE ? OR full_description LIKE ?").all(`%${q}%`, `%${q}%`, `%${q}%`);
          rows.forEach(r => results.push({ ...r, source_table: 'dictionary' }));
        }
        if (searchTables.includes('issues')) {
          const rows = db.prepare("SELECT id, title, description as snippet, 'issue' as source_table FROM issues WHERE title LIKE ? OR description LIKE ?").all(`%${q}%`, `%${q}%`);
          rows.forEach(r => results.push({ ...r, source_table: 'issues' }));
        }
        if (searchTables.includes('snippets')) {
          const rows = db.prepare("SELECT id, title, SUBSTR(code, 1, 100) as snippet, 'snippet' as source_table FROM snippets WHERE title LIKE ? OR code LIKE ? OR tags LIKE ?").all(`%${q}%`, `%${q}%`, `%${q}%`);
          rows.forEach(r => results.push({ ...r, source_table: 'snippets' }));
        }
        if (searchTables.includes('progress_log')) {
          const rows = db.prepare("SELECT id, task as title, notes as snippet, 'progress' as source_table FROM progress_log WHERE task LIKE ? OR notes LIKE ?").all(`%${q}%`, `%${q}%`);
          rows.forEach(r => results.push({ ...r, source_table: 'progress' }));
        }
      } catch (e) {
        // Fallback: simple LIKE across dictionary
        try {
          const rows = db.prepare("SELECT id, key as title, short_summary as snippet, 'dictionary' as source_table FROM dictionary WHERE key LIKE ? OR short_summary LIKE ?").all(`%${q}%`, `%${q}%`);
          rows.forEach(r => results.push(r));
        } catch (_) {}
      }

      return { query: q, results };
    });
  });

  // V2: Graph endpoint
  router.get('/graph', (req, res) => {
    handleRoute(res, (db) => {
      const features = queries.getFeatures(db);
      const files = queries.getFiles(db);
      const tests = queries.getTests(db);
      const issues = queries.getIssues(db);
      const decisions = queries.getDecisions(db);
      const relationships = db.prepare('SELECT * FROM relationships').all();

      const nodes = [
        ...features.map(f => ({ id: `feature-${f.id}`, label: f.name, type: 'feature', status: f.status })),
        ...files.map(f => ({ id: `file-${f.id}`, label: f.file_path, type: 'file', status: f.status })),
        ...tests.map(t => ({ id: `test-${t.id}`, label: t.name, type: 'test', status: t.status })),
        ...issues.map(i => ({ id: `issue-${i.id}`, label: i.title, type: 'issue', status: i.status })),
        ...decisions.map(d => ({ id: `decision-${d.id}`, label: d.title, type: 'decision', status: 'done' })),
      ];

      const edges = relationships.map(r => ({
        source: `${r.source_type}-${r.source_id}`,
        target: `${r.target_type}-${r.target_id}`,
        relationship: r.relationship,
      }));

      return { nodes, edges };
    });
  });

  // V2: WebSocket status
  router.get('/ws-status', (req, res) => {
    res.json({ connected: true, endpoint: '/ws' });
  });

  // V2.1: Audit trail
  router.get('/audit', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    handleRoute(res, (db) => {
      const audit = createAuditLogger(db);
      return { entries: audit.getRecent(limit), stats: audit.getStats() };
    });
  });

  // V2.1: Episodic memory
  router.get('/episodic', (req, res) => {
    const limit = parseInt(req.query.limit) || 30;
    handleRoute(res, (db) => {
      const episodic = createEpisodicMemory(db);
      return {
        recent: episodic.getRecent(limit),
        timeline: episodic.getTimeline(7),
        important: episodic.getImportant(10)
      };
    });
  });

  // V2.1: Compiled context
  router.get('/context', (req, res) => {
    const sessionId = req.query.session_id;
    handleRoute(res, (db) => {
      const compiler = createContextCompiler(db);
      return compiler.compile(sessionId);
    });
  });

  // POST /human-answer — submit answer to a pending human question
  router.post('/human-answer', (req, res) => {
    try {
      const { id, answer } = req.body;
      if (!id || answer === undefined) {
        return res.status(400).json({ error: 'Missing required fields: id, answer' });
      }
      const db = getDatabase();
      const question = queries.getHumanQuestion(db, id);
      if (!question) {
        return res.status(404).json({ error: `No question found with id ${id}` });
      }
      const updated = queries.answerHumanQuestion(db, id, String(answer));
      res.json({ success: true, question: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Pipeline endpoints
  router.post('/pipeline/start', (req, res) => {
    const { goal, max_retries, pause_on_human, session_id, agent } = req.body || {};
    if (!goal) return res.status(400).json({ error: 'Missing goal' });
    handleRoute(res, (db) => {
      const plan = planGoal(db, goal, { max_retries, pause_on_human, session_id, agent });
      const result = createPipelineFromPlan(db, plan, { max_retries, pause_on_human, session_id, agent });
      if (result.run?.error) return { error: result.run.error };
      const executor = createExecutor(db, {});
      runPipelineLoop(db, result.run.id, executor, {});
      return {
        success: true,
        pipeline_id: result.run.id,
        goal,
        task_count: result.tasks.length,
        tasks: result.tasks.map(t => ({ id: t.id, label: t.label, status: t.status }))
      };
    });
  });

  router.get('/pipeline/:id', (req, res) => {
    handleRoute(res, (db) => {
      const tasks = queries.getPipelineTasks(db, parseInt(req.params.id));
      const run = queries.getPipelineRun(db, parseInt(req.params.id));
      if (!run) return { error: 'Pipeline not found' };
      return {
        run,
        tasks,
        counts: {
          total: tasks.length,
          pending: tasks.filter(t => t.status === 'pending').length,
          in_progress: tasks.filter(t => t.status === 'in_progress').length,
          completed: tasks.filter(t => t.status === 'completed').length,
          failed: tasks.filter(t => t.status === 'failed').length,
        }
      };
    });
  });

  router.get('/pipeline-history', (req, res) => {
    handleRoute(res, (db) => queries.getPipelineRuns(db));
  });

  router.post('/pipeline/pause', (req, res) => {
    const { id } = req.body;
    handleRoute(res, (db) => {
      const run = id ? queries.getPipelineRun(db, id) : queries.getActivePipelineRun(db);
      if (!run) return { error: 'No active pipeline' };
      return pipelinePause(db, run.id);
    });
  });

  router.post('/pipeline/resume', (req, res) => {
    const { id } = req.body;
    handleRoute(res, (db) => {
      const run = id ? queries.getPipelineRun(db, id) : queries.getActivePipelineRun(db);
      if (!run) return { error: 'No active pipeline' };
      return pipelineResume(db, run.id);
    });
  });

  router.post('/pipeline/cancel', (req, res) => {
    const { id } = req.body;
    handleRoute(res, (db) => {
      const run = id ? queries.getPipelineRun(db, id) : queries.getActivePipelineRun(db);
      if (!run) return { error: 'No active pipeline' };
      return pipelineCancel(db, run.id);
    });
  });

  // GET /human-questions — list pending questions (for dashboard)
  router.get('/human-questions', (req, res) => {
    handleRoute(res, (db) => queries.getPendingHumanQuestions(db));
  });
}

// Mount routes at root and under /api/
const apiRouter = express.Router();
registerRoutes(apiRouter);
app.use('/', apiRouter);
app.use('/api', apiRouter);

// Serve static dashboard files
const dashboardDist = path.join(__dirname, '../../dashboard/dist');
app.use(express.static(dashboardDist));

// Fallback to index.html for SPA (only for non-API routes)
app.get('*', (req, res) => {
  const indexPath = path.join(dashboardDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Dashboard not built. Run: cd dashboard && npm run build' });
  }
});

export function startApiServer() {
  // Start API on port 3001
  const server = app.listen(API_PORT, () => {
    console.log(`Cortex REST API running on http://localhost:${API_PORT}`);
    initWebSocket(server);
    startDbWatcher();
  });

  if (String(API_PORT) !== String(DASHBOARD_PORT)) {
    startDashboardServer();
  } else {
    console.log(`Cortex Dashboard running on http://localhost:${DASHBOARD_PORT}`);
  }
}

// ─── SQLite File Watcher — auto-push changes to dashboard ──────────────
let dbWatcher = null;
let lastMtime = 0;

function startDbWatcher() {
  const dbPath = path.join(PROJECT_PATH, '.cortex', 'cortex.db');
  if (!fs.existsSync(dbPath)) {
    console.error('[Cortex Watcher] DB not found, watcher disabled');
    return;
  }

  try {
    const stat = fs.statSync(dbPath);
    lastMtime = stat.mtimeMs;
  } catch (_) {}

  // Poll every 1 second for DB changes (SQLite doesn't support fs.watch well)
  dbWatcher = setInterval(() => {
    try {
      const stat = fs.statSync(dbPath);
      if (stat.mtimeMs > lastMtime) {
        lastMtime = stat.mtimeMs;
        // Emit a refresh event to all connected dashboard clients
        emitEvent('db_changed', { timestamp: Date.now() });
      }
    } catch (_) {}
  }, 1000);

  console.error('[Cortex Watcher] Watching DB for changes');
}

// Also start a separate server on dashboard port if different
export function startDashboardServer() {
  const dashApp = express();
  dashApp.use(cors({ origin: '*' }));
  dashApp.use(express.json());
  registerRoutes(dashApp);
  dashApp.use(express.static(dashboardDist));
  dashApp.get('*', (req, res) => {
    const idx = path.join(dashboardDist, 'index.html');
    if (fs.existsSync(idx)) {
      res.sendFile(idx);
    } else {
      res.status(404).send('Dashboard not built');
    }
  });
  const dashServer = dashApp.listen(DASHBOARD_PORT, () => {
    console.log(`Cortex Dashboard on http://localhost:${DASHBOARD_PORT}`);
    initWebSocket(dashServer);
  });
}

export { app };

// Auto-start when run directly
startApiServer();
