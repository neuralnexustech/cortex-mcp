/**
 * Context compilation — pre-build session context at start
 * Instead of querying DB multiple times, compile everything into a single artifact.
 */

export function createContextCompiler(db) {
  return {
    /**
     * Compile full session context — call once at session start
     * Returns a structured artifact with everything the agent needs
     */
    compile(sessionId) {
      const start = Date.now();

      // Get all data in one batch
      const project = db.prepare('SELECT * FROM project WHERE status = ? ORDER BY id DESC LIMIT 1').get('active');
      const features = db.prepare('SELECT * FROM features ORDER BY id').all();
      const todos = db.prepare('SELECT * FROM todos WHERE status = ? ORDER BY priority ASC').all('pending');
      const completedTodos = db.prepare('SELECT COUNT(*) as count FROM todos WHERE status != ?').get('pending');
      const files = db.prepare('SELECT * FROM file_tree ORDER BY id').all();
      const tests = db.prepare('SELECT * FROM tests ORDER BY id').all();
      const issues = db.prepare('SELECT * FROM issues ORDER BY id DESC').all();
      const openIssues = issues.filter(i => i.status === 'open');
      const dictionary = db.prepare('SELECT * FROM dictionary ORDER BY key').all();
      const progress = db.prepare('SELECT * FROM progress_log ORDER BY id DESC LIMIT 10').all();
      const snapshot = db.prepare('SELECT * FROM snapshots ORDER BY id DESC LIMIT 1').get();
      const relationships = db.prepare('SELECT * FROM relationships ORDER BY id').all();

      // Token budget
      let tokenBudget = { used: 0, budget: 180000, percent: 0, warning_level: 'ok' };
      if (sessionId) {
        const total = db.prepare('SELECT SUM(input_tokens + output_tokens) as total FROM token_log WHERE session_id = ?').get(sessionId);
        const used = total?.total || 0;
        const percent = Math.round((used / 180000) * 100);
        let warning_level = 'ok';
        if (percent >= 95) warning_level = 'critical';
        else if (percent >= 80) warning_level = 'danger';
        else if (percent >= 50) warning_level = 'caution';
        tokenBudget = { used, budget: 180000, percent, warning_level };
      }

      // Episodic memory (recent events)
      let recentEvents = [];
      try {
        recentEvents = db.prepare('SELECT * FROM episodic_memory ORDER BY id DESC LIMIT 10').all();
      } catch (_) {}

      // Audit stats
      let auditStats = { total: 0, errors: 0 };
      try {
        const totalRow = db.prepare('SELECT COUNT(*) as count FROM audit_log').get();
        const errorRow = db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE output_status = ?').get('error');
        auditStats = { total: totalRow?.count || 0, errors: errorRow?.count || 0 };
      } catch (_) {}

      const featuresDone = features.filter(f => f.status === 'done').length;
      const filesDone = files.filter(f => f.status === 'done').length;
      const testsPassed = tests.filter(t => t.status === 'passed').length;

      const compiled = {
        _meta: {
          compiled_at: new Date().toISOString(),
          compile_time_ms: Date.now() - start,
          session_id: sessionId
        },
        project: project ? {
          name: project.name,
          goal: project.goal,
          stack: project.stack,
          complexity: project.complexity
        } : null,
        progress: {
          features: { total: features.length, done: featuresDone },
          files: { total: files.length, done: filesDone },
          tests: { total: tests.length, passed: testsPassed },
          todos: { pending: todos.length, completed: completedTodos?.count || 0 },
          open_issues: openIssues.length
        },
        next_task: todos[0] || null,
        open_issues: openIssues.map(i => ({ id: i.id, title: i.title, file_path: i.file_path })),
        recent_activity: progress.map(p => ({
          task: p.task,
          file: p.file_path,
          agent: p.agent,
          at: p.created_at
        })),
        last_snapshot: snapshot ? {
          summary: snapshot.summary,
          agent: snapshot.agent,
          at: snapshot.created_at
        } : null,
        reminders: [], // Will be populated by caller if needed
        token_budget: tokenBudget,
        audit: auditStats,
        recent_events: recentEvents.map(e => ({
          type: e.event_type,
          name: e.event_name,
          entity: e.entity_name,
          at: e.created_at
        })),
        knowledge_graph: {
          nodes: features.length + files.length + tests.length + issues.length,
          edges: relationships.length
        }
      };

      return compiled;
    },

    /**
     * Compile compressed context (under 200 tokens for get_state)
     */
    compileCompressed(sessionId) {
      const full = this.compile(sessionId);

      // Compress to minimal representation
      return {
        project: full.project?.name,
        goal: full.project?.goal?.substring(0, 80),
        stack: full.project?.stack,
        features: `${full.progress.features.done}/${full.progress.features.total}`,
        files: `${full.progress.files.done}/${full.progress.files.total}`,
        tests: `${full.progress.tests.passed}/${full.progress.tests.total}`,
        pending_todos: full.progress.todos.pending,
        open_issues: full.progress.open_issues,
        next_task: full.next_task?.task?.substring(0, 60) || 'ALL COMPLETE',
        last_snapshot: full.last_snapshot?.at,
        token_budget: `${full.token_budget.percent}% (${full.token_budget.warning_level})`,
        graph: `${full.knowledge_graph.nodes} nodes, ${full.knowledge_graph.edges} edges`
      };
    }
  };
}
